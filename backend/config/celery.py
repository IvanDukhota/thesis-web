import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')

app = Celery('thesis_web')

app.config_from_object('django.conf:settings', namespace='CELERY')

app.autodiscover_tasks()

app.conf.task_routes = {
    'apps.messages.tasks.translate_message_high': {
        'queue': 'translation_high',
        'routing_key': 'translation_high',
    },
    'apps.messages.tasks.translate_message_medium': {
        'queue': 'translation_medium',
        'routing_key': 'translation_medium',
    },
    'apps.messages.tasks.translate_message_low': {
        'queue': 'translation_low',
        'routing_key': 'translation_low',
    },
}

app.conf.broker_transport_options = {
    'priority_steps': list(range(10)),
    'queue_order_strategy': 'priority',
}
