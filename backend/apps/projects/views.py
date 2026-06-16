from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.teams.models import TeamMember
from apps.notifications.models import Notification
from .models import Project, ProjectMember, ProjectRole
from .serializers import ProjectCreateSerializer, ProjectMemberSerializer, ProjectRoleSerializer, ProjectSerializer

User = get_user_model()


def _role_info(member):
    if not member or not member.role:
        return {'is_owner': False, 'can_view': True, 'can_create': False, 'can_edit': False, 'can_delete': False}
    r = member.role
    return {
        'is_owner': r.is_owner, 'can_view': r.can_view,
        'can_create': r.can_create, 'can_edit': r.can_edit, 'can_delete': r.can_delete,
    }


def _prefetch_project(pk):
    return Project.objects.prefetch_related(
        'project_members__user', 'project_members__role', 'roles'
    ).get(pk=pk)


class ProjectListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        team_id = request.query_params.get('team')
        if team_id:
            if not TeamMember.objects.filter(team_id=team_id, user=request.user).exists():
                return Response(status=status.HTTP_403_FORBIDDEN)
            projects = Project.objects.filter(team_id=team_id).prefetch_related(
                'project_members__user', 'project_members__role', 'roles')
        else:
            pids = ProjectMember.objects.filter(user=request.user).values_list('project_id', flat=True)
            projects = Project.objects.filter(id__in=pids).prefetch_related(
                'project_members__user', 'project_members__role', 'roles')
        return Response(ProjectSerializer(projects, many=True).data)

    @transaction.atomic
    def post(self, request):
        serializer = ProjectCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        member_ids = serializer.validated_data.pop('member_ids', [])

        if serializer.validated_data.get('type') == Project.TEAM:
            team = serializer.validated_data['team']
            membership = TeamMember.objects.select_related('role').filter(
                team=team, user=request.user).first()
            if not membership:
                return Response({'detail': 'You are not a member of this team.'},
                                status=status.HTTP_403_FORBIDDEN)
            if not membership.role or not (membership.role.is_admin or membership.role.can_create_projects):
                return Response({'detail': 'You do not have permission to create team projects.'},
                                status=status.HTTP_403_FORBIDDEN)

        project = serializer.save(created_by=request.user)

        owner_role = ProjectRole.objects.create(
            project=project, name='Owner', is_owner=True,
            can_view=True, can_create=True, can_edit=True, can_delete=True,
        )
        developer_role = ProjectRole.objects.create(
            project=project, name='Developer', is_owner=False,
            can_view=True, can_create=False, can_edit=False, can_delete=False,
        )

        ProjectMember.objects.create(project=project, user=request.user, role=owner_role)

        for uid in member_ids:
            try:
                user = User.objects.get(pk=uid)
                if user != request.user:
                    ProjectMember.objects.get_or_create(
                        project=project, user=user, defaults={'role': developer_role})
            except User.DoesNotExist:
                pass

        project = _prefetch_project(project.pk)
        return Response(ProjectSerializer(project).data, status=status.HTTP_201_CREATED)


class ProjectDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get(self, request, pk):
        try:
            project = _prefetch_project(pk)
        except Project.DoesNotExist:
            return None, status.HTTP_404_NOT_FOUND
        if not ProjectMember.objects.filter(project=project, user=request.user).exists():
            return None, status.HTTP_403_FORBIDDEN
        return project, None

    def _my(self, project, user):
        return ProjectMember.objects.select_related('role').filter(project=project, user=user).first()

    def get(self, request, pk):
        project, err = self._get(request, pk)
        if not project:
            return Response(status=err)
        data = ProjectSerializer(project).data
        data['my_role'] = _role_info(self._my(project, request.user))
        return Response(data)

    def patch(self, request, pk):
        project, _ = self._get(request, pk)
        if not project:
            return Response(status=status.HTTP_404_NOT_FOUND)
        my = self._my(project, request.user)
        if not my or not my.role or not (my.role.is_owner or my.role.can_edit):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = ProjectSerializer(project, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        project = _prefetch_project(project.pk)
        data = ProjectSerializer(project).data
        data['my_role'] = _role_info(my)
        return Response(data)

    def delete(self, request, pk):
        project, _ = self._get(request, pk)
        if not project:
            return Response(status=status.HTTP_404_NOT_FOUND)
        my = self._my(project, request.user)
        if not my or not my.role or not my.role.is_owner:
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        project.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectMemberListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get_project_and_my(self, pk, user):
        try:
            project = Project.objects.get(pk=pk)
        except Project.DoesNotExist:
            return None, None
        my = ProjectMember.objects.select_related('role').filter(project=project, user=user).first()
        if not my:
            return None, None
        return project, my

    def get(self, request, pk):
        project, _ = self._get_project_and_my(pk, request.user)
        if not project:
            return Response(status=status.HTTP_404_NOT_FOUND)
        members = ProjectMember.objects.filter(project=project).select_related('user', 'role')
        return Response(ProjectMemberSerializer(members, many=True).data)

    def post(self, request, pk):
        project, my = self._get_project_and_my(pk, request.user)
        if not project:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if not my.role or not (my.role.is_owner or my.role.can_edit):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'detail': 'user_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        developer_role = ProjectRole.objects.filter(project=project, name='Developer').first()
        pm, created = ProjectMember.objects.get_or_create(
            project=project, user=user, defaults={'role': developer_role}
        )
        if created:
            Notification.objects.create(
                user=user,
                type='project_added',
                title='Added to project',
                body=f'You have been added to "{project.name}"',
                project=project,
            )
        return Response(
            ProjectMemberSerializer(pm).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class ProjectMemberDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get(self, request, pk, member_pk):
        try:
            project = Project.objects.get(pk=pk)
            target = ProjectMember.objects.select_related('role', 'user').get(pk=member_pk, project=project)
        except (Project.DoesNotExist, ProjectMember.DoesNotExist):
            return None, None, None
        my = ProjectMember.objects.select_related('role').filter(project=project, user=request.user).first()
        return project, target, my

    def patch(self, request, pk, member_pk):
        project, target, my = self._get(request, pk, member_pk)
        if not project or not target:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if not my or not my.role or not my.role.is_owner:
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        role_id = request.data.get('role_id')
        if not role_id:
            return Response({'detail': 'role_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            role = ProjectRole.objects.get(pk=role_id, project=project)
        except ProjectRole.DoesNotExist:
            return Response({'detail': 'Role not found.'}, status=status.HTTP_404_NOT_FOUND)
        target.role = role
        target.save()
        return Response(ProjectMemberSerializer(target).data)

    def delete(self, request, pk, member_pk):
        project, target, my = self._get(request, pk, member_pk)
        if not project or not target:
            return Response(status=status.HTTP_404_NOT_FOUND)
        is_self = my and my.pk == target.pk
        if not is_self:
            if not my or not my.role or not my.role.is_owner:
                return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        if target.role and target.role.is_owner:
            if ProjectMember.objects.filter(project=project, role__is_owner=True).count() <= 1:
                return Response({'detail': 'Cannot remove the only project owner.'},
                                status=status.HTTP_400_BAD_REQUEST)
        target.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProjectRoleListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _my(self, project, user):
        return ProjectMember.objects.select_related('role').filter(project=project, user=user).first()

    def get(self, request, pk):
        try:
            project = Project.objects.get(pk=pk)
        except Project.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if not self._my(project, request.user):
            return Response(status=status.HTTP_403_FORBIDDEN)
        return Response(ProjectRoleSerializer(project.roles.all(), many=True).data)

    def post(self, request, pk):
        try:
            project = Project.objects.get(pk=pk)
        except Project.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        my = self._my(project, request.user)
        if not my or not my.role or not my.role.is_owner:
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = ProjectRoleSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        role = serializer.save(project=project)
        return Response(ProjectRoleSerializer(role).data, status=status.HTTP_201_CREATED)


class ProjectRoleDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get(self, request, pk, role_pk):
        try:
            project = Project.objects.get(pk=pk)
            role = ProjectRole.objects.get(pk=role_pk, project=project)
        except (Project.DoesNotExist, ProjectRole.DoesNotExist):
            return None, None, None
        my = ProjectMember.objects.select_related('role').filter(project=project, user=request.user).first()
        return project, role, my

    def patch(self, request, pk, role_pk):
        project, role, my = self._get(request, pk, role_pk)
        if not project or not role:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if not my or not my.role or not my.role.is_owner:
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        if role.is_owner:
            return Response({'detail': 'Cannot modify Owner role.'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = ProjectRoleSerializer(role, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk, role_pk):
        project, role, my = self._get(request, pk, role_pk)
        if not project or not role:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if not my or not my.role or not my.role.is_owner:
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        if role.is_owner:
            return Response({'detail': 'Cannot delete Owner role.'}, status=status.HTTP_400_BAD_REQUEST)
        role.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
