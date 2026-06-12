from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User, UserContact


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ("-created_at",)
    list_display = ("id", "email", "first_name", "last_name", "language", "is_staff", "is_active", "created_at")
    list_filter = ("is_staff", "is_active", "language", "created_at")
    search_fields = ("email", "first_name", "last_name")
    list_per_page = 50

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "avatar", "language")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "created_at", "updated_at")}),
    )

    readonly_fields = ("created_at", "updated_at", "last_login")

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "first_name", "last_name", "language", "is_staff", "is_active"),
            },
        ),
    )


@admin.register(UserContact)
class UserContactAdmin(admin.ModelAdmin):
    list_display = ("id", "owner", "contact", "created_at")
    list_filter = ("created_at",)
    search_fields = ("owner__email", "contact__email", "owner__first_name", "contact__first_name")
    readonly_fields = ("created_at",)
    list_per_page = 50
    raw_id_fields = ("owner", "contact")