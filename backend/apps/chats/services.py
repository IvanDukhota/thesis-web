from django.contrib.auth import get_user_model
from django.db.models import Count

from .models import Chat, ChatMember

User = get_user_model()


# def get_direct_chat_between(user, other_user):
#     return (
#             Chat.objects.filter(
#                 type=Chat.ChatType.DIRECT,
#                 is_active=True,
#                 members__user=user,
#                 members__is_active=True,
#             )
#             .filter(
#                 members__user=other_user,
#                 members__is_active=True,
#             )
#             .annotate(total_members=Count("members", distinct=True))
#             .filter(total_members=2)
#             .first()
#         )

def get_direct_chat_between(user, other_user):
    user_chat_ids = ChatMember.objects.filter(
        user=user,
        is_active=True,
        chat__type=Chat.ChatType.DIRECT,
        chat__is_active=True,
    ).values_list("chat_id", flat=True)

    other_user_chat_ids = ChatMember.objects.filter(
        user=other_user,
        is_active=True,
        chat_id__in=user_chat_ids,
    ).values_list("chat_id", flat=True)

    for chat_id in other_user_chat_ids:
        members_count = ChatMember.objects.filter(
            chat_id=chat_id,
            is_active=True,
        ).count()

        if members_count == 2:
            return Chat.objects.get(id=chat_id)

    return None


def get_or_create_direct_chat(user, other_user):
    existing_chat = get_direct_chat_between(user, other_user)

    if existing_chat:
        print("Existing chat found:", existing_chat.id)
        return existing_chat, False

    chat = Chat.objects.create(
        type=Chat.ChatType.DIRECT,
        created_by=user,
    )

    ChatMember.objects.create(
        chat=chat,
        user=user,
        role=ChatMember.Role.MEMBER,
    )

    ChatMember.objects.create(
        chat=chat,
        user=other_user,
        role=ChatMember.Role.MEMBER,
    )
    print("New chat created:", chat.id)
    return chat, True