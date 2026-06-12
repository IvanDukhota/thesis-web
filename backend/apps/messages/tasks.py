from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.core.cache import cache
import requests
import re
import langid

from .models import Message, MessageTranslation
from .translation_client import translate_text


def acquire_translation_lock(message_id: str, target_language: str, timeout: int = 300) -> bool:
    lock_key = f"translation_lock:{message_id}:{target_language}"
    return cache.add(lock_key, "locked", timeout)


def release_translation_lock(message_id: str, target_language: str):
    lock_key = f"translation_lock:{message_id}:{target_language}"
    cache.delete(lock_key)


def has_translatable_text(text: str) -> bool:
    if not text or len(text.strip()) == 0:
        return False

    text_no_urls = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)

    text_cleaned = re.sub(r'[\d\s\.,!?;:\-_\(\)\[\]{}]', '', text_no_urls)

    if len(text_cleaned) < 2:
        return False

    return True


def detect_message_language(text: str) -> str:
    try:
        if not has_translatable_text(text):
            return 'en'

        detected, confidence = langid.classify(text)

        mapping = {
            'en': 'en',
            'uk': 'uk',
            'ru': 'ru',
            'de': 'de',
            'fr': 'fr',
            'es': 'es',
            'pl': 'pl',
            'ja': 'ja',
            'zh': 'zh',
            'ko': 'ko',
            'ky': 'ky',
            'kk': 'ru',
            'ar': 'ar',
        }
        return mapping.get(detected, 'en')
    except Exception as e:
        print(f"Language detection error: {e}")
        return 'en'


def send_translation_ready_event(message_id: str, target_language: str, translated_text: str, user_id: int):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"user_{user_id}",
        {
            "type": "translation_ready",
            "message_id": str(message_id),
            "target_language": target_language,
            "translated_text": translated_text,
        }
    )


def _translate_message(message_id: str, target_language: str, user_id: int):
    print(f"Starting translation for message {message_id} to {target_language}")
    if not acquire_translation_lock(message_id, target_language):
        return

    try:
        try:
            message = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            return

        if not has_translatable_text(message.text):
            print(f"Message {message_id} has no translatable text, skipping")
            send_translation_ready_event(message_id, target_language, message.text, user_id)
            return

        if not message.source_language:
            detected_lang = detect_message_language(message.text)
            message.source_language = detected_lang
            message.save(update_fields=['source_language'])

        print(f"Translating message {message.text} from {message.source_language} to {target_language}")

        if message.source_language == target_language:
            print(f"Message {message_id} source language matches target language, sending original text")
            send_translation_ready_event(message_id, target_language, message.text, user_id)
            return

        existing = MessageTranslation.objects.filter(
            message=message,
            target_language=target_language
        ).first()

        if existing:
            send_translation_ready_event(message_id, target_language, existing.translated_text, user_id)
            return

        translated_text = translate_text(
            text=message.text,
            source_lang=message.source_language,
            target_lang=target_language
        )

        MessageTranslation.objects.create(
            message=message,
            target_language=target_language,
            translated_text=translated_text
        )

        send_translation_ready_event(message_id, target_language, translated_text, user_id)

    except requests.RequestException as e:
        raise
    except Exception as e:
        print(f"Translation error: {e}")
        raise
    finally:
        release_translation_lock(message_id, target_language)


@shared_task(queue='translation_high', bind=True, max_retries=3)
def translate_message_high(self, message_id: str, target_language: str, user_id: int):
    return _translate_message(message_id, target_language, user_id)


@shared_task(queue='translation_medium', bind=True, max_retries=3)
def translate_message_medium(self, message_id: str, target_language: str, user_id: int):
    return _translate_message(message_id, target_language, user_id)


@shared_task(queue='translation_low', bind=True, max_retries=3)
def translate_message_low(self, message_id: str, target_language: str, user_id: int):
    return _translate_message(message_id, target_language, user_id)
