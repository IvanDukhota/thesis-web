from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

import logging

from .models import UserContact
from .serializers import (
    ContactCreateSerializer,
    ProfileUpdateSerializer,
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
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = ProfileUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user, context={'request': request}).data)


class UserDirectoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        current_user = request.user

        contact_ids = list(
            UserContact.objects.filter(owner=current_user).values_list("contact_id", flat=True)
        )

        contacts = User.objects.filter(id__in=contact_ids).order_by("username")
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


class ContactListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        contact_ids = list(user.contacts.values_list('contact_id', flat=True))
        logger.debug(f"User {user.id} has contact_ids: {contact_ids}")

        contacts = User.objects.filter(id__in=contact_ids).order_by("username")
        logger.debug(f"Found {contacts.count()} contacts")

        serialized = UserSerializer(contacts, many=True, context={'request': request}).data
        logger.debug(f"Serialized data: {serialized}")

        return Response(serialized)


class UserSearchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        username = request.query_params.get('username', '').strip()
        if not username:
            return Response({'detail': 'username is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(username__iexact=username)
        except User.DoesNotExist:
            return Response({'detail': 'No user with this username.'}, status=status.HTTP_404_NOT_FOUND)
        if user == request.user:
            return Response({'detail': 'No user with this username.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({'id': user.id, 'username': user.username, 'avatar': user.avatar.url if user.avatar else None})


class ContactsWithoutChatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.chats.models import Chat
        from apps.chats.services import build_direct_key

        user = request.user

        contacts = User.objects.filter(
            id__in=user.contacts.values_list('contact_id', flat=True)
        )

        existing_direct_keys = set(
            Chat.objects.filter(
                type=Chat.ChatType.DIRECT,
                members__user=user,
                members__is_active=True,
                is_active=True,
            ).values_list('direct_key', flat=True)
        )

        contacts_without_chats = []
        for contact in contacts:
            direct_key = build_direct_key(user.id, contact.id)
            if direct_key not in existing_direct_keys:
                contacts_without_chats.append({
                    "id": contact.id,
                    "email": contact.email,
                    "full_name": contact.full_name,
                    "avatar": contact.avatar.url if contact.avatar else None,
                })

        return Response(contacts_without_chats)