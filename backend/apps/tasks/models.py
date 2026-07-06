import uuid
from django.conf import settings
from django.db import models

from config.storage import CodeStorage


def task_file_path(instance, filename):
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'bin'
    return f'task_{instance.task_id}/{uuid.uuid4().hex}.{ext}'


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
    description = models.TextField(blank=True, default='')
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


class TaskFile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='files')
    file = models.FileField(upload_to=task_file_path, storage=CodeStorage)
    original_name = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_task_files',
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['uploaded_at']

    def __str__(self):
        return f'{self.original_name} → {self.task_id}'
