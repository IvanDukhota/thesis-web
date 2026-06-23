from django.urls import path
from .views import AdminOverviewView, AdminLogsView, AdminServicesView, AdminMetricsView

urlpatterns = [
    path("overview/", AdminOverviewView.as_view(), name="admin-overview"),
    path("logs/", AdminLogsView.as_view(), name="admin-logs"),
    path("services/", AdminServicesView.as_view(), name="admin-services"),
    path("metrics/", AdminMetricsView.as_view(), name="admin-metrics"),
]
