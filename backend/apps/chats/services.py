from django.db import transaction

from .models import Chat, ChatMember


def build_direct_key(first_user_id, second_user_id):
    first_id = min(int(first_user_id), int(second_user_id))
    second_id = max(int(first_user_id), int(second_user_id))
    return f"direct_{first_id}_{second_id}"


def get_direct_chat_between(user, other_user):
    direct_key = build_direct_key(user.id, other_user.id)

    return (
        Chat.objects.filter(
            type=Chat.ChatType.DIRECT,
            direct_key=direct_key,
            is_active=True,
        )
        .first()
    )


@transaction.atomic
def get_or_create_direct_chat(user, other_user):
    direct_key = build_direct_key(user.id, other_user.id)

    chat, created = Chat.objects.get_or_create(
        type=Chat.ChatType.DIRECT,
        direct_key=direct_key,
        defaults={
            "created_by": user,
        },
    )

    ChatMember.objects.get_or_create(
        chat=chat,
        user=user,
        defaults={
            "role": ChatMember.Role.MEMBER,
        },
    )

    ChatMember.objects.get_or_create(
        chat=chat,
        user=other_user,
        defaults={
            "role": ChatMember.Role.MEMBER,
        },
    )

    return chat, created