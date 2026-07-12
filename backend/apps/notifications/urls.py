from django.urls import path
from .views import NotificationListView, NotificationReadView

urlpatterns = [
    path('', NotificationListView.as_view()),
    path('<uuid:pk>/read/', NotificationReadView.as_view()),
]
