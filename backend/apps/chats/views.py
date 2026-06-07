from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Max
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.messages.serializers import MessageSerializer

from .models import Chat, ChatMember
from .serializers import ChatSerializer

User = get_user_model()


class ChatListView(APIView):
    """
    GET /chats/ - list of chats with unread messages count
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        chats = (
            Chat.objects.filter(
                members__user=user,
                members__is_active=True,
                is_active=True,
            )
            .select_related("created_by")
            .order_by("-updated_at")
            .distinct()
        )

        chats_data = []
        for chat in chats:
            member = ChatMember.objects.filter(chat=chat, user=user, is_active=True).first()
            if not member:
                continue

            last_message_position = chat.messages.aggregate(value=Max("position")).get("value") or 0
            unread_count = max(0, last_message_position - member.last_read_position)

            chat_dict = {
                "id": str(chat.id),
                "type": chat.type,
                "title": chat.title,
                "description": chat.description,
                "avatar": chat.avatar,
                "created_by": chat.created_by_id,
                "is_active": chat.is_active,
                "created_at": chat.created_at,
                "updated_at": chat.updated_at,
                "unread_count": unread_count,
            }

            if chat.type == Chat.ChatType.DIRECT:
                other_member = chat.members.exclude(user=user).select_related('user').first()
                if other_member and other_member.user:
                    chat_dict["title"] = other_member.user.full_name
                    chat_dict["avatar"] = getattr(other_member.user, 'avatar', '')

            chats_data.append(chat_dict)

        return Response(chats_data)


class ChatDetailView(APIView):
    """
    GET /chats/{chat_id}/ - data of chat with messages
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, chat_id):
        user = request.user
        before_position = request.query_params.get("before_position")
        after_position = request.query_params.get("after_position")
        limit = request.query_params.get("limit", 50)

        try:
            limit = int(limit)
        except ValueError:
            limit = 50

        limit = max(1, min(limit, 100))

        try:
            chat = Chat.objects.get(
                id=chat_id,
                members__user=user,
                members__is_active=True,
                is_active=True,
            )
        except Chat.DoesNotExist:
            return Response({"detail": "Chat not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            member = ChatMember.objects.get(chat=chat, user=user, is_active=True)
        except ChatMember.DoesNotExist:
            return Response(
                {"detail": "You are not a member of this chat."},
                status=status.HTTP_403_FORBIDDEN,
            )

        last_position = chat.messages.aggregate(value=Max("position")).get("value") or 0

        base_queryset = (
            chat.messages.select_related("sender")
            .prefetch_related("attachments")
            .filter(is_deleted=False)
        )

        if before_position:
            try:
                before_position = int(before_position)
            except ValueError:
                before_position = None

            messages = list(
                base_queryset.filter(position__lt=before_position).order_by("-position")[: limit + 1]
            )

            has_more_older = len(messages) > limit
            messages = messages[:limit]
            messages.reverse()

        elif after_position:
            try:
                after_position = int(after_position)
            except ValueError:
                after_position = None

            messages = list(
                base_queryset.filter(position__gt=after_position).order_by("position")[: limit + 1]
            )

            has_more_older = False
            messages = messages[:limit]

        else:
            last_read_position = member.last_read_position

            if last_read_position <= 0 or last_read_position >= last_position:
                messages = list(base_queryset.order_by("-position")[: limit + 1])
                has_more_older = len(messages) > limit
                messages = messages[:limit]
                messages.reverse()
            else:
                half = limit // 2

                start_position = max(1, last_read_position + 1 - half)
                end_position = start_position + limit - 1

                if end_position > last_position:
                    end_position = last_position
                    start_position = max(1, end_position - limit + 1)

                messages = list(
                    base_queryset.filter(
                        position__gte=start_position,
                        position__lte=end_position,
                    ).order_by("position")
                )

                has_more_older = start_position > 1

        if messages:
            first_position = messages[0].position
            last_loaded_position = messages[-1].position
        else:
            first_position = None
            last_loaded_position = None

        has_more_newer = bool(last_loaded_position and last_loaded_position < last_position)

        chat_with_members = Chat.objects.prefetch_related("members", "members__user").get(id=chat.id)

        return Response(
            {
                "chat": ChatSerializer(chat_with_members).data,
                "messages": MessageSerializer(messages, many=True).data,
                "has_more_older": bool(first_position and first_position > 1 and has_more_older),
                "has_more_newer": has_more_newer,
                "next_before_position": first_position,
                "next_after_position": last_loaded_position,
                "my_last_read_position": member.last_read_position,
            }
        )


class GroupChatCreateView(APIView):
    """
    POST /chats/groups/create/ - create group chat
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        user = request.user

        title = request.data.get("title", "").strip()
        description = request.data.get("description", "").strip()
        avatar = request.data.get("avatar", "").strip()
        member_ids = request.data.get("member_ids", [])

        if not title:
            return Response(
                {"detail": "Title is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(member_ids, list):
            return Response(
                {"detail": "member_ids must be a list."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(member_ids) < 1:
            return Response(
                {"detail": "At least one member is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        members = User.objects.filter(id__in=member_ids)
        if members.count() != len(member_ids):
            return Response(
                {"detail": "Some users not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        chat = Chat.objects.create(
            type=Chat.ChatType.GROUP,
            title=title,
            description=description,
            avatar=avatar,
            created_by=user,
        )

        ChatMember.objects.create(
            chat=chat,
            user=user,
            role=ChatMember.Role.OWNER,
        )

        for member in members:
            if member.id != user.id:
                ChatMember.objects.create(
                    chat=chat,
                    user=member,
                    role=ChatMember.Role.MEMBER,
                )

        chat_with_members = Chat.objects.prefetch_related("members", "members__user").get(id=chat.id)

        return Response(
            ChatSerializer(chat_with_members).data,
            status=status.HTTP_201_CREATED,
        )
