from rest_framework import serializers
from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'priority', 'column', 'assignee',
            'deadline', 'tag', 'created_at', 'updated_at',
        ]
