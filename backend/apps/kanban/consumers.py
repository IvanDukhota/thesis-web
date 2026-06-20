from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from apps.projects.models import ProjectMember


class KanbanConsumer(AsyncJsonWebsocketConsumer):

    async def connect(self):
        user = self.scope.get("user")

        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        self.user = user
        self.project_id = self.scope["url_route"]["kwargs"]["project_id"]
        self.group_name = f"kanban_{self.project_id}"

        is_member = await self.check_membership()
        if not is_member:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        await self.send_json({"type": "kanban.connected", "project_id": str(self.project_id)})

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        if content.get("type") == "ping":
            await self.send_json({"type": "pong"})

    async def kanban_event(self, event):
        await self.send_json(event["payload"])

    @database_sync_to_async
    def check_membership(self):
        return ProjectMember.objects.filter(
            project_id=self.project_id, user=self.user
        ).exists()
