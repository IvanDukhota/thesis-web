from rest_framework import serializers

from .models import Chat, ChatMember


class ChatMemberSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_full_name = serializers.CharField(source="user.full_name", read_only=True)
    user_avatar = serializers.SerializerMethodField()

    class Meta:
        model = ChatMember
        fields = [
            "id",
            "user",
            "user_email",
            "user_full_name",
            "user_avatar",
            "role",
            "joined_at",
            "is_active",
            "nickname",
            "last_read_position",
        ]

    def get_user_avatar(self, obj):
        if obj.user and obj.user.avatar:
            return obj.user.avatar.url
        return None


class ChatSerializer(serializers.ModelSerializer):
    members = ChatMemberSerializer(many=True, read_only=True)
    unread_count = serializers.SerializerMethodField()
    is_new = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()

    class Meta:
        model = Chat
        fields = [
            "id",
            "type",
            "direct_key",
            "title",
            "description",
            "avatar",
            "created_by",
            "is_active",
            "created_at",
            "updated_at",
            "members",
            "unread_count",
            "is_new",
        ]

    def get_avatar(self, obj):
        request = self.context.get('request')

        if obj.type == Chat.ChatType.GROUP:
            if obj.avatar:
                return obj.avatar.url
            return None

        if obj.type == Chat.ChatType.DIRECT and request and request.user.is_authenticated:
            try:
                other_member = obj.members.exclude(user=request.user).select_related('user').first()
                if other_member and other_member.user and other_member.user.avatar:
                    return other_member.user.avatar.url
            except Exception:
                pass

        return None

    def get_title(self, obj):
        request = self.context.get('request')

        if obj.type == Chat.ChatType.GROUP:
            return obj.title

        if obj.type == Chat.ChatType.DIRECT and request and request.user.is_authenticated:
            try:
                other_member = obj.members.exclude(user=request.user).select_related('user').first()
                if other_member and other_member.user:
                    return other_member.user.full_name
            except Exception:
                pass

        return obj.title or "Unknown"

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0

        try:
            member = obj.members.get(user=request.user, is_active=True)
            last_read_position = member.last_read_position or 0

            unread = obj.messages.filter(position__gt=last_read_position).exclude(sender=request.user).count()
            return unread
        except ChatMember.DoesNotExist:
            return 0

    def get_is_new(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False

        try:
            member = obj.members.get(user=request.user, is_active=True)
            return member.last_read_position == 0 or member.last_read_position is None
        except ChatMember.DoesNotExist:
            return False