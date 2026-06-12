import json
from django.core.serializers.json import DjangoJSONEncoder

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth import get_user_model

from apps.chats.models import Chat, ChatMember

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
                "message": "Connected to personal user channel",
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

        if event_type == "message.read":
            await self.mark_messages_read(content)
            return

    async def open_chat(self, content):
        chat_id = content.get("chat_id")
        recipient_id = content.get("recipient_id")

        await self.close_active_chat(send_event=False)

        if chat_id:
            self.active_chat_id = str(chat_id)

            chat = await self.get_chat_by_id(chat_id)
            if not chat:
                await self.send_json(
                    {
                        "type": "chat.error",
                        "message": "Chat not found.",
                    }
                )
                return

            self.active_chat_type = chat["type"]
            self.active_recipient_id = chat.get("recipient_id")

            await self.subscribe_to_chat(self.active_chat_id)

            await self.send_json(
                {
                    "type": "chat.opened",
                    "exists": True,
                    "chat_id": self.active_chat_id,
                    "chat_type": self.active_chat_type,
                }
            )
            return

        if recipient_id:
            self.active_chat_type = Chat.ChatType.DIRECT
            self.active_recipient_id = int(recipient_id)
            self.active_chat_id = None

            await self.send_json(
                {
                    "type": "chat.opened",
                    "exists": False,
                    "chat_id": None,
                    "chat_type": "direct",
                }
            )
            return

        await self.send_json(
            {
                "type": "chat.error",
                "message": "Either chat_id or recipient_id is required.",
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

    async def mark_messages_read(self, content):
        chat_id = content.get("chat_id")
        position = content.get("position")

        if not chat_id or position is None:
            return

        try:
            position = int(position)
        except ValueError:
            return

        result = await self.update_read_position(chat_id, position)

        if result is None:
            return

        updated_position, unread_count = result

        await self.channel_layer.group_send(
            f"chat_{chat_id}",
            {
                "type": "chat_message",
                "payload": {
                    "type": "message.read",
                    "chat_id": str(chat_id),
                    "user_id": self.user.id,
                    "last_read_position": updated_position,
                    "unread_count": unread_count,
                },
            },
        )


    async def broadcast_message_created(self, event):

        message_data = event["message_data"]
        chat_data = event["chat_data"]
        chat_id = str(message_data["chat"])

        if self.active_chat_id != chat_id or not self.active_chat_group_name:
            await self.subscribe_to_chat(chat_id)

            await self.send_json(
                {
                    "type": "chat.opened",
                    "exists": True,
                    "chat_id": chat_id,
                    "chat_type": chat_data.get("type"),
                }
            )

        await self.send_json(
            {
                "type": "message.created",
                "chat_id": chat_id,
                "payload": message_data,
            }
        )

    async def broadcast_message_deleted(self, event):
        message_id = event["message_id"]

        await self.send_json(
            {
                "type": "message.deleted",
                "message_id": message_id,
            }
        )
    
        async def broadcast_message_edited(self, event):
            message_data = event["message_data"]

            await self.send_json(
                {
                    "type": "message.edited",
                    "payload": message_data,
                }
            )

    async def send_notification(self, event):
        notification_type = event["notification_type"]
        chat_id = event["chat_id"]
        sender_name = event.get("sender_name", "")
        message_sent_at = event.get("message_sent_at")
        chat_data = event["chat_data"]

        await self.send_json(
            {
                "type": f"notification.{notification_type}",
                "chat_id": chat_id,
                "message": f"Новое сообщение от {sender_name}",
                "message_sent_at": message_sent_at,
                "chat": chat_data,
            }
        )

    # Под вопросом
    async def send_chat_opened(self, event):
        chat_id = event["chat_id"]
        chat_type = event["chat_type"]

        await self.subscribe_to_chat(chat_id)

        await self.send_json(
            {
                "type": "chat.opened",
                "exists": True,
                "chat_id": chat_id,
                "chat_type": chat_type,
            }
        )

    async def send_chat_deleted(self, event):
        chat_id = event["chat_id"]

        await self.send_json(
            {
                "type": "chat.deleted",
                "chat_id": chat_id,
            }
        )

    async def chat_message(self, event):
        await self.send_json(event["payload"])

    async def app_event(self, event):
        await self.send_json(event["payload"])

    async def translation_ready(self, event):
        await self.send_json({
            "type": "translation.ready",
            "message_id": event["message_id"],
            "translated_text": event["translated_text"],
            "target_language": event["target_language"],
        })

    @database_sync_to_async
    def get_chat_by_id(self, chat_id):
        try:
            chat = Chat.objects.get(
                id=chat_id,
                members__user=self.user,
                members__is_active=True,
                is_active=True,
            )
        except Chat.DoesNotExist:
            return None

        result = {
            "id": str(chat.id),
            "type": chat.type,
        }

        if chat.type == Chat.ChatType.DIRECT:
            other_member = chat.members.exclude(user=self.user).first()
            if other_member:
                result["recipient_id"] = other_member.user_id

        return result

    @database_sync_to_async
    def update_read_position(self, chat_id, position):
        try:
            member = ChatMember.objects.get(
                chat_id=chat_id,
                user=self.user,
                is_active=True,
            )
        except ChatMember.DoesNotExist:
            return None

        if position <= member.last_read_position:
            unread_count = member.chat.messages.filter(
                position__gt=member.last_read_position,
                is_deleted=False,
            ).exclude(sender=self.user).count()

            return (member.last_read_position, unread_count)

        member.last_read_position = position
        member.save(update_fields=["last_read_position"])

        unread_count = member.chat.messages.filter(
            position__gt=position,
            is_deleted=False,
        ).exclude(sender=self.user).count()

        return (member.last_read_position, unread_count)
