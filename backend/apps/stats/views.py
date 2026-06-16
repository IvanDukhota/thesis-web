from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.teams.models import TeamMember
from apps.projects.models import Project, ProjectMember
from apps.tasks.models import Task


class PersonalStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        username = request.user.username
        project_ids = ProjectMember.objects.filter(user=request.user).values_list('project_id', flat=True)
        tasks = Task.objects.filter(assignee=username, project_id__in=project_ids)

        return Response({
            'tasks': {
                'total': tasks.count(),
                'finished': tasks.filter(column='Finished').count(),
                'in_progress': tasks.filter(column='In Progress').count(),
                'testing': tasks.filter(column='Testing').count(),
                'to_do': tasks.filter(column='To Do').count(),
            },
            'projects': project_ids.count(),
            'teams': TeamMember.objects.filter(user=request.user).count(),
        })


class TeamStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, team_id):
        if not TeamMember.objects.filter(team_id=team_id, user=request.user).exists():
            return Response(status=status.HTTP_403_FORBIDDEN)

        tasks = Task.objects.filter(project__team_id=team_id)
        total = tasks.count()

        members_qs = TeamMember.objects.filter(team_id=team_id).select_related('user')
        member_stats = []
        for m in members_qs:
            username = m.user.username
            assigned = tasks.filter(assignee=username).count()
            completed = tasks.filter(assignee=username, column='Finished').count()
            member_stats.append({
                'username': username,
                'assigned': assigned,
                'completed': completed,
            })
        member_stats.sort(key=lambda x: x['completed'], reverse=True)

        return Response({
            'projects_count': Project.objects.filter(team_id=team_id).count(),
            'tasks': {
                'total': total,
                'finished': tasks.filter(column='Finished').count(),
                'in_progress': tasks.filter(column='In Progress').count(),
                'testing': tasks.filter(column='Testing').count(),
                'to_do': tasks.filter(column='To Do').count(),
            },
            'members': member_stats,
        })
