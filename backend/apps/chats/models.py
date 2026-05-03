import uuid

from django.conf import settings
from django.db import models


class Chat(models.Model):
    class ChatType(models.TextChoices):
        DIRECT = "direct", "Direct"
        GROUP = "group", "Group"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    type = models.CharField(max_length=20, choices=ChatType.choices)
    
    title = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    avatar = models.URLField(blank=True)
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_chats",
    )
    
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        if self.type == self.ChatType.DIRECT:
            return f"Direct chat {self.id}"
        return self.title or f"Group chat {self.id}"


class ChatMember(models.Model):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        ADMIN = "admin", "Admin"
        MEMBER = "member", "Member"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    chat = models.ForeignKey(
        Chat,
        on_delete=models.CASCADE,
        related_name="members",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_memberships",
    )

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)
    
    joined_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    nickname = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = ("chat", "user")
        ordering = ["joined_at"]

    def __str__(self):
        return f"{self.user.email} in {self.chat_id}"