from rest_framework import serializers
from .models import Team, TeamMember, TeamRole


class TeamRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamRole
        fields = ['id', 'name', 'is_admin', 'can_view', 'can_create_projects', 'can_edit_team', 'can_manage_settings', 'can_delete']
        read_only_fields = ['id', 'is_admin']


class TeamMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    avatar = serializers.SerializerMethodField()
    role_name = serializers.SerializerMethodField()
    is_admin = serializers.SerializerMethodField()

    class Meta:
        model = TeamMember
        fields = ['id', 'user_id', 'username', 'avatar', 'role_name', 'is_admin', 'joined_at']

    def get_avatar(self, obj):
        return obj.user.avatar.url if obj.user.avatar else None

    def get_role_name(self, obj):
        return obj.role.name if obj.role else None

    def get_is_admin(self, obj):
        return obj.role.is_admin if obj.role else False


class TeamSerializer(serializers.ModelSerializer):
    members = TeamMemberSerializer(many=True, read_only=True)
    roles = TeamRoleSerializer(many=True, read_only=True)

    class Meta:
        model = Team
        fields = ['id', 'name', 'description', 'created_by', 'created_at', 'updated_at', 'members', 'roles']
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class TeamCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ['name', 'description']


class TeamUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ['name', 'description']
