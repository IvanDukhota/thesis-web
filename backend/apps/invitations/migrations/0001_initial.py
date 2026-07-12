import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('teams', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='TeamInvitation',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('status', models.CharField(
                    choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('declined', 'Declined')],
                    default='pending',
                    max_length=10,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('invited_by', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='sent_invitations',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('invited_user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='received_invitations',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('team', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='invitations',
                    to='teams.team',
                )),
            ],
            options={
                'ordering': ['-created_at'],
                'unique_together': {('team', 'invited_user')},
            },
        ),
    ]
