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


class ApplicantStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        project_ids = ProjectMember.objects.filter(user=user).values_list('project_id', flat=True)
        tasks = Task.objects.filter(assignee=user.username, project_id__in=project_ids)
        projects = Project.objects.filter(id__in=project_ids).order_by('-created_at')

        return Response({
            'projects_count': projects.count(),
            'recent_projects': [
                {'id': str(p.id), 'name': p.name, 'type': p.type}
                for p in projects[:4]
            ],
            'tasks': {
                'total': tasks.count(),
                'finished': tasks.filter(column='Finished').count(),
                'in_progress': tasks.filter(column='In Progress').count(),
            },
        })


class PublicTeamStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, team_id):
        from apps.teams.models import Team
        try:
            team = Team.objects.get(pk=team_id)
        except Team.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        members_qs = TeamMember.objects.filter(team_id=team_id).select_related('user')
        tasks = Task.objects.filter(project__team_id=team_id)
        projects = Project.objects.filter(team_id=team_id).order_by('-created_at')

        member_list = []
        for m in members_qs:
            member_list.append({
                'username': m.user.username,
                'tasks_completed': tasks.filter(assignee=m.user.username, column='Finished').count(),
            })
        member_list.sort(key=lambda x: x['tasks_completed'], reverse=True)

        return Response({
            'team_name': team.name,
            'team_description': team.description,
            'members_count': members_qs.count(),
            'projects_count': projects.count(),
            'recent_projects': [
                {'id': str(p.id), 'name': p.name}
                for p in projects[:4]
            ],
            'tasks': {
                'total': tasks.count(),
                'finished': tasks.filter(column='Finished').count(),
                'in_progress': tasks.filter(column='In Progress').count(),
            },
            'members': member_list[:6],
        })
