from channels.routing import URLRouter

from apps.realtime.routing import websocket_urlpatterns as realtime_urlpatterns
from apps.kanban.routing import websocket_urlpatterns as kanban_urlpatterns

websocket_application = URLRouter(realtime_urlpatterns + kanban_urlpatterns)