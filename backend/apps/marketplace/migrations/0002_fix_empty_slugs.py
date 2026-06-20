import uuid
from django.db import migrations


def fix_empty_order_slugs(apps, schema_editor):
    Order = apps.get_model('marketplace', 'Order')
    for order in Order.objects.filter(slug=''):
        new_slug = str(order.id)[:12]
        while Order.objects.filter(slug=new_slug).exists():
            new_slug = str(uuid.uuid4())[:12]
        order.slug = new_slug
        order.save(update_fields=['slug'])


class Migration(migrations.Migration):

    dependencies = [
        ('marketplace', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(fix_empty_order_slugs, migrations.RunPython.noop),
    ]
