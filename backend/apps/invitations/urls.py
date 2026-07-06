from django.urls import path
from .views import InvitationAcceptView, InvitationDeclineView, InvitationListCreateView

urlpatterns = [
    path('', InvitationListCreateView.as_view(), name='invitation-list-create'),
    path('<uuid:pk>/accept/', InvitationAcceptView.as_view(), name='invitation-accept'),
    path('<uuid:pk>/decline/', InvitationDeclineView.as_view(), name='invitation-decline'),
]
