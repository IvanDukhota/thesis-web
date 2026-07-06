from django.urls import path
from .views import TeamCreateView, TeamDetailView, TeamMemberDetailView, TeamMyView, TeamRoleView, TeamRoleDetailView

urlpatterns = [
    path('', TeamCreateView.as_view(), name='team-create'),
    path('my/', TeamMyView.as_view(), name='team-my'),
    path('<uuid:pk>/', TeamDetailView.as_view(), name='team-detail'),
    path('<uuid:pk>/roles/', TeamRoleView.as_view(), name='team-roles'),
    path('<uuid:team_pk>/roles/<uuid:role_pk>/', TeamRoleDetailView.as_view(), name='team-role-detail'),
    path('<uuid:team_pk>/members/<uuid:member_pk>/', TeamMemberDetailView.as_view(), name='team-member-detail'),
]
