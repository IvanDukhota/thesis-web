from rest_framework import serializers
from .models import Task, TaskFile


class TaskFileSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    uploaded_by = serializers.CharField(source='uploaded_by.username', read_only=True, default=None)

    class Meta:
        model = TaskFile
        fields = ['id', 'original_name', 'url', 'uploaded_by', 'uploaded_at']

    def get_url(self, obj):
        return obj.file.url


class TaskSerializer(serializers.ModelSerializer):
    files = TaskFileSerializer(many=True, read_only=True)

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'priority', 'column', 'assignee',
            'deadline', 'tag', 'created_at', 'updated_at', 'files',
        ]
