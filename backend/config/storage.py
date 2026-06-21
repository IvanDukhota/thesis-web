import os
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from storages.backends.s3boto3 import S3Boto3Storage


USE_S3 = os.getenv('USE_S3', 'False').lower() == 'true'


if USE_S3:
    custom_domain = os.getenv('AWS_S3_CUSTOM_DOMAIN')
    use_ssl = os.getenv('AWS_S3_USE_SSL', 'False').lower() == 'true'

    def _fix_url(url):
        if not use_ssl and url.startswith('https://'):
            return url.replace('https://', 'http://', 1)
        return url

    class AvatarStorage(S3Boto3Storage):
        location = 'avatars'
        file_overwrite = False
        default_acl = 'public-read'
        custom_domain = custom_domain

        def url(self, name, parameters=None, expire=None, http_method=None):
            return _fix_url(super().url(name, parameters, expire, http_method))

    class AttachmentStorage(S3Boto3Storage):
        location = 'attachments'
        file_overwrite = False
        default_acl = 'public-read'
        custom_domain = custom_domain

        def url(self, name, parameters=None, expire=None, http_method=None):
            return _fix_url(super().url(name, parameters, expire, http_method))

    class OrderAttachmentStorage(S3Boto3Storage):
        location = 'orders'
        file_overwrite = False
        default_acl = 'public-read'
        custom_domain = custom_domain

        def url(self, name, parameters=None, expire=None, http_method=None):
            return _fix_url(super().url(name, parameters, expire, http_method))

    class CodeStorage(S3Boto3Storage):
        location = 'code'
        file_overwrite = False
        default_acl = 'public-read'
        custom_domain = custom_domain

        def url(self, name, parameters=None, expire=None, http_method=None):
            return _fix_url(super().url(name, parameters, expire, http_method))

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

    class OrderAttachmentStorage(FileSystemStorage):
        def __init__(self, *args, **kwargs):
            kwargs['location'] = os.path.join(settings.MEDIA_ROOT, 'orders')
            kwargs['base_url'] = 'http://localhost:8000/media/orders/'
            super().__init__(*args, **kwargs)

    class CodeStorage(FileSystemStorage):
        def __init__(self, *args, **kwargs):
            kwargs['location'] = os.path.join(settings.MEDIA_ROOT, 'code')
            kwargs['base_url'] = 'http://localhost:8000/media/code/'
            super().__init__(*args, **kwargs)
