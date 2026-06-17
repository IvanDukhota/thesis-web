from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Category, Tag, Order, OrderImage, Favorite, Review

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


class BuyerSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'nickname', 'avatar']


class OrderImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = OrderImage
        fields = ['id', 'url', 'order_position', 'width', 'height']

    def get_url(self, obj):
        request = self.context.get('request')
        if obj.image and hasattr(obj.image, 'url'):
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class OrderListSerializer(serializers.ModelSerializer):
    buyer = BuyerSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    thumbnail = serializers.SerializerMethodField()
    is_favorited = serializers.SerializerMethodField()
    rating = serializers.ReadOnlyField()
    reviews_count = serializers.ReadOnlyField()

    class Meta:
        model = Order
        fields = [
            'id', 'slug', 'title', 'price', 'delivery_time',
            'rating', 'reviews_count', 'orders_count', 'buyer',
            'category_name', 'tags', 'thumbnail', 'is_favorited', 'created_at'
        ]

    def get_thumbnail(self, obj):
        first_image = obj.images.first()
        if first_image:
            return OrderImageSerializer(first_image, context=self.context).data['url']
        return None

    def get_is_favorited(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Favorite.objects.filter(user=request.user, order=obj).exists()
        return False


class OrderDetailSerializer(serializers.ModelSerializer):
    buyer = BuyerSerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    category = CategorySerializer(read_only=True)
    images = OrderImageSerializer(many=True, read_only=True)
    is_favorited = serializers.SerializerMethodField()
    is_owner = serializers.SerializerMethodField()
    rating = serializers.ReadOnlyField()
    reviews_count = serializers.ReadOnlyField()

    class Meta:
        model = Order
        fields = [
            'id', 'slug', 'title', 'description', 'price', 'delivery_time',
            'features', 'requirements', 'status', 'rating', 'reviews_count',
            'orders_count', 'views_count', 'buyer', 'category', 'tags',
            'images', 'is_favorited', 'is_owner', 'created_at', 'updated_at',
            'published_at'
        ]

    def get_is_favorited(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Favorite.objects.filter(user=request.user, order=obj).exists()
        return False

    def get_is_owner(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.buyer == request.user
        return False


class OrderCreateUpdateSerializer(serializers.ModelSerializer):
    tag_names = serializers.ListField(child=serializers.CharField(), write_only=True, required=False)
    images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Order
        fields = [
            'title', 'description', 'category', 'price', 'delivery_time',
            'features', 'requirements', 'status', 'tag_names', 'images'
        ]

    def create(self, validated_data):
        tag_names = validated_data.pop('tag_names', [])
        images = validated_data.pop('images', [])

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

        # Загрузка изображений
        for idx, image in enumerate(images):
            OrderImage.objects.create(
                order=order,
                image=image,
                order_position=idx
            )

        # TODO: Запустить Celery-задание для расчета вектора признаков
        # from .tasks import calculate_order_embedding
        # calculate_order_embedding.delay(str(order.id))

        return order

    def update(self, instance, validated_data):
        tag_names = validated_data.pop('tag_names', None)
        images = validated_data.pop('images', None)

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

        if images is not None:
            instance.images.all().delete()
            for idx, image in enumerate(images):
                OrderImage.objects.create(
                    order=instance,
                    image=image,
                    order_position=idx
                )

        # TODO: Запустить Celery-задание для обновления вектора признаков
        # from .tasks import calculate_order_embedding
        # calculate_order_embedding.delay(str(instance.id))

        return instance


class ReviewSerializer(serializers.ModelSerializer):
    seller = BuyerSerializer(read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'seller', 'rating', 'comment', 'created_at', 'updated_at']
        read_only_fields = ['seller']

    def create(self, validated_data):
        validated_data['seller'] = self.context['request'].user
        return super().create(validated_data)
