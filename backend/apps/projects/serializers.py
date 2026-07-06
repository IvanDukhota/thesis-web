from rest_framework import serializers
from .models import Project, ProjectMember, ProjectRole


class ProjectRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectRole
        fields = ['id', 'name', 'is_owner', 'can_view', 'can_create', 'can_edit', 'can_delete']
        read_only_fields = ['id', 'is_owner']


class ProjectMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    avatar = serializers.SerializerMethodField()
    role_name = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = ProjectMember
        fields = ['id', 'user_id', 'username', 'avatar', 'role_name', 'is_owner', 'joined_at']

    def get_avatar(self, obj):
        return obj.user.avatar.url if obj.user.avatar else None

    def get_role_name(self, obj):
        return obj.role.name if obj.role else None

    def get_is_owner(self, obj):
        return obj.role.is_owner if obj.role else False


class ProjectSerializer(serializers.ModelSerializer):
    project_members = ProjectMemberSerializer(many=True, read_only=True)
    roles = ProjectRoleSerializer(many=True, read_only=True)
    task_count = serializers.SerializerMethodField()
    done_count = serializers.SerializerMethodField()
    order_info = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'type', 'status',
            'team', 'created_by', 'created_at', 'updated_at',
            'project_members', 'roles', 'task_count', 'done_count', 'order_info',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_task_count(self, obj):
        return obj.tasks.count()

    def get_done_count(self, obj):
        return obj.tasks.filter(column='Finished').count()

    def get_order_info(self, obj):
        from datetime import timedelta
        order = obj.order
        if not order:
            return None
        deadline = None
        if obj.created_at and order.estimated_days:
            deadline = (obj.created_at + timedelta(days=order.estimated_days)).date().isoformat()
        attachments = []
        for att in order.attachments.all():
            try:
                url = att.file.url
            except Exception:
                url = None
            name = att.file.name.split('/')[-1] if att.file.name else ''
            ext = name.rsplit('.', 1)[-1].lower() if '.' in name else ''
            file_type = 'image' if ext in ('jpg', 'jpeg', 'png', 'gif', 'webp', 'svg') else 'file'
            attachments.append({'url': url, 'filename': name, 'file_type': file_type})
        buyer = None
        if order.buyer:
            b = order.buyer
            try:
                avatar_url = b.avatar.url if b.avatar else None
            except Exception:
                avatar_url = None
            buyer = {'id': b.id, 'email': b.email, 'full_name': b.full_name, 'avatar': avatar_url}
        return {
            'title': order.title,
            'description': order.description,
            'price': str(order.price),
            'estimated_days': order.estimated_days,
            'deadline': deadline,
            'category': order.category.name if order.category else None,
            'tags': [t.name for t in order.tags.all()],
            'attachments': attachments,
            'buyer': buyer,
        }


class ProjectCreateSerializer(serializers.ModelSerializer):
    member_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False, default=list
    )

    class Meta:
        model = Project
        fields = ['name', 'description', 'type', 'team', 'member_ids']

    def validate(self, data):
        if data.get('type') == Project.TEAM and not data.get('team'):
            raise serializers.ValidationError({'team': 'Team is required for team projects.'})
        if data.get('type') == Project.SOLO:
            data.pop('team', None)
        return data
