from django.urls import re_path
from .consumers import KanbanConsumer

websocket_urlpatterns = [
    re_path(r"^ws/kanban/(?P<project_id>[0-9a-f-]+)/$", KanbanConsumer.as_asgi()),
]
