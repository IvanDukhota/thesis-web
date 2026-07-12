from django.db import transaction
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.projects.models import ProjectMember
from .models import Team, TeamMember, TeamRole
from .serializers import TeamCreateSerializer, TeamMemberSerializer, TeamRoleSerializer, TeamSerializer, TeamUpdateSerializer


class TeamCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = TeamCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        team = serializer.save(created_by=request.user)

        admin_role = TeamRole.objects.create(
            team=team,
            name='Admin',
            is_admin=True,
            can_view=True,
            can_create_projects=True,
            can_edit_team=True,
            can_manage_settings=True,
            can_delete=True,
        )
        TeamRole.objects.create(
            team=team,
            name='Member',
            is_admin=False,
            can_view=True,
        )
        TeamMember.objects.create(team=team, user=request.user, role=admin_role)

        team = Team.objects.prefetch_related('members__user', 'members__role', 'roles').get(pk=team.pk)
        return Response(TeamSerializer(team).data, status=status.HTTP_201_CREATED)


class TeamMyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        membership = TeamMember.objects.select_related('team').filter(user=request.user).first()
        if not membership:
            return Response(status=status.HTTP_404_NOT_FOUND)
        team = Team.objects.prefetch_related('members__user', 'members__role', 'roles').get(pk=membership.team_id)
        return Response(TeamSerializer(team).data)


class TeamDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get_team_and_member(self, request, pk):
        try:
            team = Team.objects.prefetch_related('members__user', 'members__role', 'roles').get(pk=pk)
        except Team.DoesNotExist:
            return None, None
        member = TeamMember.objects.select_related('role').filter(team=team, user=request.user).first()
        return team, member

    def get(self, request, pk):
        team, member = self._get_team_and_member(request, pk)
        if not team or not member:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(TeamSerializer(team).data)

    def patch(self, request, pk):
        team, member = self._get_team_and_member(request, pk)
        if not team or not member:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if not member.role or not (member.role.is_admin or member.role.can_edit_team):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = TeamUpdateSerializer(team, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        team.refresh_from_db()
        team = Team.objects.prefetch_related('members__user', 'members__role', 'roles').get(pk=team.pk)
        return Response(TeamSerializer(team).data)

    def delete(self, request, pk):
        team, member = self._get_team_and_member(request, pk)
        if not team or not member:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if not member.role or not member.role.is_admin:
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        team.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TeamRoleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            team = Team.objects.get(pk=pk)
        except Team.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        member = TeamMember.objects.select_related('role').filter(team=team, user=request.user).first()
        if not member or not member.role or not (member.role.is_admin or member.role.can_manage_settings):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = TeamRoleSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        role = serializer.save(team=team)
        return Response(TeamRoleSerializer(role).data, status=status.HTTP_201_CREATED)


class TeamMemberDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get(self, request, team_pk, member_pk):
        try:
            team = Team.objects.get(pk=team_pk)
            target = TeamMember.objects.select_related('role', 'user').get(pk=member_pk, team=team)
        except (Team.DoesNotExist, TeamMember.DoesNotExist):
            return None, None, None
        requester = TeamMember.objects.select_related('role').filter(team=team, user=request.user).first()
        return team, target, requester

    def patch(self, request, team_pk, member_pk):
        team, target, requester = self._get(request, team_pk, member_pk)
        if not team or not target:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if not requester or not requester.role or not (requester.role.is_admin or requester.role.can_manage_settings):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        role_id = request.data.get('role_id')
        if not role_id:
            return Response({'detail': 'role_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            role = TeamRole.objects.get(pk=role_id, team=team)
        except TeamRole.DoesNotExist:
            return Response({'detail': 'Role not found.'}, status=status.HTTP_404_NOT_FOUND)
        target.role = role
        target.save()
        return Response(TeamMemberSerializer(target).data)

    def delete(self, request, team_pk, member_pk):
        team, target, requester = self._get(request, team_pk, member_pk)
        if not team or not target:
            return Response(status=status.HTTP_404_NOT_FOUND)
        is_self = requester and requester.pk == target.pk
        if not is_self:
            if not requester or not requester.role or not (requester.role.is_admin or requester.role.can_manage_settings):
                return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        if target.role and target.role.is_admin:
            return Response({'detail': 'Cannot remove an admin from the team.'}, status=status.HTTP_400_BAD_REQUEST)
        user_to_remove = target.user
        team = target.team
        target.delete()
        ProjectMember.objects.filter(project__team=team, user=user_to_remove).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TeamRoleDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get(self, request, team_pk, role_pk):
        try:
            team = Team.objects.get(pk=team_pk)
            role = TeamRole.objects.get(pk=role_pk, team=team)
        except (Team.DoesNotExist, TeamRole.DoesNotExist):
            return None, None, None
        member = TeamMember.objects.select_related('role').filter(team=team, user=request.user).first()
        return team, role, member

    def patch(self, request, team_pk, role_pk):
        team, role, member = self._get(request, team_pk, role_pk)
        if not team or not role:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if not member or not member.role or not (member.role.is_admin or member.role.can_manage_settings):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        if role.is_admin:
            return Response({'detail': 'Cannot modify Admin role.'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = TeamRoleSerializer(role, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, team_pk, role_pk):
        team, role, member = self._get(request, team_pk, role_pk)
        if not team or not role:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if not member or not member.role or not (member.role.is_admin or member.role.can_manage_settings):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        if role.is_admin:
            return Response({'detail': 'Cannot delete Admin role.'}, status=status.HTTP_400_BAD_REQUEST)
        role.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
