from django.contrib.auth import get_user_model
from django.db.models import Max
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.messages.serializers import MessageSerializer

from .models import Chat, ChatMember
from .serializers import ChatSerializer
from .services import get_direct_chat_between

User = get_user_model()


class ChatViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ChatSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        return (
            Chat.objects.filter(
                members__user=user,
                members__is_active=True,
                is_active=True,
            )
            .select_related("created_by")
            .prefetch_related("members", "members__user")
            .order_by("-updated_at")
            .distinct()
        )


class DirectChatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user_id = request.query_params.get("user_id")
        before_position = request.query_params.get("before_position")
        after_position = request.query_params.get("after_position")
        limit = request.query_params.get("limit", 50)

        try:
            limit = int(limit)
        except ValueError:
            limit = 50

        limit = max(1, min(limit, 100))

        if not user_id:
            return Response({"detail": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            other_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if other_user.id == request.user.id:
            return Response(
                {"detail": "You cannot open direct chat with yourself."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        chat = get_direct_chat_between(request.user, other_user)

        if not chat:
            return Response(
                {
                    "exists": False,
                    "chat": None,
                    "messages": [],
                    "has_more_older": False,
                    "has_more_newer": False,
                    "next_before_position": None,
                    "next_after_position": None,
                    "first_unread_position": None,
                    "my_last_read_position": 0,
                }
            )

        member = ChatMember.objects.get(chat=chat, user=request.user)
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
                base_queryset.filter(position__lt=before_position)
                .order_by("-position")[: limit + 1]
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
                base_queryset.filter(position__gt=after_position)
                .order_by("position")[: limit + 1]
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
                first_unread_position = last_read_position + 1
                half = limit // 2

                start_position = max(1, first_unread_position - half)
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

        first_unread_position = None
        if member.last_read_position < last_position:
            first_unread_position = member.last_read_position + 1

        return Response(
            {
                "exists": True,
                "chat": ChatSerializer(chat).data,
                "messages": MessageSerializer(messages, many=True).data,
                "has_more_older": bool(first_position and first_position > 1 and has_more_older),
                "has_more_newer": has_more_newer,
                "next_before_position": first_position,
                "next_after_position": last_loaded_position,
                "first_unread_position": first_unread_position,
                "my_last_read_position": member.last_read_position,
            }
        )