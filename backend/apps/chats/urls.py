from django.urls import path

from apps.messages.views import MessageCreateView

from .views import ChatDetailView, ChatListView, GroupChatCreateView, ChatStatsView, ChatDeleteView, ChatLeaveView, ChatMemberAddView, ChatMemberRemoveView

urlpatterns = [
    path("", ChatListView.as_view(), name="chat-list"),
    path("groups/create/", GroupChatCreateView.as_view(), name="group-chat-create"),
    path("<uuid:chat_id>/", ChatDetailView.as_view(), name="chat-detail"),
    path("<uuid:chat_id>/stats/", ChatStatsView.as_view(), name="chat-stats"),
    path("<uuid:chat_id>/delete/", ChatDeleteView.as_view(), name="chat-delete"),
    path("<uuid:chat_id>/leave/", ChatLeaveView.as_view(), name="chat-leave"),
    path("<uuid:chat_id>/members/", ChatMemberAddView.as_view(), name="chat-member-add"),
    path("<uuid:chat_id>/members/<int:user_id>/", ChatMemberRemoveView.as_view(), name="chat-member-remove"),
    path("<uuid:chat_id>/messages/", MessageCreateView.as_view(), name="message-create"),
]