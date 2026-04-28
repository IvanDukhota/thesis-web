from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

import logging

from .models import UserContact
from .serializers import (
    ContactCreateSerializer,
    RegisterSerializer,
    UserSerializer,
)

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class UserDirectoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        current_user = request.user

        contact_ids = list(
            UserContact.objects.filter(owner=current_user).values_list("contact_id", flat=True)
        )

        contacts = User.objects.filter(id__in=contact_ids).order_by("first_name", "last_name", "email")
        others = User.objects.exclude(id=current_user.id).exclude(id__in=contact_ids).order_by(
            "first_name", "last_name", "email"
        )

        contacts_data = UserSerializer(
            [{**UserSerializer(user).data, "is_contact": True} for user in contacts],
            many=True,
        ).data if False else None

        contacts_serialized = []
        for user in contacts:
            item = UserSerializer(user).data
            item["is_contact"] = True
            contacts_serialized.append(item)

        others_serialized = []
        for user in others:
            item = UserSerializer(user).data
            item["is_contact"] = False
            others_serialized.append(item)

        return Response(
            {
                "contacts": contacts_serialized,
                "others": others_serialized,
            }
        )


logger = logging.getLogger(__name__)

class ContactCreateView(generics.CreateAPIView):
    serializer_class = ContactCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):

        logger.debug(f"Payload: {request.data}")

        serializer = self.get_serializer(data=request.data)
        
        if not serializer.is_valid():
            logger.error(f"Validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        serializer.is_valid(raise_exception=True)
        contact = serializer.save()

        user_data = UserSerializer(contact.contact).data
        user_data["is_contact"] = True

        return Response(user_data, status=status.HTTP_201_CREATED)