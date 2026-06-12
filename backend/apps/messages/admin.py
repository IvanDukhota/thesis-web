from django.contrib import admin

from .models import Attachment, Message, MessageTranslation


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "chat", "sender", "text_preview", "type", "position", "source_language", "is_deleted", "sent_at")
    list_filter = ("type", "is_deleted", "source_language", "sent_at")
    search_fields = ("text", "sender__email", "chat__title")
    readonly_fields = ("id", "sent_at", "edited_at", "deleted_at")
    list_per_page = 50
    raw_id_fields = ("chat", "sender", "reply_to", "forwarded_from")

    def text_preview(self, obj):
        if obj.text:
            return obj.text[:100] + "..." if len(obj.text) > 100 else obj.text
        return "-"
    text_preview.short_description = "Text"

    fieldsets = (
        (None, {"fields": ("id", "chat", "sender", "type")}),
        ("Content", {"fields": ("text", "position", "client_id", "source_language")}),
        ("Relations", {"fields": ("reply_to", "forwarded_from")}),
        ("Status", {"fields": ("is_deleted", "deleted_at")}),
        ("Timestamps", {"fields": ("sent_at", "edited_at")}),
    )


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ("id", "message", "type", "file_name", "mime_type", "size", "width", "height", "created_at")
    list_filter = ("type", "mime_type", "created_at")
    search_fields = ("file_name", "storage_key")
    readonly_fields = ("id", "created_at")
    list_per_page = 50
    raw_id_fields = ("message",)

    fieldsets = (
        (None, {"fields": ("id", "message", "type")}),
        ("File info", {"fields": ("file_name", "storage_key", "mime_type", "size")}),
        ("Media dimensions", {"fields": ("width", "height", "duration_sec")}),
        ("Timestamps", {"fields": ("created_at",)}),
    )


@admin.register(MessageTranslation)
class MessageTranslationAdmin(admin.ModelAdmin):
    list_display = ("id", "message", "target_language", "created_at")
    list_filter = ("target_language", "created_at")
    search_fields = ("translated_text", "message__text")
    readonly_fields = ("id", "created_at")
    list_per_page = 50
    raw_id_fields = ("message",)

    fieldsets = (
        (None, {"fields": ("id", "message")}),
        ("Translation", {"fields": ("target_language", "translated_text")}),
        ("Timestamps", {"fields": ("created_at",)}),
    )