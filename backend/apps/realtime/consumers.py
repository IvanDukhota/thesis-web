from channels.generic.websocket import AsyncJsonWebsocketConsumer


class AppConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")

        await self.accept()
        
        if not user or not user.is_authenticated:
            await self.send_json(
                {
                    "type": "auth.error",
                    "message": "Access token is invalid or expired.",
                }
            )
            await self.close(code=4001)
            return

        self.user = user
        self.user_group_name = f"user_{self.user.id}"

        await self.channel_layer.group_add(self.user_group_name, self.channel_name)

        await self.send_json(
            {
                "type": "connection.established",
                "message": "Connected to global user channel",
                "user_id": self.user.id,
            }
        )

    async def disconnect(self, close_code):
        user = getattr(self, "user", None)

        if user and user.is_authenticated:
            await self.channel_layer.group_discard(self.user_group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        event_type = content.get("type")

        if event_type == "ping":
            await self.send_json({"type": "pong"})
            return

    async def app_event(self, event):
        await self.send_json(event["payload"])