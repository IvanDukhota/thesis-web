from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User, UserContact


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ("-created_at",)
    list_display = ("id", "email", "username", "language", "gender", "region", "is_staff", "is_active", "created_at")
    list_filter = ("is_staff", "is_active", "language", "gender", "region", "created_at")
    search_fields = ("email", "username")
    list_per_page = 50

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Profile", {"fields": ("username", "avatar", "language", "gender", "age", "region")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "created_at", "updated_at")}),
    )

    readonly_fields = ("created_at", "updated_at", "last_login")

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "username", "password1", "password2", "language", "is_staff", "is_active"),
            },
        ),
    )


@admin.register(UserContact)
class UserContactAdmin(admin.ModelAdmin):
    list_display = ("id", "owner", "contact", "created_at")
    list_filter = ("created_at",)
    search_fields = ("owner__email", "contact__email", "owner__username", "contact__username")
    readonly_fields = ("created_at",)
    list_per_page = 50
    raw_id_fields = ("owner", "contact")
