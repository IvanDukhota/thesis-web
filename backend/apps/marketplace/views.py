from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from .models import Category, Tag, Order, OrderApplication
from .serializers import (
    CategorySerializer,
    TagSerializer,
    OrderListSerializer,
    OrderDetailSerializer,
    OrderCreateUpdateSerializer,
    OrderApplicationListSerializer,
    OrderApplicationDetailSerializer,
    OrderApplicationCreateSerializer,
)


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


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
    queryset = Order.objects.select_related('buyer', 'category').prefetch_related('tags', 'attachments')
    permission_classes = [IsAuthenticatedOrReadOnly]
    lookup_field = 'slug'
    pagination_class = StandardResultsSetPagination

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return OrderCreateUpdateSerializer
        elif self.action == 'retrieve':
            return OrderDetailSerializer
        return OrderListSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Базовая фильтрация: показываем только открытые заказы
        if self.action == 'list':
            queryset = queryset.filter(status=Order.OPEN)

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

        # Фильтр по статусу
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

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

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_orders(self, request):
        """Заказы, созданные текущим пользователем"""
        queryset = self.get_queryset().filter(buyer=request.user)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_applications(self, request):
        """Заказы, на которые пользователь подал заявку"""
        applications = OrderApplication.objects.filter(applicant=request.user).values_list('order_id', flat=True)
        queryset = self.get_queryset().filter(id__in=applications)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class OrderApplicationViewSet(viewsets.ModelViewSet):
    queryset = OrderApplication.objects.select_related('order', 'applicant', 'team')
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_serializer_class(self):
        if self.action == 'create':
            return OrderApplicationCreateSerializer
        elif self.action == 'retrieve':
            return OrderApplicationDetailSerializer
        return OrderApplicationListSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        # Пользователь видит только свои заявки или заявки на свои заказы
        queryset = queryset.filter(
            Q(applicant=user) | Q(order__buyer=user)
        )

        # Фильтр по заказу
        order_slug = self.request.query_params.get('order')
        if order_slug:
            queryset = queryset.filter(order__slug=order_slug)

        # Фильтр по статусу
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset.distinct()

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def accept(self, request, pk=None):
        """Принять заявку (только владелец заказа)"""
        application = self.get_object()

        if application.order.buyer != request.user:
            return Response(
                {'error': 'Only the order owner can accept applications'},
                status=status.HTTP_403_FORBIDDEN
            )

        if application.status != OrderApplication.PENDING:
            return Response(
                {'error': 'Application has already been processed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        application.status = OrderApplication.ACCEPTED
        application.save()

        # Обновляем статус заказа
        order = application.order
        order.status = Order.IN_PROGRESS
        order.save(update_fields=['status'])

        serializer = self.get_serializer(application)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reject(self, request, pk=None):
        """Отклонить заявку (только владелец заказа)"""
        application = self.get_object()

        if application.order.buyer != request.user:
            return Response(
                {'error': 'Only the order owner can reject applications'},
                status=status.HTTP_403_FORBIDDEN
            )

        if application.status != OrderApplication.PENDING:
            return Response(
                {'error': 'Application has already been processed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        application.status = OrderApplication.REJECTED
        application.save()

        serializer = self.get_serializer(application)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def withdraw(self, request, pk=None):
        """Отозвать заявку (только автор заявки)"""
        application = self.get_object()

        if application.applicant != request.user:
            return Response(
                {'error': 'You can only withdraw your own applications'},
                status=status.HTTP_403_FORBIDDEN
            )

        if application.status != OrderApplication.PENDING:
            return Response(
                {'error': 'You can only withdraw pending applications'},
                status=status.HTTP_400_BAD_REQUEST
            )

        application.status = OrderApplication.WITHDRAWN
        application.save()

        # Уменьшаем счетчик заявок у заказа
        order = application.order
        order.applications_count = max(0, order.applications_count - 1)
        order.save(update_fields=['applications_count'])

        serializer = self.get_serializer(application)
        return Response(serializer.data)
