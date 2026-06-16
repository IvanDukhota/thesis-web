import uuid
from django.conf import settings
from django.db import models


class Task(models.Model):
    PRIORITY_CHOICES = [
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
    ]
    COLUMN_CHOICES = [
        ('To Do', 'To Do'),
        ('In Progress', 'In Progress'),
        ('Testing', 'Testing'),
        ('Finished', 'Finished'),
    ]
    TAG_CHOICES = [
        ('frontend', 'Frontend'),
        ('backend', 'Backend'),
        ('design', 'Design'),
        ('testing', 'Testing'),
        ('docs', 'Docs'),
        ('devops', 'DevOps'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, related_name='tasks'
    )
    title = models.CharField(max_length=300)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, blank=True)
    column = models.CharField(max_length=20, choices=COLUMN_CHOICES, default='To Do')
    assignee = models.CharField(max_length=100, blank=True)
    deadline = models.DateField(null=True, blank=True)
    tag = models.CharField(max_length=20, choices=TAG_CHOICES, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='created_tasks'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['column', 'created_at']

    def __str__(self):
        return f'{self.title} [{self.column}]'
