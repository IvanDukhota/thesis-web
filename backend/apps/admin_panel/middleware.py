import json
import time
import logging

from django.contrib.auth import get_user_model

logger = logging.getLogger("request_log")


def _get_username(request):
    auth = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth.startswith('Bearer '):
        return None
    try:
        from rest_framework_simplejwt.tokens import AccessToken
        token = AccessToken(auth[7:])
        user_id = token.get('user_id')
        if not user_id:
            return None
        User = get_user_model()
        return User.objects.filter(id=user_id).values_list('username', flat=True).first()
    except Exception:
        return None


class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.monotonic()
        response = self.get_response(request)
        if request.path.startswith('/api/admin-panel/') or request.path == '/metrics':
            return response
        duration_ms = round((time.monotonic() - start) * 1000)

        logger.info(json.dumps({
            "type": "request",
            "method": request.method,
            "path": request.path,
            "status": response.status_code,
            "duration_ms": duration_ms,
            "user": _get_username(request),
            "ip": request.META.get("HTTP_X_FORWARDED_FOR", request.META.get("REMOTE_ADDR")),
        }))

        return response
