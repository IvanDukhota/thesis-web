from django.db.models.signals import pre_save, post_delete
from django.dispatch import receiver
from apps.common.storage_utils import delete_file_from_storage
from .models import User


@receiver(pre_save, sender=User)
def delete_old_avatar_on_update(sender, instance, **kwargs):
    if not instance.pk:
        return

    try:
        old_user = User.objects.get(pk=instance.pk)
    except User.DoesNotExist:
        return

    if old_user.avatar and old_user.avatar != instance.avatar:
        delete_file_from_storage(old_user.avatar)


@receiver(post_delete, sender=User)
def delete_avatar_on_user_delete(sender, instance, **kwargs):
    if instance.avatar:
        delete_file_from_storage(instance.avatar)
