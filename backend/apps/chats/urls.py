from django.urls import path

from .views import ChatDetailView, ChatListView, GroupChatCreateView

urlpatterns = [
    path("", ChatListView.as_view(), name="chat-list"),
    path("groups/create/", GroupChatCreateView.as_view(), name="group-chat-create"),
    path("<uuid:chat_id>/", ChatDetailView.as_view(), name="chat-detail"),
]