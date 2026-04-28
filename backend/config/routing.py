from channels.routing import URLRouter

from apps.realtime.routing import websocket_urlpatterns

websocket_application = URLRouter(websocket_urlpatterns)