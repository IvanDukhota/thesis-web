from rest_framework import permissions, viewsets

from .models import Chat
from .serializers import ChatSerializer


class ChatViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ChatSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return (
            Chat.objects.filter(members__user=user, members__is_active=True, is_active=True)
            .select_related("created_by")
            .prefetch_related("members", "members__user")
            .distinct()
        )