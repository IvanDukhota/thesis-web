from django.contrib import admin

from .models import Chat, ChatMember


@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
    list_display = ("id", "type", "title", "created_by", "is_active", "created_at", "updated_at")
    list_filter = ("type", "is_active", "created_at")
    search_fields = ("title", "description", "created_by__email", "direct_key")
    readonly_fields = ("id", "created_at", "updated_at")
    list_per_page = 50
    raw_id_fields = ("created_by",)

    fieldsets = (
        (None, {"fields": ("id", "type", "direct_key")}),
        ("Chat info", {"fields": ("title", "description", "avatar")}),
        ("Settings", {"fields": ("is_active",)}),
        ("Relations", {"fields": ("created_by",)}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )


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