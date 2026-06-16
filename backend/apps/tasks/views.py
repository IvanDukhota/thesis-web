from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.projects.models import Project, ProjectMember
from .models import Task
from .serializers import TaskSerializer


def _get_project_and_member(project_pk, user):
    try:
        project = Project.objects.get(pk=project_pk)
    except Project.DoesNotExist:
        return None, None
    member = ProjectMember.objects.select_related('role').filter(
        project=project, user=user
    ).first()
    return project, member


class TaskListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        project, member = _get_project_and_member(pk, request.user)
        if not project or not member:
            return Response(status=status.HTTP_403_FORBIDDEN)
        tasks = Task.objects.filter(project=project)
        return Response(TaskSerializer(tasks, many=True).data)

    def post(self, request, pk):
        project, member = _get_project_and_member(pk, request.user)
        if not project or not member:
            return Response(status=status.HTTP_403_FORBIDDEN)
        if not member.role or not (member.role.is_owner or member.role.can_create):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = TaskSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        task = serializer.save(project=project, created_by=request.user)
        return Response(TaskSerializer(task).data, status=status.HTTP_201_CREATED)


class TaskDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get(self, request, pk, task_pk):
        project, member = _get_project_and_member(pk, request.user)
        if not project or not member:
            return None, None, None
        try:
            task = Task.objects.get(pk=task_pk, project=project)
        except Task.DoesNotExist:
            return None, None, None
        return project, member, task

    def patch(self, request, pk, task_pk):
        project, member, task = self._get(request, pk, task_pk)
        if not task:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if not member.role or not (member.role.is_owner or member.role.can_edit):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = TaskSerializer(task, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk, task_pk):
        project, member, task = self._get(request, pk, task_pk)
        if not task:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if not member.role or not (member.role.is_owner or member.role.can_delete):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        task.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
