import uuid

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Max
from PIL import Image
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.chats.models import Chat, ChatMember
from apps.chats.serializers import ChatSerializer
from apps.chats.services import get_or_create_direct_chat
from config.storage import AttachmentStorage

from .models import Attachment, Message
from .serializers import MessageSerializer

User = get_user_model()


class MessageCreateView(APIView):
    """
    POST /api/chats/{chat_id}/messages/
    POST /api/messages/direct/
    """
    permission_classes = [permissions.IsAuthenticated]

    MAX_FILE_SIZE = 500 * 1024 * 1024  # 50MB
    MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_VIDEO_SIZE = 500 * 1024 * 1024  # 500MB
    MAX_FILES_COUNT = 10

    ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    ALLOWED_VIDEO_TYPES = [
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo',
        'video/webm',
        'video/x-matroska',
        'video/matroska',
        'video/avi',
        'video/mpeg',
        'video/x-flv',
    ]
    ALLOWED_DOCUMENT_TYPES = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
    ]

    @transaction.atomic
    def post(self, request, chat_id=None):
        user = request.user

        text = request.data.get('text', '').strip()
        recipient_id = request.data.get('recipient_id')
        client_id = request.data.get('client_id')
        reply_to_id = request.data.get('reply_to_id')
        forwarded_from_id = request.data.get('forwarded_from_id')
        files = request.FILES.getlist('files')

        # Allow empty message only if forwarding
        if not text and not files and not forwarded_from_id:
            return Response(
                {"detail": "Message must contain text or files."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not chat_id and not recipient_id:
            return Response(
                {"detail": "Either chat_id or recipient_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(files) > self.MAX_FILES_COUNT:
            return Response(
                {"detail": f"Maximum {self.MAX_FILES_COUNT} files allowed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        validated_files = []
        for file in files:
            validation_result = self._validate_file(file)
            if validation_result['error']:
                return Response(
                    {"detail": validation_result['error']},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            validated_files.append(validation_result)

        try:
            if recipient_id:
                try:
                    recipient = User.objects.get(id=recipient_id)
                except User.DoesNotExist:
                    return Response(
                        {"detail": "Recipient not found."},
                        status=status.HTTP_404_NOT_FOUND,
                    )

                if recipient.id == user.id:
                    return Response(
                        {"detail": "Cannot send message to yourself."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                chat, chat_created = get_or_create_direct_chat(user, recipient)
            else:
                chat = Chat.objects.get(
                    id=chat_id,
                    members__user=user,
                    members__is_active=True,
                    is_active=True,
                )
                chat_created = False

        except Chat.DoesNotExist:
            return Response(
                {"detail": "Chat not found or access denied."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Validate reply_to_id if provided
        reply_to_message = None
        if reply_to_id:
            try:
                reply_to_message = Message.objects.get(
                    id=reply_to_id,
                    chat=chat,
                    is_deleted=False,
                )
            except Message.DoesNotExist:
                return Response(
                    {"detail": "Reply target message not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        # Validate forwarded_from_id if provided
        forwarded_from_message = None
        if forwarded_from_id:
            try:
                forwarded_from_message = Message.objects.get(
                    id=forwarded_from_id,
                    is_deleted=False,
                )
            except Message.DoesNotExist:
                return Response(
                    {"detail": "Forwarded message not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        last_position = (
            Message.objects.filter(chat=chat)
            .aggregate(value=Max("position"))
            .get("value")
            or 0
        )
        next_position = last_position + 1
        

        # Determine message type based on files or forwarded message attachments
        message_type = Message.MessageType.TEXT
        if files:
            first_file_type = validated_files[0]['attachment_type']
            if first_file_type == Attachment.AttachmentType.IMAGE:
                message_type = Message.MessageType.IMAGE
            elif first_file_type == Attachment.AttachmentType.VIDEO:
                message_type = Message.MessageType.VIDEO
            else:
                message_type = Message.MessageType.FILE
        elif forwarded_from_message:
            # If forwarding, inherit message type and text from original message
            message_type = forwarded_from_message.type
            # Copy original text if no new text provided
            if not text:
                text = forwarded_from_message.text

        message = Message.objects.create(
            chat=chat,
            sender=user,
            position=next_position,
            type=message_type,
            text=text,
            client_id=client_id,
            reply_to=reply_to_message,
            forwarded_from=forwarded_from_message,
        )

        if files:
            storage = AttachmentStorage()

            for file_data in validated_files:
                file = file_data['file']

                ext = file.name.split('.')[-1] if '.' in file.name else ''
                storage_key = f"{uuid.uuid4()}.{ext}" if ext else f"{uuid.uuid4()}"

                storage.save(storage_key, file)

                Attachment.objects.create(
                    message=message,
                    type=file_data['attachment_type'],
                    storage_key=storage_key,
                    file_name=file.name,
                    mime_type=file.content_type,
                    size=file.size,
                    width=file_data.get('width'),
                    height=file_data.get('height'),
                )
        elif forwarded_from_message:
            # Copy attachments from forwarded message
            for original_attachment in forwarded_from_message.attachments.all():
                Attachment.objects.create(
                    message=message,
                    type=original_attachment.type,
                    storage_key=original_attachment.storage_key,
                    file_name=original_attachment.file_name,
                    mime_type=original_attachment.mime_type,
                    size=original_attachment.size,
                    width=original_attachment.width,
                    height=original_attachment.height,
                    duration_sec=original_attachment.duration_sec,
                )

        chat.save(update_fields=['updated_at'])

        try:
            member = ChatMember.objects.get(
                chat=chat,
                user=user,
                is_active=True,
            )
            member.last_read_position = next_position
            member.save(update_fields=['last_read_position'])
        except ChatMember.DoesNotExist:
            pass

        message_data = MessageSerializer(message).data
        chat_with_members = Chat.objects.prefetch_related('members', 'members__user').get(id=chat.id)

        # Serialize chat with request context for sender
        chat_data = ChatSerializer(chat_with_members, context={'request': request}).data

        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        import json

        channel_layer = get_channel_layer()
        chat_id_str = str(chat.id)

        # Convert to JSON and back to ensure all UUIDs are strings
        message_data_clean = json.loads(json.dumps(message_data, default=str))
        chat_data_clean = json.loads(json.dumps(chat_data, default=str))

        async_to_sync(channel_layer.group_send)(
            f"chat_{chat_id_str}",
            {
                "type": "broadcast_message_created",
                "message_data": message_data_clean,
                "chat_data": chat_data_clean,
            },
        )


        # Get all member IDs from chat_data
        member_ids = [m['user'] for m in chat_data_clean.get('members', [])]
        sender_id = user.id

        for member_id in member_ids:
            if int(member_id) == sender_id:
                continue

            # Calculate unread_count and is_new for recipient
            try:
                recipient_user = User.objects.get(id=member_id)
                recipient_member = chat_with_members.members.get(user=recipient_user, is_active=True)

                last_read_position = recipient_member.last_read_position or 0
                unread_count = chat_with_members.messages.filter(
                    position__gt=last_read_position
                ).exclude(sender=recipient_user).count()

                is_new = recipient_member.last_read_position == 0 or recipient_member.last_read_position is None

                # Build minimal chat object for notification
                chat_notification_data = {
                    "id": chat_id_str,
                    "type": chat.type,
                    "direct_key": chat.direct_key,
                    "title": chat.title,
                    "description": chat.description,
                    "avatar": chat.avatar.url if chat.avatar else None,
                    "created_by": chat.created_by_id,
                    "is_active": chat.is_active,
                    "created_at": str(chat.created_at),
                    "updated_at": str(chat.updated_at),
                    "unread_count": unread_count,
                    "is_new": is_new,
                }

                # For direct chats, override title and avatar with the other user's data
                if chat.type == Chat.ChatType.DIRECT:
                    other_member = chat_with_members.members.exclude(user=recipient_user).select_related('user').first()
                    if other_member and other_member.user:
                        chat_notification_data["title"] = other_member.user.full_name
                        chat_notification_data["avatar"] = other_member.user.avatar.url if other_member.user.avatar else None

            except (User.DoesNotExist, ChatMember.DoesNotExist):
                chat_notification_data = {
                    "id": chat_id_str,
                    "type": chat.type,
                    "direct_key": chat.direct_key,
                    "title": chat.title,
                    "description": chat.description,
                    "avatar": chat.avatar.url if chat.avatar else None,
                    "created_by": chat.created_by_id,
                    "is_active": chat.is_active,
                    "created_at": str(chat.created_at),
                    "updated_at": str(chat.updated_at),
                    "unread_count": 0,
                    "is_new": False,
                }

            async_to_sync(channel_layer.group_send)(
                f"user_{member_id}",
                {
                    "type": "send_notification",
                    "notification_type": "new_message",
                    "chat_id": chat_id_str,
                    "sender_name": user.full_name,
                    "message_sent_at": str(message.sent_at),
                    "chat_data": chat_notification_data,
                },
            )

        # Под вопросом
        if recipient_id and chat_created:
            async_to_sync(channel_layer.group_send)(
                f"user_{user.id}",
                {
                    "type": "send_chat_opened",
                    "chat_id": chat_id_str,
                    "chat_type": chat.type,
                },
            )

        return Response(message_data, status=status.HTTP_201_CREATED)


    def _validate_file(self, file):
        result = {
            'file': file,
            'error': None,
            'attachment_type': None,
            'width': None,
            'height': None,
        }

        mime_type = file.content_type
        file_size = file.size

        if file_size > self.MAX_FILE_SIZE:
            result['error'] = f"File {file.name} is too large. Maximum size is {self.MAX_FILE_SIZE / (1024*1024)}MB."
            return result

        if mime_type in self.ALLOWED_IMAGE_TYPES:
            result['attachment_type'] = Attachment.AttachmentType.IMAGE

            if file_size > self.MAX_IMAGE_SIZE:
                result['error'] = f"Image {file.name} is too large. Maximum size is {self.MAX_IMAGE_SIZE / (1024*1024)}MB."
                return result

            try:
                image = Image.open(file)
                result['width'] = image.width
                result['height'] = image.height
                file.seek(0)
            except Exception:
                result['error'] = f"Invalid image file: {file.name}"
                return result

        elif mime_type in self.ALLOWED_VIDEO_TYPES:
            result['attachment_type'] = Attachment.AttachmentType.VIDEO


            if file_size > self.MAX_VIDEO_SIZE:
                result['error'] = f"Video {file.name} is too large. Maximum size is {self.MAX_VIDEO_SIZE / (1024*1024)}MB."
                return result

        elif mime_type in self.ALLOWED_DOCUMENT_TYPES:
            result['attachment_type'] = Attachment.AttachmentType.FILE

        else:
            result['error'] = f"File type {mime_type} is not allowed."
            return result

        return result


class TranslationRequestView(APIView):
    """
    POST /translations/request/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        print("TranslationRequestView.post() called")
        chat_id = request.data.get('chat_id')
        high_priority = request.data.get('high_priority', [])
        medium_priority = request.data.get('medium_priority', [])
        low_priority = request.data.get('low_priority', [])

        if not chat_id:
            return Response(
                {"detail": "chat_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not request.user.language:
            return Response(
                {"detail": "User language not set."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if user is a member of the chat
        try:
            member = ChatMember.objects.get(
                chat_id=chat_id,
                user=request.user,
                is_active=True
            )
        except ChatMember.DoesNotExist:
            return Response(
                {"detail": "You are not a member of this chat."},
                status=status.HTTP_403_FORBIDDEN
            )

        target_language = request.user.language
        user_id = request.user.id

        # Collect all message IDs
        all_message_ids = high_priority + medium_priority + low_priority

        if not all_message_ids:
            return Response({
                "status": "enqueued",
                "total": 0,
                "high": 0,
                "medium": 0,
                "low": 0,
                "skipped": []
            })

        # Bulk query: find messages that already have translations
        from .models import MessageTranslation
        existing_translation_ids = set(
            MessageTranslation.objects.filter(
                message_id__in=all_message_ids,
                target_language=target_language
            ).values_list('message_id', flat=True)
        )

        # Bulk query: get all messages to check source_language, sender, and text
        messages_dict = {
            str(msg.id): msg
            for msg in Message.objects.filter(id__in=all_message_ids).only('id', 'source_language', 'sender_id', 'text')
        }

        # Import tasks
        from .tasks import translate_message_high, translate_message_medium, translate_message_low, has_translatable_text

        skipped_ids = []
        enqueued_high = 0
        enqueued_medium = 0
        enqueued_low = 0

        def should_skip(message_id):
            # Check if translation already exists
            if message_id in existing_translation_ids:
                return True

            # Check if message exists
            message = messages_dict.get(str(message_id))
            if not message:
                return True

            # Skip if message is from current user
            if message.sender_id == user_id:
                return True

            # Skip if no translatable text - send original text as translation
            if not has_translatable_text(message.text if hasattr(message, 'text') else ''):
                from .tasks import send_translation_ready_event
                send_translation_ready_event(str(message_id), target_language, message.text or '', user_id)
                return True

            # Skip if source language matches target language - send original text
            if message.source_language == target_language:
                from .tasks import send_translation_ready_event
                send_translation_ready_event(str(message_id), target_language, message.text or '', user_id)
                return True

            return False

        # Enqueue high priority messages
        for message_id in high_priority:
            if should_skip(message_id):
                skipped_ids.append(str(message_id))
                continue
            translate_message_high.delay(str(message_id), target_language, user_id)
            enqueued_high += 1

        # Enqueue medium priority messages
        for message_id in medium_priority:
            if should_skip(message_id):
                skipped_ids.append(str(message_id))
                continue
            translate_message_medium.delay(str(message_id), target_language, user_id)
            enqueued_medium += 1

        # Enqueue low priority messages
        for message_id in low_priority:
            if should_skip(message_id):
                skipped_ids.append(str(message_id))
                continue
            translate_message_low.delay(str(message_id), target_language, user_id)
            enqueued_low += 1

        total_enqueued = enqueued_high + enqueued_medium + enqueued_low

        return Response({
            "status": "enqueued",
            "total": total_enqueued,
            "high": enqueued_high,
            "medium": enqueued_medium,
            "low": enqueued_low,
            "skipped": skipped_ids
        })


class MessageDeleteView(APIView):
    """
    DELETE /api/messages/{message_id}/
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, message_id):
        try:
            message = Message.objects.select_related('chat').get(id=message_id)
        except Message.DoesNotExist:
            return Response(
                {"detail": "Message not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if user is the sender or has permission to delete
        if message.sender.id != request.user.id:
            # Check if user is admin/owner of group chat
            if message.chat.type == Chat.ChatType.GROUP:
                try:
                    member = ChatMember.objects.get(
                        chat=message.chat,
                        user=request.user,
                        is_active=True
                    )
                    # Only sender can delete their own messages in group chats for now
                    # You can add role-based permissions here if needed
                    return Response(
                        {"detail": "You can only delete your own messages."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
                except ChatMember.DoesNotExist:
                    return Response(
                        {"detail": "Access denied."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
            else:
                return Response(
                    {"detail": "You can only delete your own messages."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        # Delete the message
        chat_id = str(message.chat.id)
        message_id_str = str(message.id)
        message.delete()

        # Broadcast deletion event to all chat members via WebSocket
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"chat_{chat_id}",
            {
                "type": "broadcast_message_deleted",
                "message_id": message_id_str,
            },
        )

        return Response(status=status.HTTP_204_NO_CONTENT)

class MessageEditView(APIView):
    """
    PATCH /api/messages/{message_id}/
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, message_id):
        try:
            message = Message.objects.select_related('chat').get(id=message_id)
        except Message.DoesNotExist:
            return Response(
                {"detail": "Message not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if user is the sender
        if message.sender.id != request.user.id:
            return Response(
                {"detail": "You can only edit your own messages."},
                status=status.HTTP_403_FORBIDDEN,
            )

        new_text = request.data.get('text', '').strip()
        if not new_text:
            return Response(
                {"detail": "Message text cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update message
        from django.utils import timezone
        message.text = new_text
        message.edited_at = timezone.now()
        message.save(update_fields=['text', 'edited_at'])

        # Serialize updated message
        message_data = MessageSerializer(message).data

        # Broadcast edit event to all chat members via WebSocket
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        import json

        channel_layer = get_channel_layer()
        chat_id = str(message.chat.id)
        message_data_clean = json.loads(json.dumps(message_data, default=str))

        async_to_sync(channel_layer.group_send)(
            f"chat_{chat_id}",
            {
                "type": "broadcast_message_edited",
                "message_data": message_data_clean,
            },
        )

        return Response(message_data, status=status.HTTP_200_OK)
