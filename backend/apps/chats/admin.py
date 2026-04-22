from django.contrib import admin

from .models import Chat, ChatMember


@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
    list_display = ("id", "type", "title", "created_by", "is_active", "created_at")
    list_filter = ("type", "is_active")
    search_fields = ("title", "description", "created_by__email")


@admin.register(ChatMember)
class ChatMemberAdmin(admin.ModelAdmin):
    list_display = ("id", "chat", "user", "role", "joined_at", "is_active")
    list_filter = ("role", "is_active")
    search_fields = ("user__email", "chat__title")