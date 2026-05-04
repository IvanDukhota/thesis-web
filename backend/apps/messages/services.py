from django.utils import timezone

from .models import Message


def create_text_message(*, chat, sender, text, client_id=None):
    message = Message.objects.create(
        chat=chat,
        sender=sender,
        client_id=client_id,
        type=Message.MessageType.TEXT,
        text=text,
    )

    chat.updated_at = timezone.now()
    chat.save(update_fields=["updated_at"])

    return message