from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import ContactCreateView, ContactListView, ContactsWithoutChatsView, MeView, RegisterView, UserDirectoryView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", TokenObtainPairView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("directory/", UserDirectoryView.as_view(), name="user-directory"),
    path("contacts/", ContactListView.as_view(), name="contact-list"),
    path("contacts/create/", ContactCreateView.as_view(), name="contact-create"),
    path("contacts-without-chats/", ContactsWithoutChatsView.as_view(), name="contacts-without-chats"),
]