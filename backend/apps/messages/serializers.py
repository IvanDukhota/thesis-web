from rest_framework import serializers

from .models import Attachment, Message


class AttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = Attachment
        fields = [
            "id",
            "type",
            "file_name",
            "url",
            "mime_type",
            "size",
            "width",
            "height",
            "duration_sec",
            "created_at",
        ]

    def get_url(self, obj):
        from config.storage import AttachmentStorage
        storage = AttachmentStorage()
        return storage.url(obj.storage_key)


class MessageSenderSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    full_name = serializers.CharField()
    avatar = serializers.SerializerMethodField()

    def get_avatar(self, obj):
        if hasattr(obj, 'avatar') and obj.avatar:
            return obj.avatar.url
        return None


class ReplyToMessageSerializer(serializers.ModelSerializer):
    sender = serializers.SerializerMethodField()
    attachments = AttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Message
        fields = ["id", "position", "sender", "type", "text", "attachments"]

    def get_sender(self, obj):
        return {
            "id": obj.sender.id,
            "email": obj.sender.email,
            "full_name": obj.sender.full_name,
            "avatar": obj.sender.avatar.url if obj.sender.avatar else None,
        }


class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.SerializerMethodField()
    attachments = AttachmentSerializer(many=True, read_only=True)
    reply_to = ReplyToMessageSerializer(read_only=True)
    forwarded_from = ReplyToMessageSerializer(read_only=True)
    translated_text = serializers.SerializerMethodField()
    translation_status = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "chat",
            "position",
            "client_id",
            "sender",
            "type",
            "text",
            "reply_to",
            "forwarded_from",
            "attachments",
            "is_deleted",
            "sent_at",
            "edited_at",
            "translated_text",
            "translation_status",
        ]

    def get_sender(self, obj):
        return {
            "id": obj.sender.id,
            "email": obj.sender.email,
            "full_name": obj.sender.full_name,
            "avatar": obj.sender.avatar.url if obj.sender.avatar else None,
        }

    def get_translated_text(self, obj):
        target_language = self.context.get('target_language')
        if not target_language:
            return None

        if hasattr(obj, '_prefetched_translations'):
            for translation in obj._prefetched_translations:
                if translation.target_language == target_language:
                    return translation.translated_text
            return None

        translation = obj.translations.filter(
            target_language=target_language
        ).first()

        return translation.translated_text if translation else None

    def get_translation_status(self, obj):
        translated_text = self.get_translated_text(obj)
        return 'ready' if translated_text else 'pending'