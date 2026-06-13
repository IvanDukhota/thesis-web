from django.contrib import admin
from .models import Team, TeamMember, TeamRole

admin.site.register(Team)
admin.site.register(TeamRole)
admin.site.register(TeamMember)
