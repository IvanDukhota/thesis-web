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
    GET /chats/ - список всех чатов пользователя с unread_count
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
            is_new = member.last_read_position == 0 or member.last_read_position is None

            chat_dict = {
                "id": str(chat.id),
                "type": chat.type,
                "title": chat.title,
                "description": chat.description,
                "avatar": chat.avatar.url if chat.avatar else None,
                "created_by": chat.created_by_id,
                "is_active": chat.is_active,
                "created_at": chat.created_at,
                "updated_at": chat.updated_at,
                "unread_count": unread_count,
                "is_new": is_new,
            }

            if chat.type == Chat.ChatType.DIRECT:
                other_member = chat.members.exclude(user=user).select_related('user').first()
                if other_member and other_member.user:
                    chat_dict["title"] = other_member.user.full_name
                    chat_dict["avatar"] = other_member.user.avatar.url if other_member.user.avatar else None

            chats_data.append(chat_dict)

        return Response(chats_data)


class ChatDetailView(APIView):
    """
    GET /chats/{chat_id}/ - детали чата + сообщения с пагинацией
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, chat_id):
        user = request.user
        before_position = request.query_params.get("before_position")
        after_position = request.query_params.get("after_position")
        limit = request.query_params.get("limit", 50)
        translate = request.query_params.get("translate", "false").lower() == "true"

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

        if translate and user.language:
            from django.db.models import Prefetch
            from apps.messages.models import MessageTranslation
            base_queryset = base_queryset.prefetch_related(
                Prefetch(
                    'translations',
                    queryset=MessageTranslation.objects.filter(target_language=user.language),
                    to_attr='_prefetched_translations'
                )
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


        if translate and user.language and messages:
            if before_position:
                scenario = 'before'
                anchor_position = before_position
            elif after_position:
                scenario = 'after'
                anchor_position = after_position
            elif last_read_position <= 0 or last_read_position >= last_position:
                scenario = 'end'
                anchor_position = last_position
            else:
                scenario = 'center'
                anchor_position = last_read_position

            self._enqueue_translations(messages, user.language, user.id, scenario, anchor_position)

        if messages:
            first_position = messages[0].position
            last_loaded_position = messages[-1].position
        else:
            first_position = None
            last_loaded_position = None

        has_more_newer = bool(last_loaded_position and last_loaded_position < last_position)

        chat_with_members = Chat.objects.prefetch_related("members", "members__user").get(id=chat.id)

        serializer_context = {}
        if translate and user.language:
            serializer_context['target_language'] = user.language
            serializer_context['user_id'] = user.id

        return Response(
            {
                "chat": ChatSerializer(chat_with_members).data,
                "messages": MessageSerializer(messages, many=True, context=serializer_context).data,
                "has_more_older": bool(first_position and first_position > 1 and has_more_older),
                "has_more_newer": has_more_newer,
                "next_before_position": first_position,
                "next_after_position": last_loaded_position,
                "my_last_read_position": member.last_read_position,
            }
        )

    def _enqueue_translations(self, messages, target_language, user_id, scenario, anchor_position):
        from apps.messages.tasks import translate_message_high, translate_message_medium, translate_message_low, has_translatable_text
        from apps.messages.models import MessageTranslation

        print(f"Enqueueing translations for {len(messages)} messages to {target_language}, scenario={scenario}, anchor={anchor_position}")

        message_ids = [msg.id for msg in messages]
        existing_translations = set(
            MessageTranslation.objects.filter(
                message_id__in=message_ids,
                target_language=target_language
            ).values_list('message_id', flat=True)
        )

        for message in messages:
            if message.id in existing_translations:
                print(f"Message {message.id} already has translation to {target_language}, skipping")
                continue

            if not has_translatable_text(message.text):
                print(f"Message {message.id} has no translatable text, skipping")
                continue

            if message.source_language == target_language:
                print(f"Message {message.id} source language is the same as target language {target_language}, skipping")
                continue

            if str(message.sender_id) == str(user_id):
                print(f"Message {message.id} is from current user, skipping translation")
                continue

            priority = self._calculate_priority(message.position, scenario, anchor_position)

            print(f"Enqueueing message {message.id} with priority {priority} (position {message.position}, scenario {scenario}, anchor {anchor_position})")

            if priority == 'high':
                translate_message_high.delay(str(message.id), target_language, user_id)
            elif priority == 'medium':
                translate_message_medium.delay(str(message.id), target_language, user_id)
            else:
                translate_message_low.delay(str(message.id), target_language, user_id)

    def _calculate_priority(self, position, scenario, anchor_position):
        if scenario == 'center':
            distance = abs(position - anchor_position)
            if distance <= 10:
                return 'high'
            elif distance <= 20:
                return 'medium'
            else:
                return 'low'

        elif scenario == 'before':
            if position > anchor_position - 10:
                return 'high'
            elif position > anchor_position - 30:
                return 'medium'
            else:
                return 'low'

        elif scenario == 'after':
            if position < anchor_position + 10:
                return 'high'
            elif position < anchor_position + 30:
                return 'medium'
            else:
                return 'low'

        else:
            if position > anchor_position - 10:
                return 'high'
            elif position > anchor_position - 30:
                return 'medium'
            else:
                return 'low'


class GroupChatCreateView(APIView):
    """
    POST /chats/groups/create/ - создание группового чата
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


