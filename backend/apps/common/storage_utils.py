import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def delete_file_from_storage(file_field):
    if not file_field:
        return False

    try:
        if file_field.storage.exists(file_field.name):
            file_field.storage.delete(file_field.name)
            logger.info(f"Deleted file: {file_field.name}")
            return True
        else:
            logger.warning(f"File not found in storage: {file_field.name}")
            return False
    except Exception as e:
        logger.error(f"Error deleting file {file_field.name}: {str(e)}")
        return False


def delete_file_by_key(storage_key, storage_class=None):
    if not storage_key:
        return False

    try:
        if storage_class is None:
            from django.core.files.storage import default_storage
            storage = default_storage
        else:
            storage = storage_class()

        if storage.exists(storage_key):
            storage.delete(storage_key)
            logger.info(f"Deleted file by key: {storage_key}")
            return True
        else:
            logger.warning(f"File not found by key: {storage_key}")
            return False
    except Exception as e:
        logger.error(f"Error deleting file by key {storage_key}: {str(e)}")
        return False
