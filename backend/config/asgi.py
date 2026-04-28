import os

from channels.routing import ProtocolTypeRouter
from django.core.asgi import get_asgi_application

from apps.realtime.auth import JWTAuthMiddlewareStack
from config.routing import websocket_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.base")

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": JWTAuthMiddlewareStack(websocket_application),
    }
)