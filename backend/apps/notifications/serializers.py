from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    project_id = serializers.SerializerMethodField()
    project_name = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ['id', 'type', 'title', 'body', 'is_read', 'project_id', 'project_name', 'created_at']

    def get_project_id(self, obj):
        return str(obj.project_id) if obj.project_id else None

    def get_project_name(self, obj):
        return obj.project.name if obj.project else None
