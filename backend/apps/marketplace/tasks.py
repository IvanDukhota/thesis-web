from celery import shared_task
from django.core.exceptions import ObjectDoesNotExist
import logging
import requests

logger = logging.getLogger(__name__)


@shared_task
def calculate_order_embedding(order_id):
    try:
        from .models import Order
        from django.conf import settings

        order = Order.objects.get(id=order_id)

        tags_text = ' '.join([tag.name for tag in order.tags.all()])
        category_text = order.category.name if order.category else ''

        text_parts = [
            f"Title: {order.title}",
            f"Description: {order.description}",
        ]
        if tags_text:
            text_parts.append(f"Skills: {tags_text}")
        if category_text:
            text_parts.append(f"Category: {category_text}")

        combined_text = "passage: " + ". ".join(text_parts)

        embedding_url = getattr(settings, 'EMBEDDING_SERVICE_URL', 'http://localhost:8002')
        resp = requests.post(
            f"{embedding_url}/embed",
            json={"text": combined_text},
            timeout=60,
        )
        resp.raise_for_status()

        embedding = resp.json()['embedding']
        order.embedding = embedding
        order.save(update_fields=['embedding'])

        logger.info(f"Successfully calculated embedding for order {order_id}")
        return {
            'status': 'success',
            'order_id': str(order_id),
            'embedding_dim': len(embedding),
        }

    except ObjectDoesNotExist:
        logger.error(f"Order {order_id} not found")
        return {'status': 'error', 'order_id': str(order_id), 'message': 'Order not found'}
    except Exception as e:
        logger.exception(f"Error calculating embedding for order {order_id}")
        return {'status': 'error', 'order_id': str(order_id), 'message': str(e)}
