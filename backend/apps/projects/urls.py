from django.urls import path
from .views import (
    ProjectListCreateView, ProjectDetailView,
    ProjectMemberListView, ProjectMemberDetailView,
    ProjectRoleListView, ProjectRoleDetailView,
    ProjectAbandonView,
)
from apps.tasks.views import TaskListCreateView, TaskDetailView, TaskFileListView, TaskFileDetailView

urlpatterns = [
    path('', ProjectListCreateView.as_view(), name='project-list-create'),
    path('<uuid:pk>/', ProjectDetailView.as_view(), name='project-detail'),
    path('<uuid:pk>/abandon/', ProjectAbandonView.as_view(), name='project-abandon'),
    path('<uuid:pk>/members/', ProjectMemberListView.as_view(), name='project-members'),
    path('<uuid:pk>/members/<uuid:member_pk>/', ProjectMemberDetailView.as_view(), name='project-member-detail'),
    path('<uuid:pk>/roles/', ProjectRoleListView.as_view(), name='project-roles'),
    path('<uuid:pk>/roles/<uuid:role_pk>/', ProjectRoleDetailView.as_view(), name='project-role-detail'),
    path('<uuid:pk>/tasks/', TaskListCreateView.as_view(), name='project-tasks'),
    path('<uuid:pk>/tasks/<uuid:task_pk>/', TaskDetailView.as_view(), name='project-task-detail'),
    path('<uuid:pk>/tasks/<uuid:task_pk>/files/', TaskFileListView.as_view(), name='task-files'),
    path('<uuid:pk>/tasks/<uuid:task_pk>/files/<uuid:file_pk>/', TaskFileDetailView.as_view(), name='task-file-detail'),
]
