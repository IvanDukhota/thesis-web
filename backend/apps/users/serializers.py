from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import UserContact

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    is_contact = serializers.BooleanField(read_only=True, default=False)
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "full_name",
            "avatar",
            "language",
            "gender",
            "age",
            "region",
            "created_at",
            "is_contact",
            "is_staff",
        ]
        read_only_fields = ["id", "created_at", "full_name", "is_contact", "is_staff"]

    def get_avatar(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6, style={"input_type": "password"})
    password_confirm = serializers.CharField(write_only=True, min_length=6, style={"input_type": "password"})

    class Meta:
        model = User
        fields = [
            "email",
            "username",
            "password",
            "password_confirm",
            "language",
            "gender",
            "age",
            "region",
        ]
        extra_kwargs = {
            "language": {"required": False},
            "gender": {"required": False},
            "age": {"required": False, "allow_null": True},
            "region": {"required": False},
        }

    def validate_email(self, value):
        email = value.lower().strip()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate_username(self, value):
        value = value.strip()
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate(self, attrs):
        if attrs.get("password") != attrs.get("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        return user


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["language", "gender", "age", "region", "avatar"]
        extra_kwargs = {
            "language": {"required": False},
            "gender": {"required": False},
            "age": {"required": False, "allow_null": True},
            "region": {"required": False},
            "avatar": {"required": False},
        }


class ContactCreateSerializer(serializers.ModelSerializer):
    contact_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = UserContact
        fields = ["contact_id"]

    def validate_contact_id(self, value):
        request = self.context["request"]
        user = request.user

        try:
            contact_user = User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found.")

        if contact_user.id == user.id:
            raise serializers.ValidationError("You cannot add yourself to contacts.")

        self.context["contact_user"] = contact_user
        return value

    def create(self, validated_data):
        user = self.context["request"].user
        contact_user = self.context["contact_user"]
        contact, _ = UserContact.objects.get_or_create(owner=user, contact=contact_user)
        return contact
