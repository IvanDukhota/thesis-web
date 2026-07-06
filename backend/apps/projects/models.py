import uuid
from django.conf import settings
from django.db import models


class Project(models.Model):
    SOLO = 'solo'
    TEAM = 'team'
    TYPE_CHOICES = [(SOLO, 'Solo'), (TEAM, 'Team')]

    ACTIVE = 'active'
    PAUSED = 'paused'
    ARCHIVED = 'archived'
    STATUS_CHOICES = [(ACTIVE, 'Active'), (PAUSED, 'Paused'), (ARCHIVED, 'Archived')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default=SOLO)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=ACTIVE)
    team = models.ForeignKey(
        'teams.Team', on_delete=models.CASCADE, null=True, blank=True, related_name='projects',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_projects',
    )
    order = models.ForeignKey(
        'marketplace.Order',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='marketplace_projects',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class ProjectRole(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='roles')
    name = models.CharField(max_length=50)
    is_owner = models.BooleanField(default=False)
    can_view = models.BooleanField(default=True)
    can_create = models.BooleanField(default=False)
    can_edit = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)

    class Meta:
        unique_together = ('project', 'name')

    def __str__(self):
        return f'{self.name} ({self.project.name})'


class ProjectMember(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='project_members')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='project_memberships',
    )
    role = models.ForeignKey(
        ProjectRole, on_delete=models.SET_NULL, null=True, blank=True, related_name='members',
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('project', 'user')
        ordering = ['joined_at']

    def __str__(self):
        return f'{self.user.username} in {self.project.name}'
