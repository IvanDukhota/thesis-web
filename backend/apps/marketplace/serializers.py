from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Category, Tag, Order, OrderAttachment, OrderApplication

User = get_user_model()


class CategorySerializer(serializers.ModelSerializer):
    subcategories = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'icon', 'parent', 'order', 'is_active', 'subcategories']

    def get_subcategories(self, obj):
        if obj.subcategories.exists():
            return CategorySerializer(obj.subcategories.all(), many=True).data
        return []


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug', 'usage_count']


class UserSerializer(serializers.ModelSerializer):
    nickname = serializers.CharField(source='username', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'nickname', 'avatar']


class OrderAttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = OrderAttachment
        fields = ['id', 'url', 'uploaded_at']

    def get_url(self, obj):
        request = self.context.get('request')
        if obj.file and hasattr(obj.file, 'url'):
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class OrderListSerializer(serializers.ModelSerializer):
    buyer = UserSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'slug', 'title', 'price', 'estimated_days',
            'status', 'applications_count', 'views_count', 'buyer',
            'category_name', 'tags', 'created_at'
        ]


class OrderDetailSerializer(serializers.ModelSerializer):
    buyer = UserSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    category = CategorySerializer(read_only=True)
    attachments = OrderAttachmentSerializer(many=True, read_only=True)
    is_owner = serializers.SerializerMethodField()
    has_applied = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'slug', 'title', 'description', 'price', 'estimated_days',
            'status', 'applications_count', 'views_count', 'buyer', 'category', 'tags',
            'attachments', 'is_owner', 'has_applied', 'created_at', 'updated_at'
        ]

    def get_is_owner(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.buyer == request.user
        return False

    def get_has_applied(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return OrderApplication.objects.filter(
                order=obj,
                applicant=request.user
            ).exists()
        return False


class OrderCreateUpdateSerializer(serializers.ModelSerializer):
    tag_names = serializers.ListField(child=serializers.CharField(), write_only=True, required=False)
    attachments = serializers.ListField(
        child=serializers.FileField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Order
        fields = [
            'title', 'description', 'category', 'price', 'estimated_days',
            'status', 'tag_names', 'attachments'
        ]

    def create(self, validated_data):
        tag_names = validated_data.pop('tag_names', [])
        attachments = validated_data.pop('attachments', [])

        order = Order.objects.create(**validated_data)

        # Создание или получение тегов
        for tag_name in tag_names:
            tag, created = Tag.objects.get_or_create(
                name=tag_name.strip(),
                defaults={'slug': tag_name.strip().lower().replace(' ', '-')}
            )
            order.tags.add(tag)
            if not created:
                tag.usage_count += 1
                tag.save()

        # Загрузка вложений
        for attachment_file in attachments:
            OrderAttachment.objects.create(
                order=order,
                file=attachment_file
            )

        # TODO: Запустить Celery-задание для расчета embedding
        # from .tasks import calculate_order_embedding
        # calculate_order_embedding.delay(str(order.id))

        return order

    def update(self, instance, validated_data):
        tag_names = validated_data.pop('tag_names', None)
        attachments = validated_data.pop('attachments', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if tag_names is not None:
            instance.tags.clear()
            for tag_name in tag_names:
                tag, created = Tag.objects.get_or_create(
                    name=tag_name.strip(),
                    defaults={'slug': tag_name.strip().lower().replace(' ', '-')}
                )
                instance.tags.add(tag)
                if not created:
                    tag.usage_count += 1
                    tag.save()

        if attachments is not None:
            instance.attachments.all().delete()
            for attachment_file in attachments:
                OrderAttachment.objects.create(
                    order=instance,
                    file=attachment_file
                )

        # TODO: Запустить Celery-задание для обновления embedding
        # from .tasks import calculate_order_embedding
        # calculate_order_embedding.delay(str(instance.id))

        return instance


class OrderApplicationListSerializer(serializers.ModelSerializer):
    applicant = UserSerializer(read_only=True)
    order_title = serializers.CharField(source='order.title', read_only=True)
    order_slug = serializers.CharField(source='order.slug', read_only=True)

    class Meta:
        model = OrderApplication
        fields = [
            'id', 'order', 'order_title', 'order_slug', 'applicant', 'team',
            'proposed_price', 'proposed_days', 'status', 'created_at'
        ]


class OrderApplicationDetailSerializer(serializers.ModelSerializer):
    applicant = UserSerializer(read_only=True)
    order = OrderListSerializer(read_only=True)

    class Meta:
        model = OrderApplication
        fields = [
            'id', 'order', 'applicant', 'team', 'message',
            'proposed_price', 'proposed_days', 'status', 'created_at', 'updated_at'
        ]


class OrderApplicationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderApplication
        fields = ['order', 'team', 'message', 'proposed_price', 'proposed_days']

    def validate(self, data):
        request = self.context['request']
        order = data['order']

        # Проверка что заказ открыт
        if order.status != Order.OPEN:
            raise serializers.ValidationError("This order is no longer accepting applications.")

        # Проверка что пользователь не владелец заказа
        if order.buyer == request.user:
            raise serializers.ValidationError("You cannot apply to your own order.")

        # Проверка что уже не подавал заявку
        if OrderApplication.objects.filter(order=order, applicant=request.user).exists():
            raise serializers.ValidationError("You have already applied to this order.")

        return data

    def create(self, validated_data):
        validated_data['applicant'] = self.context['request'].user
        application = OrderApplication.objects.create(**validated_data)

        # Увеличиваем счетчик заявок у заказа
        order = application.order
        order.applications_count += 1
        order.save(update_fields=['applications_count'])

        return application
