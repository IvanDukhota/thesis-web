from django.contrib import admin
from .models import Category, Tag, Order, OrderAttachment, OrderApplication


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


class OrderAttachmentInline(admin.TabularInline):
    model = OrderAttachment
    extra = 1
    fields = ['file', 'uploaded_at']
    readonly_fields = ['uploaded_at']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['title', 'buyer', 'category', 'price', 'status', 'views_count', 'applications_count', 'created_at']
    list_filter = ['status', 'category', 'created_at']
    search_fields = ['title', 'description', 'buyer__email']
    prepopulated_fields = {'slug': ('title',)}
    filter_horizontal = ['tags']
    inlines = [OrderAttachmentInline]

    readonly_fields = [
        'views_count',
        'applications_count',
        'created_at',
        'updated_at',
        'embedding'
    ]

    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'slug', 'description', 'buyer', 'category', 'tags')
        }),
        ('Pricing & Delivery', {
            'fields': ('price', 'estimated_days')
        }),
        ('Status', {
            'fields': ('status',)
        }),
        ('Embedding', {
            'fields': ('embedding',)
        }),
        ('Statistics', {
            'fields': ('views_count', 'applications_count')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(OrderApplication)
class OrderApplicationAdmin(admin.ModelAdmin):
    list_display = ['order', 'applicant', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['order__title', 'applicant__email', 'message']
    raw_id_fields = ['order', 'applicant', 'team']
    readonly_fields = ['created_at', 'updated_at']