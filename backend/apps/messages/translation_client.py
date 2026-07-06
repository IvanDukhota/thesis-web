import requests
from django.conf import settings


OLLAMA_SERVICE_URL = getattr(settings, 'OLLAMA_SERVICE_URL', 'http://localhost:11434')


def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    """
    Call Ollama service to translate text using its API.

    Args:
        text: Text to translate
        source_lang: Source language code (e.g., 'en', 'uk', 'unknown')
        target_lang: Target language code (e.g., 'en', 'uk')

    Returns:
        Translated text

    Raises:
        requests.RequestException: If translation service is unavailable
    """
    target_name = get_language_name(target_lang)

    if source_lang == 'unknown':
        # Let the model auto-detect the source language
        prompt = f"Translate the following text to {target_name}. Return only the translation without any explanations.\n\nText: {text}\n\nTranslation:"
    else:
        source_name = get_language_name(source_lang)
        prompt = f"Translate the following text from {source_name} to {target_name}. Return only the translation without any explanations.\n\nText: {text}\n\nTranslation:"

    response = requests.post(
        f"{OLLAMA_SERVICE_URL}/api/generate",
        json={
            "model": "qwen2.5:7b",
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.3,
                "top_p": 0.9,
                "num_predict": 512
            }
        },
        timeout=180
    )
    response.raise_for_status()

    result = response.json()
    translated_text = result["response"].strip()

    return translated_text


def get_language_name(short_code: str) -> str:
    """Convert short language code to full language name"""
    mapping = {
        'en': 'English',
        'uk': 'Ukrainian',
        'ru': 'Russian',
        'de': 'German',
        'fr': 'French',
        'es': 'Spanish',
        'pl': 'Polish',
    }
    return mapping.get(short_code, 'English')
