from django.contrib import admin
from django.utils.html import format_html

from .models import Chat, ChatMember


@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
    list_display = ("id", "type", "title", "avatar_preview", "created_by", "is_active", "created_at", "updated_at")
    list_filter = ("type", "is_active", "created_at")
    search_fields = ("title", "description", "created_by__email", "direct_key")
    readonly_fields = ("id", "created_at", "updated_at", "avatar_preview")
    list_per_page = 50
    raw_id_fields = ("created_by",)

    fieldsets = (
        (None, {"fields": ("id", "type", "direct_key")}),
        ("Chat info", {"fields": ("title", "description", "avatar", "avatar_preview")}),
        ("Settings", {"fields": ("is_active",)}),
        ("Relations", {"fields": ("created_by",)}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )

    def avatar_preview(self, obj):
        if obj.avatar:
            return format_html('<img src="{}" width="50" height="50" style="border-radius: 50%; object-fit: cover;" />', obj.avatar.url)
        return "-"
    avatar_preview.short_description = "Avatar"


@admin.register(ChatMember)
class ChatMemberAdmin(admin.ModelAdmin):
    list_display = ("id", "chat", "user", "role", "nickname", "last_read_position", "joined_at", "is_active")
    list_filter = ("role", "is_active", "joined_at")
    search_fields = ("user__email", "chat__title", "nickname")
    readonly_fields = ("id", "joined_at")
    list_per_page = 50
    raw_id_fields = ("chat", "user")

    fieldsets = (
        (None, {"fields": ("id", "chat", "user")}),
        ("Settings", {"fields": ("role", "nickname", "is_active")}),
        ("Reading", {"fields": ("last_read_position",)}),
        ("Timestamps", {"fields": ("joined_at",)}),
    )