class ChatStatsView(APIView):
    """
    GET /chats/{chat_id}/stats/ - статистика чата
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, chat_id):
        user = request.user

        try:
            chat = Chat.objects.get(
                id=chat_id,
                members__user=user,
                members__is_active=True,
                is_active=True,
            )
        except Chat.DoesNotExist:
            return Response(
                {"detail": "Chat not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        from apps.messages.models import Message, Attachment

        total_messages = chat.messages.filter(is_deleted=False).count()

        attachments = Attachment.objects.filter(message__chat=chat, message__is_deleted=False)

        total_images = attachments.filter(type=Attachment.AttachmentType.IMAGE).count()
        total_videos = attachments.filter(type=Attachment.AttachmentType.VIDEO).count()
        total_files = attachments.filter(type=Attachment.AttachmentType.FILE).count()

        return Response({
            "total_messages": total_messages,
            "total_images": total_images,
            "total_videos": total_videos,
            "total_files": total_files,
        })


class ChatDeleteView(APIView):
    """
    DELETE /chats/{chat_id}/delete/ - удаление чата
    """
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def delete(self, request, chat_id):
        user = request.user

        try:
            chat = Chat.objects.get(
                id=chat_id,
                members__user=user,
                members__is_active=True,
                is_active=True,
            )
        except Chat.DoesNotExist:
            return Response(
                {"detail": "Chat not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            member = ChatMember.objects.get(chat=chat, user=user, is_active=True)
        except ChatMember.DoesNotExist:
            return Response(
                {"detail": "You are not a member of this chat."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if chat.type == Chat.ChatType.GROUP:
            if member.role != ChatMember.Role.OWNER:
                return Response(
                    {"detail": "Only the owner can delete a group chat."},
                    status=status.HTTP_403_FORBIDDEN,
                )


        from apps.messages.models import Attachment
        from config.storage import AttachmentStorage

        storage = AttachmentStorage()
        attachments = Attachment.objects.filter(message__chat=chat)

        for attachment in attachments:
            try:
                storage.delete(attachment.storage_key)
            except Exception as e:
                print(f"Failed to delete attachment {attachment.storage_key}: {e}")

        from apps.messages.models import MessageTranslation
        from celery import current_app

        pending_translations = MessageTranslation.objects.filter(
            message__chat=chat,
            translated_text__isnull=True
        )

        pending_translations.delete()

        member_ids = list(chat.members.filter(is_active=True).values_list('user_id', flat=True))

        chat_id_str = str(chat.id)
        chat.delete()

        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync

        channel_layer = get_channel_layer()

        for member_id in member_ids:
            async_to_sync(channel_layer.group_send)(
                f"user_{member_id}",
                {
                    "type": "send_chat_deleted",
                    "chat_id": chat_id_str,
                },
            )

        return Response(
            {"detail": "Chat deleted successfully."},
            status=status.HTTP_200_OK,
        )
