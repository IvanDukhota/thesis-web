import json

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.core.serializers.json import DjangoJSONEncoder
from rest_framework import permissions, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.projects.models import Project, ProjectMember
from .models import Task, TaskFile
from .serializers import TaskSerializer, TaskFileSerializer


def _broadcast_kanban(project_id, payload):
    layer = get_channel_layer()
    if layer:
        safe_payload = json.loads(json.dumps(payload, cls=DjangoJSONEncoder))
        async_to_sync(layer.group_send)(
            f"kanban_{project_id}",
            {"type": "kanban_event", "payload": safe_payload},
        )


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
        task_data = TaskSerializer(task).data
        _broadcast_kanban(pk, {
            "type": "task.created",
            "task": task_data,
            "user_id": request.user.id,
        })
        return Response(task_data, status=status.HTTP_201_CREATED)


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
        _broadcast_kanban(pk, {
            "type": "task.updated",
            "task": serializer.data,
            "user_id": request.user.id,
        })
        return Response(serializer.data)

    def delete(self, request, pk, task_pk):
        project, member, task = self._get(request, pk, task_pk)
        if not task:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if not member.role or not (member.role.is_owner or member.role.can_delete):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        task_id = str(task.id)
        task.delete()
        _broadcast_kanban(pk, {
            "type": "task.deleted",
            "task_id": task_id,
            "user_id": request.user.id,
        })
        return Response(status=status.HTTP_204_NO_CONTENT)


class TaskFileListView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request, pk, task_pk):
        project, member = _get_project_and_member(pk, request.user)
        if not project or not member:
            return Response(status=status.HTTP_403_FORBIDDEN)
        if not member.role or not (member.role.is_owner or member.role.can_edit):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            task = Task.objects.get(pk=task_pk, project=project)
        except Task.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        task_file = TaskFile.objects.create(task=task, file=file, original_name=file.name, uploaded_by=request.user)
        return Response(TaskFileSerializer(task_file).data, status=status.HTTP_201_CREATED)


class TaskFileDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def patch(self, request, pk, task_pk, file_pk):
        project, member = _get_project_and_member(pk, request.user)
        if not project or not member:
            return Response(status=status.HTTP_403_FORBIDDEN)
        if not member.role or not (member.role.is_owner or member.role.can_edit):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            task = Task.objects.get(pk=task_pk, project=project)
            task_file = TaskFile.objects.get(pk=file_pk, task=task)
        except (Task.DoesNotExist, TaskFile.DoesNotExist):
            return Response(status=status.HTTP_404_NOT_FOUND)
        file = request.FILES.get('file')
        if not file:
            return Response({'detail': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        task_file.file.delete(save=False)
        task_file.file = file
        new_name = request.data.get('original_name')
        if new_name:
            task_file.original_name = new_name
        task_file.save()
        return Response(TaskFileSerializer(task_file).data)

    def delete(self, request, pk, task_pk, file_pk):
        project, member = _get_project_and_member(pk, request.user)
        if not project or not member:
            return Response(status=status.HTTP_403_FORBIDDEN)
        if not member.role or not (member.role.is_owner or member.role.can_edit):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            task = Task.objects.get(pk=task_pk, project=project)
            task_file = TaskFile.objects.get(pk=file_pk, task=task)
        except (Task.DoesNotExist, TaskFile.DoesNotExist):
            return Response(status=status.HTTP_404_NOT_FOUND)
        task_file.file.delete(save=False)
        task_file.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
