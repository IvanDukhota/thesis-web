import requests as http_requests
from django.conf import settings
from django.db.models import Q, F, Value, FloatField, ExpressionWrapper
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.pagination import PageNumberPagination
from .models import Category, Tag, Order, OrderAttachment, OrderApplication
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

    def _build_recommendations_queryset(self, base_queryset):
        import numpy as np
        from pgvector.django import CosineDistance

        if not self.request.user.is_authenticated:
            raise ValidationError({'error': 'NO_USER_HISTORY'})

        accepted_order_ids = OrderApplication.objects.filter(
            applicant=self.request.user,
            status=OrderApplication.ACCEPTED,
        ).values_list('order_id', flat=True)

        embeddings = list(
            Order.objects
            .filter(id__in=accepted_order_ids, embedding__isnull=False)
            .values_list('embedding', flat=True)
        )

        if not embeddings:
            raise ValidationError({'error': 'NO_USER_HISTORY'})

        matrix = np.array(embeddings, dtype=np.float32)
        centroid = np.mean(matrix, axis=0)
        norm = np.linalg.norm(centroid)
        if norm > 0:
            centroid /= norm
        centroid_list = centroid.tolist()

        threshold = 0.30
        queryset = (
            base_queryset
            .filter(embedding__isnull=False)
            .annotate(distance=CosineDistance('embedding', centroid_list))
            .filter(distance__lt=threshold)
            .annotate(
                similarity_percentage=ExpressionWrapper(
                    (Value(1.0) - F('distance') / Value(threshold)) * Value(100.0),
                    output_field=FloatField(),
                )
            )
        )

        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__slug=category)

        tags = self.request.query_params.getlist('tags')
        for tag in tags:
            queryset = queryset.filter(tags__slug=tag)

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

        queryset = queryset.order_by('distance').distinct()

        if not queryset.exists():
            raise ValidationError({'error': 'NO_RECOMMENDATIONS_MATCH'})

        return queryset

    def get_queryset(self):
        queryset = super().get_queryset()

        if self.action == 'list':
            queryset = queryset.filter(status=Order.OPEN)
            sort = self.request.query_params.get('sort', '-created_at')
            if sort == 'recommendations':
                return self._build_recommendations_queryset(queryset)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search)
            )

        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__slug=category)

        tags = self.request.query_params.getlist('tags')
        if tags:
            for tag in tags:
                queryset = queryset.filter(tags__slug=tag)

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

        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        sort = self.request.query_params.get('sort', '-created_at')
        allowed_sorts = ['created_at', '-created_at', 'price', '-price', 'title', '-title']
        if sort in allowed_sorts:
            queryset = queryset.order_by(sort)

        return queryset.distinct()

    def perform_create(self, serializer):
        serializer.save(buyer=self.request.user)

    def create(self, request, *args, **kwargs):
        # Обработка множественных файлов из FormData
        data = request.data.copy()

        # Получаем все файлы с ключом 'attachments'
        attachments = request.FILES.getlist('attachments')

        # Логирование для отладки
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Creating order with {len(attachments)} attachments")
        logger.info(f"Request FILES: {request.FILES}")
        logger.info(f"Attachments list: {attachments}")

        if attachments:
            data.setlist('attachments', attachments)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        # Возвращаем полные данные через OrderDetailSerializer
        instance = serializer.instance
        detail_serializer = OrderDetailSerializer(instance, context={'request': request})
        headers = self.get_success_headers(detail_serializer.data)
        return Response(detail_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Увеличиваем счетчик просмотров
        instance.views_count += 1
        instance.save(update_fields=['views_count'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.buyer != request.user:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        new_attachments = request.FILES.getlist('attachments')
        keep_ids = request.data.getlist('keep_attachment_ids')

        data = request.data.copy()
        if 'attachments' in data:
            del data['attachments']

        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        instance.attachments.exclude(id__in=keep_ids).delete()
        for attachment_file in new_attachments:
            OrderAttachment.objects.create(order=instance, file=attachment_file)

        fresh = Order.objects.select_related('buyer', 'category').prefetch_related('tags', 'attachments').get(pk=instance.pk)
        detail_serializer = OrderDetailSerializer(fresh, context={'request': request})
        return Response(detail_serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.buyer != request.user:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

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

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticatedOrReadOnly])
    def ai_search(self, request):
        from pgvector.django import CosineDistance

        query = request.query_params.get('q', '').strip()
        if not query:
            return Response(
                {'error': 'Query parameter "q" is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        embedding_url = getattr(settings, 'EMBEDDING_SERVICE_URL', 'http://localhost:8002')
        try:
            resp = http_requests.post(
                f"{embedding_url}/embed",
                json={"text": f"query: {query}"},
                timeout=30,
            )
            resp.raise_for_status()
            query_vector = resp.json()['embedding']
        except Exception as e:
            return Response(
                {'error': f'Embedding service unavailable: {str(e)}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        threshold = 0.2
        queryset = (
            Order.objects
            .filter(status=Order.OPEN, embedding__isnull=False)
            .annotate(distance=CosineDistance('embedding', query_vector))
            .filter(distance__lt=threshold)
            .select_related('buyer', 'category')
            .prefetch_related('tags', 'attachments')
        )

        category = request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__slug=category)

        tags = request.query_params.getlist('tags')
        for tag in tags:
            queryset = queryset.filter(tags__slug=tag)

        min_price = request.query_params.get('min_price')
        if min_price:
            try:
                queryset = queryset.filter(price__gte=float(min_price))
            except ValueError:
                pass

        max_price = request.query_params.get('max_price')
        if max_price:
            try:
                queryset = queryset.filter(price__lte=float(max_price))
            except ValueError:
                pass

        queryset = queryset.order_by('distance').distinct()

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = OrderListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        serializer = OrderListSerializer(queryset, many=True, context={'request': request})
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

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        application = serializer.instance

        try:
            import uuid as _uuid
            import logging as _logging
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync

            _logger = _logging.getLogger(__name__)
            applicant_name = getattr(application.applicant, 'full_name', None) or application.applicant.username
            async_to_sync(get_channel_layer().group_send)(
                f"user_{application.order.buyer_id}",
                {
                    "type": "app.event",
                    "payload": {
                        "type": "notification.new_application",
                        "id": str(_uuid.uuid4()),
                        "order_title": application.order.title,
                        "order_slug": application.order.slug,
                        "applicant_name": applicant_name,
                        "created_at": application.created_at.isoformat(),
                    },
                },
            )
        except Exception as _e:
            import logging as _logging
            _logging.getLogger(__name__).error("WS notify failed for new_application: %s", _e)

        return Response(
            OrderApplicationListSerializer(application, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

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

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def received(self, request):
        """Заявки, полученные пользователем на его заказы"""
        queryset = self.get_queryset().filter(order__buyer=request.user)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def sent(self, request):
        """Заявки, поданные пользователем"""
        queryset = self.get_queryset().filter(applicant=request.user)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def accept(self, request, pk=None):
        from django.db import transaction as db_transaction
        from apps.projects.models import Project, ProjectRole, ProjectMember

        application = self.get_object()

        if application.order.buyer != request.user:
            return Response(
                {'error': 'Only the order owner can accept applications'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if application.status != OrderApplication.PENDING:
            return Response(
                {'error': 'Application has already been processed'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with db_transaction.atomic():
            application.status = OrderApplication.ACCEPTED
            application.save()

            order = application.order
            order.status = Order.IN_PROGRESS
            order.save(update_fields=['status'])

            is_team = application.team is not None
            project = Project.objects.create(
                name=order.title,
                description=order.description,
                type=Project.TEAM if is_team else Project.SOLO,
                team=application.team if is_team else None,
                created_by=request.user,
                order=order,
            )

            owner_role = ProjectRole.objects.create(
                project=project, name='Owner', is_owner=True,
                can_view=True, can_create=True, can_edit=True, can_delete=True,
            )
            developer_role = ProjectRole.objects.create(
                project=project, name='Developer', is_owner=False,
                can_view=True, can_create=True, can_edit=True, can_delete=False,
            )

            if is_team:
                from apps.teams.models import TeamMember
                for tm in TeamMember.objects.filter(team=application.team).select_related('user'):
                    role = owner_role if tm.user == application.applicant else developer_role
                    ProjectMember.objects.get_or_create(
                        project=project, user=tm.user,
                        defaults={'role': role},
                    )
            else:
                ProjectMember.objects.get_or_create(
                    project=project, user=application.applicant,
                    defaults={'role': owner_role},
                )

        try:
            import uuid as _uuid
            import logging as _logging
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync

            async_to_sync(get_channel_layer().group_send)(
                f"user_{application.applicant_id}",
                {
                    "type": "app.event",
                    "payload": {
                        "type": "notification.application_accepted",
                        "id": str(_uuid.uuid4()),
                        "order_title": order.title,
                        "order_slug": order.slug,
                        "project_id": str(project.id),
                        "created_at": application.updated_at.isoformat(),
                    },
                },
            )
        except Exception as _e:
            import logging as _logging
            _logging.getLogger(__name__).error("WS notify failed for application_accepted: %s", _e)

        return Response(self.get_serializer(application).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reject(self, request, pk=None):
        application = self.get_object()

        if application.order.buyer != request.user:
            return Response(
                {'error': 'Only the order owner can reject applications'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if application.status != OrderApplication.PENDING:
            return Response(
                {'error': 'Application has already been processed'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        application.status = OrderApplication.REJECTED
        application.save()

        try:
            import uuid as _uuid
            import logging as _logging
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync

            async_to_sync(get_channel_layer().group_send)(
                f"user_{application.applicant_id}",
                {
                    "type": "app.event",
                    "payload": {
                        "type": "notification.application_rejected",
                        "id": str(_uuid.uuid4()),
                        "order_title": application.order.title,
                        "order_slug": application.order.slug,
                        "created_at": application.updated_at.isoformat(),
                    },
                },
            )
        except Exception as _e:
            import logging as _logging
            _logging.getLogger(__name__).error("WS notify failed for application_rejected: %s", _e)

        return Response(self.get_serializer(application).data)

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

    def destroy(self, request, *args, **kwargs):
        application = self.get_object()
        is_applicant = application.applicant == request.user
        is_buyer = application.order.buyer == request.user
        if not (is_applicant or is_buyer):
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        deletable = {OrderApplication.WITHDRAWN, OrderApplication.REJECTED}
        if application.status not in deletable:
            return Response(
                {'error': 'Only withdrawn or rejected applications can be deleted'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)
