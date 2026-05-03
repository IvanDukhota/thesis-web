from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ChatViewSet, DirectChatView

router = DefaultRouter()
router.register("", ChatViewSet, basename="chat")

urlpatterns = [
    path("direct/", DirectChatView.as_view(), name="direct-chat"),
]

urlpatterns += router.urls