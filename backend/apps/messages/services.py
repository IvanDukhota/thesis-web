from .models import Message


def create_text_message(*, chat, sender, text, client_id=None):
    return Message.objects.create(
        chat=chat,
        sender=sender,
        client_id=client_id,
        type=Message.MessageType.TEXT,
        text=text,
    )