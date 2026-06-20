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
    file_type = serializers.SerializerMethodField()
    filename = serializers.SerializerMethodField()

    class Meta:
        model = OrderAttachment
        fields = ['id', 'url', 'file_type', 'filename', 'uploaded_at']

    def get_url(self, obj):
        try:
            request = self.context.get('request')
            if obj.file and hasattr(obj.file, 'url'):
                url = obj.file.url
                if request:
                    return request.build_absolute_uri(url)
                return url
        except Exception:
            pass
        return None

    def get_file_type(self, obj):
        try:
            if not obj.file or not obj.file.name:
                return 'file'
            filename = obj.file.name.lower()
            image_extensions = ('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg')
            video_extensions = ('.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm')
            if filename.endswith(image_extensions):
                return 'image'
            elif filename.endswith(video_extensions):
                return 'video'
        except Exception:
            pass
        return 'file'

    def get_filename(self, obj):
        try:
            if obj.file and obj.file.name:
                import os
                return os.path.basename(obj.file.name)
        except Exception:
            pass
        return None


class OrderListSerializer(serializers.ModelSerializer):
    buyer = UserSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    images_count = serializers.SerializerMethodField()
    videos_count = serializers.SerializerMethodField()
    files_count = serializers.SerializerMethodField()
    similarity_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'slug', 'title', 'price', 'estimated_days',
            'status', 'applications_count', 'views_count', 'buyer',
            'category_name', 'tags', 'images_count', 'videos_count', 'files_count',
            'created_at', 'similarity_percentage',
        ]

    def get_similarity_percentage(self, obj):
        val = getattr(obj, 'similarity_percentage', None)
        if val is None:
            return None
        return round(float(val), 1)

    def get_images_count(self, obj):
        image_extensions = ('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg')
        return sum(1 for att in obj.attachments.all() if att.file.name.lower().endswith(image_extensions))

    def get_videos_count(self, obj):
        video_extensions = ('.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm')
        return sum(1 for att in obj.attachments.all() if att.file.name.lower().endswith(video_extensions))

    def get_files_count(self, obj):
        image_extensions = ('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg')
        video_extensions = ('.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm')
        all_extensions = image_extensions + video_extensions
        return sum(1 for att in obj.attachments.all() if not att.file.name.lower().endswith(all_extensions))


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

        # Запускаем Celery-задание для расчета embedding асинхронно
        from .tasks import calculate_order_embedding
        calculate_order_embedding.delay(str(order.id))

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

        # Запускаем Celery-задание для обновления embedding асинхронно
        from .tasks import calculate_order_embedding
        calculate_order_embedding.delay(str(instance.id))

        return instance


class OrderApplicationListSerializer(serializers.ModelSerializer):
    applicant = UserSerializer(read_only=True)
    order_title = serializers.CharField(source='order.title', read_only=True)
    order_slug = serializers.CharField(source='order.slug', read_only=True)

    class Meta:
        model = OrderApplication
        fields = [
            'id', 'order', 'order_title', 'order_slug', 'applicant', 'team',
            'message', 'proposed_price', 'proposed_days', 'status', 'created_at'
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
