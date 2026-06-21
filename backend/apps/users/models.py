from django.conf import settings
from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from config.storage import AvatarStorage


def user_avatar_path(instance, filename):
    ext = filename.rsplit('.', 1)[-1].lower()
    return f'user_{instance.id}.{ext}'


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True")
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
    ]

    REGION_CHOICES = [
        ('north_america', 'North America'),
        ('south_america', 'South America'),
        ('europe', 'Europe'),
        ('asia', 'Asia'),
        ('africa', 'Africa'),
        ('oceania', 'Oceania'),
        ('middle_east', 'Middle East'),
    ]

    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('uk', 'Ukrainian'),
        ('ru', 'Russian'),
        ('de', 'German'),
        ('fr', 'French'),
        ('es', 'Spanish'),
        ('pl', 'Polish'),
    ]

    email = models.EmailField(unique=True)
    username = models.CharField(max_length=50, unique=True)
    avatar = models.ImageField(upload_to=user_avatar_path, storage=AvatarStorage, blank=True, null=True)

    language = models.CharField(max_length=10, default='en', choices=LANGUAGE_CHOICES)
    gender = models.CharField(max_length=20, blank=True, default='', choices=GENDER_CHOICES)
    age = models.PositiveSmallIntegerField(null=True, blank=True)
    region = models.CharField(max_length=50, blank=True, default='', choices=REGION_CHOICES)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        ordering = ["username", "email"]

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        return self.username

    @property
    def avatar_url(self):
        if self.avatar:
            return self.avatar.url
        return None


class UserContact(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="contacts",
    )
    contact = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="in_contacts_of",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("owner", "contact")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.owner.email} -> {self.contact.email}"
