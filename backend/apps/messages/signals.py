from django.db.models.signals import post_delete
from django.dispatch import receiver
from apps.common.storage_utils import delete_file_by_key
from config.storage import AttachmentStorage
from .models import Message, Attachment


@receiver(post_delete, sender=Attachment)
def delete_attachment_file_on_delete(sender, instance, **kwargs):

    if instance.storage_key:
        delete_file_by_key(instance.storage_key, AttachmentStorage)


@receiver(post_delete, sender=Message)
def delete_attachments_on_message_delete(sender, instance, **kwargs):
    pass
