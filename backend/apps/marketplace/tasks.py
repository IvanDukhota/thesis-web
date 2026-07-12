from celery import shared_task
from django.core.exceptions import ObjectDoesNotExist
from django.core.cache import cache
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
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


def acquire_order_translation_lock(order_id: str, target_language: str, timeout: int = 300) -> bool:
    lock_key = f"order_translation_lock:{order_id}:{target_language}"
    return cache.add(lock_key, "locked", timeout)


def release_order_translation_lock(order_id: str, target_language: str):
    lock_key = f"order_translation_lock:{order_id}:{target_language}"
    cache.delete(lock_key)


def send_order_translation_ready_event(order_id: str, target_language: str, translated_title: str, translated_description: str, user_id: int):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"user_{user_id}",
        {
            "type": "translation_order_ready",
            "order_id": str(order_id),
            "target_language": target_language,
            "translated_title": translated_title,
            "translated_description": translated_description,
        }
    )


@shared_task(bind=True, max_retries=3)
def translate_order_task(self, order_id: str, user_id: int):
    """Translation task for order list page - only translates title"""
    from .models import Order, OrderTranslation
    from apps.messages.tasks import has_translatable_text, detect_message_language
    from apps.messages.translation_client import translate_text
    from apps.users.models import User

    logger.info(f"Starting title translation for order {order_id} for user {user_id}")

    try:
        user = User.objects.get(id=user_id)
        target_language = user.language

        if not target_language:
            logger.warning(f"User {user_id} has no language set, skipping translation")
            return

        if not acquire_order_translation_lock(order_id, target_language):
            logger.info(f"Translation already in progress for order {order_id} to {target_language}")
            return

        try:
            order = Order.objects.get(id=order_id)

            existing = OrderTranslation.objects.filter(
                order=order,
                target_language=target_language
            ).first()

            if existing:
                send_order_translation_ready_event(
                    order_id, target_language, existing.translated_title, existing.translated_description, user_id
                )
                return

            if not has_translatable_text(order.title):
                translated_title = order.title
            else:
                detected_lang = detect_message_language(order.title)
                if detected_lang == target_language and detected_lang != 'unknown':
                    translated_title = order.title
                else:
                    translated_title = translate_text(
                        text=order.title,
                        source_lang=detected_lang,
                        target_lang=target_language
                    )

            OrderTranslation.objects.create(
                order=order,
                target_language=target_language,
                translated_title=translated_title,
                translated_description=""
            )

            send_order_translation_ready_event(
                order_id, target_language, translated_title, "", user_id
            )

            logger.info(f"Title translation completed for order {order_id} to {target_language}")

        finally:
            release_order_translation_lock(order_id, target_language)

    except Exception as e:
        logger.exception(f"Error translating order title {order_id}: {e}")
        release_order_translation_lock(order_id, target_language)
        raise self.retry(exc=e, countdown=60)


@shared_task(bind=True, max_retries=3)
def translate_order_detail_task(self, order_id: str, target_language: str, user_id: int):
    """Translation task for order detail page"""
    from .models import Order, OrderTranslation
    from apps.messages.tasks import has_translatable_text, detect_message_language
    from apps.messages.translation_client import translate_text

    logger.info(f"Starting detail translation for order {order_id} to {target_language} for user {user_id}")

    try:
        if not acquire_order_translation_lock(order_id, target_language):
            logger.info(f"Translation already in progress for order {order_id} to {target_language}")
            return

        try:
            order = Order.objects.get(id=order_id)

            existing = OrderTranslation.objects.filter(
                order=order,
                target_language=target_language
            ).first()

            if existing and existing.translated_description:
                send_order_translation_ready_event(
                    order_id, target_language, existing.translated_title, existing.translated_description, user_id
                )
                return

            if not has_translatable_text(order.title):
                translated_title = order.title
            else:
                detected_lang = detect_message_language(order.title)
                if detected_lang == target_language and detected_lang != 'unknown':
                    translated_title = order.title
                else:
                    translated_title = translate_text(
                        text=order.title,
                        source_lang=detected_lang,
                        target_lang=target_language
                    )

            if not has_translatable_text(order.description):
                translated_description = order.description
            else:
                detected_lang = detect_message_language(order.description)
                if detected_lang == target_language and detected_lang != 'unknown':
                    translated_description = order.description
                else:
                    translated_description = translate_text(
                        text=order.description,
                        source_lang=detected_lang,
                        target_lang=target_language
                    )

            if existing:
                existing.translated_title = translated_title
                existing.translated_description = translated_description
                existing.save()
            else:
                OrderTranslation.objects.create(
                    order=order,
                    target_language=target_language,
                    translated_title=translated_title,
                    translated_description=translated_description
                )

            send_order_translation_ready_event(
                order_id, target_language, translated_title, translated_description, user_id
            )

            logger.info(f"Detail translation completed for order {order_id} to {target_language}")

        finally:
            release_order_translation_lock(order_id, target_language)

    except Exception as e:
        logger.exception(f"Error translating order detail {order_id}: {e}")
        release_order_translation_lock(order_id, target_language)
        raise self.retry(exc=e, countdown=60)
