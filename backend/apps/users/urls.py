from django.contrib.auth import get_user_model
from django.urls import path
from rest_framework import status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import ContactCreateView, ContactListView, ContactsWithoutChatsView, MeView, RegisterView, UserDirectoryView, UserSearchView


class SafeTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        try:
            return super().post(request, *args, **kwargs)
        except get_user_model().DoesNotExist:
            return Response(
                {"detail": "Token is invalid or expired."},
                status=status.HTTP_401_UNAUTHORIZED,
            )


urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path("refresh/", SafeTokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("directory/", UserDirectoryView.as_view(), name="user-directory"),
    path("contacts/", ContactListView.as_view(), name="contact-list"),
    path("contacts/create/", ContactCreateView.as_view(), name="contact-create"),
    path("contacts-without-chats/", ContactsWithoutChatsView.as_view(), name="contacts-without-chats"),
    path("search/", UserSearchView.as_view(), name="user-search"),
]