from rest_framework import serializers

from .models import Attachment, Message


class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = [
            "id",
            "type",
            "file_name",
            "mime_type",
            "size",
            "width",
            "height",
            "duration_sec",
            "created_at",
        ]


class MessageSenderSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    full_name = serializers.CharField()


class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.SerializerMethodField()
    attachments = AttachmentSerializer(many=True, read_only=True)

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
        ]

    def get_sender(self, obj):
        return {
            "id": obj.sender.id,
            "email": obj.sender.email,
            "full_name": obj.sender.full_name,
        }