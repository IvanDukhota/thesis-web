from django.urls import path
from .views import PersonalStatsView, TeamStatsView

urlpatterns = [
    path('personal/', PersonalStatsView.as_view(), name='personal-stats'),
    path('team/<uuid:team_id>/', TeamStatsView.as_view(), name='team-stats'),
]
