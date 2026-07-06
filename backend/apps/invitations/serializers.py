from rest_framework import serializers
from .models import TeamInvitation


class InvitationTeamSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()


class InvitationUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    avatar = serializers.SerializerMethodField()

    def get_avatar(self, obj):
        if obj.avatar:
            return obj.avatar.url
        return None


class TeamInvitationSerializer(serializers.ModelSerializer):
    team = InvitationTeamSerializer(read_only=True)
    invited_by = InvitationUserSerializer(read_only=True)

    class Meta:
        model = TeamInvitation
        fields = ['id', 'team', 'invited_by', 'status', 'created_at']
