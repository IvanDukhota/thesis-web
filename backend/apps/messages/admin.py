from django.contrib import admin

from .models import Attachment, Message


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "chat", "sender", "type", "is_deleted", "sent_at")
    list_filter = ("type", "is_deleted", "sent_at")
    search_fields = ("text", "sender__email")


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ("id", "message", "type", "file_name", "mime_type", "size", "created_at")
    list_filter = ("type", "mime_type")
    search_fields = ("file_name", "storage_key")