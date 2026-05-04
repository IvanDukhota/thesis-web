import json
from django.core.serializers.json import DjangoJSONEncoder

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth import get_user_model

from apps.chats.models import Chat
from apps.chats.services import get_direct_chat_between, get_or_create_direct_chat
from apps.messages.serializers import MessageSerializer
from apps.messages.services import create_text_message

User = get_user_model()


class AppConsumer(AsyncJsonWebsocketConsumer):
    @classmethod
    async def encode_json(cls, content):
        return json.dumps(content, cls=DjangoJSONEncoder)

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
        self.active_chat_type = None
        self.active_recipient_id = None

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
            await self.send_message(content)
            return

    async def open_chat(self, content):
        chat_type = content.get("chat_type")

        await self.close_active_chat(send_event=False)

        if chat_type == "direct":
            recipient_id = content.get("recipient_id")

            if not recipient_id:
                await self.send_json(
                    {
                        "type": "chat.error",
                        "message": "recipient_id is required for direct chat.",
                    }
                )
                return

            self.active_chat_type = Chat.ChatType.DIRECT
            self.active_recipient_id = int(recipient_id)

            chat_data = await self.get_existing_direct_chat(recipient_id)

            if chat_data:
                self.active_chat_id = str(chat_data["id"])
                await self.subscribe_to_chat(self.active_chat_id)

                await self.send_json(
                    {
                        "type": "chat.opened",
                        "exists": True,
                        "chat_id": self.active_chat_id,
                        "chat_type": "direct",
                    }
                )
            else:
                await self.send_json(
                    {
                        "type": "chat.opened",
                        "exists": False,
                        "chat_id": None,
                        "chat_type": "direct",
                    }
                )

            return

        if chat_type == "group":
            chat_id = content.get("chat_id")

            if not chat_id:
                await self.send_json(
                    {
                        "type": "chat.error",
                        "message": "chat_id is required for group chat.",
                    }
                )
                return

            self.active_chat_type = Chat.ChatType.GROUP
            self.active_chat_id = str(chat_id)

            await self.subscribe_to_chat(self.active_chat_id)

            await self.send_json(
                {
                    "type": "chat.opened",
                    "exists": True,
                    "chat_id": self.active_chat_id,
                    "chat_type": "group",
                }
            )

            return

        await self.send_json(
            {
                "type": "chat.error",
                "message": "Unsupported chat_type.",
            }
        )

    async def subscribe_to_chat(self, chat_id):
        if self.active_chat_group_name:
            await self.channel_layer.group_discard(self.active_chat_group_name, self.channel_name)

        self.active_chat_id = str(chat_id)
        self.active_chat_group_name = f"chat_{chat_id}"

        await self.channel_layer.group_add(self.active_chat_group_name, self.channel_name)

    async def close_active_chat(self, send_event=True):
        if self.active_chat_group_name:
            await self.channel_layer.group_discard(self.active_chat_group_name, self.channel_name)

        self.active_chat_group_name = None
        self.active_chat_id = None
        self.active_chat_type = None
        self.active_recipient_id = None

        if send_event:
            await self.send_json({"type": "chat.closed"})

    async def send_message(self, content):
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

        if self.active_chat_type == Chat.ChatType.DIRECT:
            if not self.active_recipient_id:
                await self.send_json(
                    {
                        "type": "message.error",
                        "message": "No direct recipient selected.",
                    }
                )
                return

            message_data = await self.create_direct_text_message(
                recipient_id=self.active_recipient_id,
                text=text,
                client_id=client_id,
            )

        elif self.active_chat_type == Chat.ChatType.GROUP:
            if not self.active_chat_id:
                await self.send_json(
                    {
                        "type": "message.error",
                        "message": "No group chat selected.",
                    }
                )
                return

            message_data = await self.create_group_text_message(
                chat_id=self.active_chat_id,
                text=text,
                client_id=client_id,
            )

        else:
            await self.send_json(
                {
                    "type": "message.error",
                    "message": "No active chat selected.",
                }
            )
            return

        chat_id = str(message_data["chat"])

        if self.active_chat_id != chat_id or not self.active_chat_group_name:
            await self.subscribe_to_chat(chat_id)

        await self.send_json(
            {
                "type": "chat.opened",
                "exists": True,
                "chat_id": chat_id,
                "chat_type": self.active_chat_type,
            }
        )

        await self.channel_layer.group_send(
            f"chat_{chat_id}",
            {
                "type": "chat_message",
                "payload": {
                    "type": "message.created",
                    "chat_id": chat_id,
                    "payload": message_data,
                },
            },
        )

        await self.notify_chat_members_about_message(message_data)

    async def chat_message(self, event):
        await self.send_json(event["payload"])

    async def app_event(self, event):
        await self.send_json(event["payload"])

    @database_sync_to_async
    def get_existing_direct_chat(self, recipient_id):
        try:
            recipient = User.objects.get(id=recipient_id)
        except User.DoesNotExist:
            return None

        chat = get_direct_chat_between(self.user, recipient)

        if not chat:
            return None

        return {"id": chat.id}

    @database_sync_to_async
    def create_direct_text_message(self, recipient_id, text, client_id):
        recipient = User.objects.get(id=recipient_id)

        chat, _ = get_or_create_direct_chat(self.user, recipient)

        message = create_text_message(
            chat=chat,
            sender=self.user,
            text=text,
            client_id=client_id,
        )

        return MessageSerializer(message).data

    @database_sync_to_async
    def create_group_text_message(self, chat_id, text, client_id):
        chat = Chat.objects.get(
            id=chat_id,
            members__user=self.user,
            members__is_active=True,
            is_active=True,
        )

        message = create_text_message(
            chat=chat,
            sender=self.user,
            text=text,
            client_id=client_id,
        )

        return MessageSerializer(message).data

    async def notify_chat_members_about_message(self, message_data):
        chat_id = str(message_data["chat"])
        sender_id = int(message_data["sender"]["id"])

        member_ids = await self.get_chat_member_ids(chat_id)

        for member_id in member_ids:
            if int(member_id) == sender_id:
                continue

            await self.channel_layer.group_send(
                f"user_{member_id}",
                {
                    "type": "app_event",
                    "payload": {
                        "type": "notification.new_message",
                        "chat_id": chat_id,
                        "message": f"Новое сообщение от {message_data['sender']['full_name']}",
                        "payload": message_data,
                    },
                },
            )

    @database_sync_to_async
    def get_chat_member_ids(self, chat_id):
        chat = Chat.objects.get(id=chat_id)

        return list(
            chat.members.filter(is_active=True).values_list("user_id", flat=True)
        )