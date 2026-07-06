"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
import django_prometheus.urls
from apps.common.views import health_check
from apps.messages.views import MessageCreateView, TranslationRequestView, MessageDeleteView, MessageEditView, AIAssistantView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.users.urls")),
    path("api/users/", include("apps.users.urls")),
    path("api/chats/", include("apps.chats.urls")),
    path("api/messages/direct/", MessageCreateView.as_view(), name="message-create-direct"),
    path("api/messages/<uuid:message_id>/edit/", MessageEditView.as_view(), name="message-edit"),
    path("api/messages/<uuid:message_id>/", MessageDeleteView.as_view(), name="message-delete"),
    path("api/messages/assistant/", AIAssistantView.as_view(), name="ai-assistant"),
    path("api/translations/request/", TranslationRequestView.as_view(), name="translation-request"),
    path('api/v1/health/', health_check),
    path('api/teams/', include('apps.teams.urls')),
    path('api/invitations/', include('apps.invitations.urls')),
    path('api/projects/', include('apps.projects.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/stats/', include('apps.stats.urls')),
    path('api/marketplace/', include('apps.marketplace.urls')),
    path('api/admin-panel/', include('apps.admin_panel.urls')),
    path('', include(django_prometheus.urls)),
]

urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

if settings.DEBUG and not settings.USE_S3:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)