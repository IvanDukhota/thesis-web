from rest_framework import serializers

from .models import Chat, ChatMember


class ChatMemberSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_full_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = ChatMember
        fields = [
            "id",
            "user",
            "user_email",
            "user_full_name",
            "role",
            "joined_at",
            "is_active",
            "nickname",
        ]


class ChatSerializer(serializers.ModelSerializer):
    members = ChatMemberSerializer(many=True, read_only=True)

    class Meta:
        model = Chat
        fields = [
            "id",
            "type",
            "title",
            "description",
            "avatar",
            "created_by",
            "is_active",
            "created_at",
            "updated_at",
            "members",
        ]