from django.urls import path
from .views import PersonalStatsView, TeamStatsView, ApplicantStatsView, PublicTeamStatsView

urlpatterns = [
    path('personal/', PersonalStatsView.as_view(), name='personal-stats'),
    path('team/<uuid:team_id>/', TeamStatsView.as_view(), name='team-stats'),
    path('user/<int:user_id>/', ApplicantStatsView.as_view(), name='applicant-stats'),
    path('public-team/<uuid:team_id>/', PublicTeamStatsView.as_view(), name='public-team-stats'),
]
