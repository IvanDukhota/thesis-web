from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, TagViewSet, OrderViewSet, OrderApplicationViewSet

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'tags', TagViewSet, basename='tag')
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'applications', OrderApplicationViewSet, basename='application')

urlpatterns = [
    path('', include(router.urls)),
]
