from django.contrib import admin
from .models import Category, Tag, Order, OrderAttachment, OrderApplication


@admin.action(description='Re-embed selected orders')
def recalculate_embeddings(modeladmin, request, queryset):
    from .tasks import calculate_order_embedding
    count = 0
    for order in queryset:
        calculate_order_embedding.delay(str(order.id))
        count += 1
    modeladmin.message_user(request, f'Queued re-embedding for {count} order(s).')


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
    list_display = ['title', 'buyer', 'category', 'price', 'status', 'views_count', 'applications_count', 'embedding_status', 'created_at']
    list_filter = ['status', 'category', 'created_at']
    search_fields = ['title', 'description', 'buyer__email']
    prepopulated_fields = {'slug': ('title',)}
    filter_horizontal = ['tags']
    inlines = [OrderAttachmentInline]
    actions = [recalculate_embeddings]

    readonly_fields = [
        'views_count',
        'applications_count',
        'created_at',
        'updated_at',
        'embedding_preview',
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
            'fields': ('embedding_preview',)
        }),
        ('Statistics', {
            'fields': ('views_count', 'applications_count')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )

    @admin.display(description='Embedding')
    def embedding_status(self, obj):
        return 'Yes' if obj.embedding is not None else 'No'

    @admin.display(description='Embedding')
    def embedding_preview(self, obj):
        if obj.embedding is None:
            return 'Not computed'
        values = list(obj.embedding)
        preview = ', '.join(f'{v:.4f}' for v in values[:6])
        return f'{len(values)}-dim vector [{preview}, ...]'


@admin.register(OrderApplication)
class OrderApplicationAdmin(admin.ModelAdmin):
    list_display = ['order', 'applicant', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['order__title', 'applicant__email', 'message']
    raw_id_fields = ['order', 'applicant', 'team']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(OrderAttachment)
class OrderAttachmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'file', 'uploaded_at']
    list_filter = ['uploaded_at']
    search_fields = ['order__title']
    raw_id_fields = ['order']
    readonly_fields = ['uploaded_at']