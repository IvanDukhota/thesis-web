# Generated manually

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('marketplace', '0003_add_stopped_status'),
    ]

    operations = [
        migrations.CreateModel(
            name='OrderTranslation',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('target_language', models.CharField(max_length=10)),
                ('translated_title', models.TextField()),
                ('translated_description', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='translations', to='marketplace.order')),
            ],
            options={
                'unique_together': {('order', 'target_language')},
            },
        ),
        migrations.AddIndex(
            model_name='ordertranslation',
            index=models.Index(fields=['order', 'target_language'], name='marketplace_order_i_order_i_idx'),
        ),
    ]
