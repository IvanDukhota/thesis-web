from django.contrib.auth import get_user_model
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.teams.models import Team, TeamMember, TeamRole
from apps.teams.serializers import TeamMemberSerializer
from .models import TeamInvitation
from .serializers import TeamInvitationSerializer

User = get_user_model()


class InvitationListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        invitations = TeamInvitation.objects.select_related(
            'team', 'invited_by'
        ).filter(invited_user=request.user, status=TeamInvitation.Status.PENDING)
        return Response(TeamInvitationSerializer(invitations, many=True).data)

    def post(self, request):
        team_id = request.data.get('team_id')
        invited_user_id = request.data.get('invited_user_id')

        if not team_id or not invited_user_id:
            return Response({'detail': 'team_id and invited_user_id are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            team = Team.objects.get(pk=team_id)
        except Team.DoesNotExist:
            return Response({'detail': 'Team not found.'}, status=status.HTTP_404_NOT_FOUND)

        requester = TeamMember.objects.select_related('role').filter(team=team, user=request.user).first()
        if not requester or not requester.role or not (requester.role.is_admin or requester.role.can_manage_settings):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            invited_user = User.objects.get(pk=invited_user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if invited_user == request.user:
            return Response({'detail': 'Cannot invite yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        if TeamMember.objects.filter(team=team, user=invited_user).exists():
            return Response({'detail': 'User is already a member of this team.'}, status=status.HTTP_400_BAD_REQUEST)

        if TeamInvitation.objects.filter(team=team, invited_user=invited_user, status=TeamInvitation.Status.PENDING).exists():
            return Response({'detail': 'Invitation already sent.'}, status=status.HTTP_400_BAD_REQUEST)

        TeamInvitation.objects.filter(team=team, invited_user=invited_user).delete()
        invitation = TeamInvitation.objects.create(team=team, invited_user=invited_user, invited_by=request.user)
        return Response(TeamInvitationSerializer(invitation).data, status=status.HTTP_201_CREATED)


class InvitationAcceptView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            invitation = TeamInvitation.objects.select_related('team').get(
                pk=pk, invited_user=request.user, status=TeamInvitation.Status.PENDING
            )
        except TeamInvitation.DoesNotExist:
            return Response({'detail': 'Invitation not found.'}, status=status.HTTP_404_NOT_FOUND)

        if TeamMember.objects.filter(team=invitation.team, user=request.user).exists():
            invitation.status = TeamInvitation.Status.ACCEPTED
            invitation.save()
            return Response({'detail': 'Already a member.'})

        member_role = TeamRole.objects.filter(team=invitation.team, name='Member').first()
        TeamMember.objects.create(team=invitation.team, user=request.user, role=member_role)
        invitation.status = TeamInvitation.Status.ACCEPTED
        invitation.save()
        return Response({'detail': 'Accepted.'})


class InvitationDeclineView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            invitation = TeamInvitation.objects.get(
                pk=pk, invited_user=request.user, status=TeamInvitation.Status.PENDING
            )
        except TeamInvitation.DoesNotExist:
            return Response({'detail': 'Invitation not found.'}, status=status.HTTP_404_NOT_FOUND)

        invitation.status = TeamInvitation.Status.DECLINED
        invitation.save()
        return Response({'detail': 'Declined.'})
