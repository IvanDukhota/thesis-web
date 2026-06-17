from django.contrib import admin
from .models import Category, Tag, Order, OrderImage, Favorite, Review


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'parent', 'order', 'is_active', 'created_at']
    list_filter = ['is_active', 'parent']
    search_fields = ['name', 'slug', 'description']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['order', 'name']


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'usage_count', 'created_at']
    search_fields = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['-usage_count', 'name']


class OrderImageInline(admin.TabularInline):
    model = OrderImage
    extra = 1
    fields = ['image', 'order_position', 'width', 'height']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['title', 'seller', 'category', 'price', 'status', 'views_count', 'created_at']
    list_filter = ['status', 'category', 'created_at']
    search_fields = ['title', 'description', 'seller__email']
    prepopulated_fields = {'slug': ('title',)}
    filter_horizontal = ['tags']
    inlines = [OrderImageInline]
    readonly_fields = ['views_count', 'orders_count', 'created_at', 'updated_at']

    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'slug', 'description', 'seller', 'category', 'tags')
        }),
        ('Pricing & Delivery', {
            'fields': ('price', 'delivery_time')
        }),
        ('Details', {
            'fields': ('features', 'requirements', 'status')
        }),
        ('Statistics', {
            'fields': ('views_count', 'orders_count')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'published_at')
        }),
    )


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ['user', 'order', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__email', 'order__title']
    raw_id_fields = ['user', 'order']


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['order', 'buyer', 'rating', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['order__title', 'buyer__email', 'comment']
    raw_id_fields = ['order', 'buyer']
    readonly_fields = ['created_at', 'updated_at']
