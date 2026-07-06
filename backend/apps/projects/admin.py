from django.contrib import admin
from .models import Project, ProjectMember, ProjectRole

admin.site.register(Project)
admin.site.register(ProjectRole)
admin.site.register(ProjectMember)
