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

        self.active_chat_group_name = None
        self.active_chat_id = None

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

        user_group = getattr(self, "user_group_name", None)
        if user and user.is_authenticated and user_group:
            await self.channel_layer.group_discard(user_group, self.channel_name)

        active_chat = getattr(self, "active_chat_group_name", None)
        if active_chat:
            await self.channel_layer.group_discard(active_chat, self.channel_name)

    async def receive_json(self, content, **kwargs):
        event_type = content.get("type")

        if event_type == "ping":
            await self.send_json({"type": "pong"})
            return
        
        if event_type == "chat.open":
            await self.open_chat(content)
            return

        if event_type == "chat.close":
            await self.close_active_chat()
            return

        if event_type == "message.send":
            await self.send_message_to_active_chat(content)
            return

    async def open_chat(self, content):
        chat_type = content.get("chat_type")
        recipient_id = content.get("recipient_id")
        chat_id = content.get("chat_id")

        if chat_type == "direct":
            if not recipient_id:
                await self.send_json(
                    {
                        "type": "chat.error",
                        "message": "recipient_id is required for direct chat.",
                    }
                )
                return

            first_id = min(int(self.user.id), int(recipient_id))
            second_id = max(int(self.user.id), int(recipient_id))
            chat_id = f"direct_{first_id}_{second_id}"

        elif chat_type == "group":
            if not chat_id:
                await self.send_json(
                    {
                        "type": "chat.error",
                        "message": "chat_id is required for group chat.",
                    }
                )
                return

            chat_id = f"group_{chat_id}"

        else:
            await self.send_json(
                {
                    "type": "chat.error",
                    "message": "Unsupported chat_type.",
                }
            )
            return

        await self.subscribe_to_chat(chat_id)

        await self.send_json(
            {
                "type": "chat.opened",
                "chat_id": chat_id,
                "chat_type": chat_type,
            }
        )

    async def subscribe_to_chat(self, chat_id):
        if self.active_chat_group_name:
            await self.channel_layer.group_discard(self.active_chat_group_name, self.channel_name)

        self.active_chat_id = chat_id
        self.active_chat_group_name = f"chat_{chat_id}"

        await self.channel_layer.group_add(self.active_chat_group_name, self.channel_name)

    async def close_active_chat(self):
        if self.active_chat_group_name:
            await self.channel_layer.group_discard(self.active_chat_group_name, self.channel_name)

        self.active_chat_id = None
        self.active_chat_group_name = None

        await self.send_json(
            {
                "type": "chat.closed",
            }
        )

    async def send_message_to_active_chat(self, content):
        if not self.active_chat_group_name or not self.active_chat_id:
            await self.send_json(
                {
                    "type": "message.error",
                    "message": "No active chat selected.",
                }
            )
            return

        payload = content.get("payload", {})
        text = str(payload.get("text", "")).strip()
        client_id = payload.get("client_id")

        if not text:
            await self.send_json(
                {
                    "type": "message.error",
                    "message": "Message text is empty.",
                }
            )
            return

        event_payload = {
            "type": "message.created",
            "chat_id": self.active_chat_id,
            "payload": {
                "client_id": client_id,
                "text": text,
                "sender": {
                    "id": self.user.id,
                    "email": self.user.email,
                    "full_name": self.user.full_name,
                },
            },
        }

        await self.channel_layer.group_send(
            self.active_chat_group_name,
            {
                "type": "chat_message",
                "payload": event_payload,
            },
        )

    async def chat_message(self, event):
        await self.send_json(event["payload"])
        
    async def app_event(self, event):
        await self.send_json(event["payload"])