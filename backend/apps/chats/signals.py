from django.db.models.signals import pre_save, post_delete
from django.dispatch import receiver
from apps.common.storage_utils import delete_file_from_storage
from .models import Chat


@receiver(pre_save, sender=Chat)
def delete_old_chat_avatar_on_update(sender, instance, **kwargs):
    if not instance.pk:
        return

    try:
        old_chat = Chat.objects.get(pk=instance.pk)
    except Chat.DoesNotExist:
        return

    if old_chat.avatar and old_chat.avatar != instance.avatar:
        delete_file_from_storage(old_chat.avatar)


@receiver(post_delete, sender=Chat)
def delete_avatar_on_chat_delete(sender, instance, **kwargs):
    if instance.avatar:
        delete_file_from_storage(instance.avatar)
