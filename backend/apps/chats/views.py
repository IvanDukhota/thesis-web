from django.contrib.auth import get_user_model
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.messages.serializers import MessageSerializer

from .models import Chat
from .serializers import ChatSerializer
from .services import get_direct_chat_between

User = get_user_model()


class ChatViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ChatSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        return (
            Chat.objects.filter(
                members__user=user,
                members__is_active=True,
                is_active=True,
            )
            .select_related("created_by")
            .prefetch_related("members", "members__user")
            .distinct()
        )


class DirectChatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user_id = request.query_params.get("user_id")

        if not user_id:
            return Response(
                {"detail": "user_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            other_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if other_user.id == request.user.id:
            return Response(
                {"detail": "You cannot open direct chat with yourself."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        chat = get_direct_chat_between(request.user, other_user)

        if not chat:
            return Response(
                {
                    "exists": False,
                    "chat": None,
                    "messages": [],
                }
            )

        messages = (
            chat.messages.select_related("sender")
            .prefetch_related("attachments")
            .filter(is_deleted=False)
            .order_by("sent_at")
        )

        return Response(
            {
                "exists": True,
                "chat": ChatSerializer(chat).data,
                "messages": MessageSerializer(messages, many=True).data,
            }
        )