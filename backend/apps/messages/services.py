from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from .models import Message


# @transaction.atomic
# def create_text_message(*, chat, sender, text, client_id=None):
#     last_position = (
#         Message.objects.filter(chat=chat)
#         .aggregate(value=Max("position"))
#         .get("value")
#         or 0
#     )

#     message = Message.objects.create(
#         chat=chat,
#         sender=sender,
#         position=last_position + 1,
#         client_id=client_id,
#         type=Message.MessageType.TEXT,
#         text=text,
#     )

#     chat.updated_at = timezone.now()
#     chat.save(update_fields=["updated_at"])

#     return message