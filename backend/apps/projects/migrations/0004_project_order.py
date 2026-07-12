import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('projects', '0003_projectrole_projectmember_role'),
        ('marketplace', '0002_fix_empty_slugs'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='order',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='marketplace_projects',
                to='marketplace.order',
            ),
        ),
    ]
