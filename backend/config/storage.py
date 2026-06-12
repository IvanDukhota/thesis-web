import os
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from storages.backends.s3boto3 import S3Boto3Storage


USE_S3 = os.getenv('USE_S3', 'False').lower() == 'true'


if USE_S3:
    custom_domain = os.getenv('AWS_S3_CUSTOM_DOMAIN')
    use_ssl = os.getenv('AWS_S3_USE_SSL', 'False').lower() == 'true'

    class AvatarStorage(S3Boto3Storage):
        location = 'avatars'
        file_overwrite = False
        default_acl = 'public-read'
        custom_domain = custom_domain

        def url(self, name, parameters=None, expire=None, http_method=None):
            url = super().url(name, parameters, expire, http_method)
            if not use_ssl and url.startswith('https://'):
                url = url.replace('https://', 'http://', 1)
            return url

    class AttachmentStorage(S3Boto3Storage):
        location = 'attachments'
        file_overwrite = False
        default_acl = 'public-read'
        custom_domain = custom_domain

        def url(self, name, parameters=None, expire=None, http_method=None):
            url = super().url(name, parameters, expire, http_method)
            if not use_ssl and url.startswith('https://'):
                url = url.replace('https://', 'http://', 1)
            return url
else:
    class AvatarStorage(FileSystemStorage):
        def __init__(self, *args, **kwargs):
            kwargs['location'] = os.path.join(settings.MEDIA_ROOT, 'avatars')
            kwargs['base_url'] = 'http://localhost:8000/media/avatars/'
            super().__init__(*args, **kwargs)

    class AttachmentStorage(FileSystemStorage):
        def __init__(self, *args, **kwargs):
            kwargs['location'] = os.path.join(settings.MEDIA_ROOT, 'attachments')
            kwargs['base_url'] = 'http://localhost:8000/media/attachments/'
            super().__init__(*args, **kwargs)
