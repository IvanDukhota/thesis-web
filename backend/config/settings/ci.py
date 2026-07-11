from .base import *

# base.py reads DATABASE_URL → postgres; no override needed here

# No Redis during unit tests — use in-memory channel layer
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer"
    }
}

# No Redis cache
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.dummy.DummyCache"
    }
}

# Execute Celery tasks synchronously (no broker needed)
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

INTEGRATION_TESTS_ENABLED = False
EMBEDDING_SERVICE_AVAILABLE = False
RERANKER_SERVICE_AVAILABLE = False
S3_AVAILABLE = False
