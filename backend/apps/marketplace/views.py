from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404
from .models import Category, Tag, Order, Favorite, Review
from .serializers import (
    CategorySerializer,
    TagSerializer,
    OrderListSerializer,
    OrderDetailSerializer,
    OrderCreateUpdateSerializer,
    ReviewSerializer
)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class TagViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        limit = self.request.query_params.get('limit')
        if limit:
            try:
                queryset = queryset[:int(limit)]
            except ValueError:
                pass
        return queryset


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.select_related('buyer', 'category').prefetch_related('tags', 'images')
    permission_classes = [IsAuthenticatedOrReadOnly]
    lookup_field = 'slug'

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return OrderCreateUpdateSerializer
        elif self.action == 'retrieve':
            return OrderDetailSerializer
        return OrderListSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Фильтрация по статусу (показываем только опубликованные, если не владелец)
        if self.action == 'list':
            queryset = queryset.filter(status='published')

        # Поиск по тексту
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search)
            )

        # Фильтр по категории
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__slug=category)

        # Фильтр по тегам
        tags = self.request.query_params.getlist('tags')
        if tags:
            for tag in tags:
                queryset = queryset.filter(tags__slug=tag)

        # Фильтр по цене
        min_price = self.request.query_params.get('min_price')
        if min_price:
            try:
                queryset = queryset.filter(price__gte=float(min_price))
            except ValueError:
                pass

        max_price = self.request.query_params.get('max_price')
        if max_price:
            try:
                queryset = queryset.filter(price__lte=float(max_price))
            except ValueError:
                pass

        # Фильтр по времени доставки
        delivery_time = self.request.query_params.get('delivery_time')
        if delivery_time:
            queryset = queryset.filter(delivery_time__icontains=delivery_time)

        # Фильтр по рейтингу (упрощенная версия)
        min_rating = self.request.query_params.get('min_rating')
        if min_rating:
            # TODO: Реализовать фильтрацию по рейтингу через аннотацию
            pass

        # Сортировка
        sort = self.request.query_params.get('sort', '-created_at')
        allowed_sorts = ['created_at', '-created_at', 'price', '-price', 'title', '-title']
        if sort in allowed_sorts:
            queryset = queryset.order_by(sort)

        return queryset.distinct()

    def perform_create(self, serializer):
        serializer.save(buyer=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Увеличиваем счетчик просмотров
        instance.views_count += 1
        instance.save(update_fields=['views_count'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def favorite(self, request, slug=None):
        order = self.get_object()
        favorite, created = Favorite.objects.get_or_create(
            user=request.user,
            order=order
        )
        if created:
            return Response({'status': 'added'}, status=status.HTTP_201_CREATED)
        return Response({'status': 'already_favorited'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['delete'], permission_classes=[IsAuthenticated])
    def unfavorite(self, request, slug=None):
        order = self.get_object()
        deleted, _ = Favorite.objects.filter(user=request.user, order=order).delete()
        if deleted:
            return Response({'status': 'removed'}, status=status.HTTP_204_NO_CONTENT)
        return Response({'status': 'not_favorited'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def favorites(self, request):
        favorites = Favorite.objects.filter(user=request.user).select_related('order')
        orders = [fav.order for fav in favorites]
        serializer = self.get_serializer(orders, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def reviews(self, request, slug=None):
        order = self.get_object()
        reviews = order.reviews.all()
        serializer = ReviewSerializer(reviews, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def review(self, request, slug=None):
        order = self.get_object()

        # Проверка, что пользователь не оставляет отзыв на свой заказ
        if order.buyer == request.user:
            return Response(
                {'error': 'You cannot review your own order'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ReviewSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(order=order)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
