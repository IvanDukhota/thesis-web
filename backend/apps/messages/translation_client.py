import requests
from django.conf import settings


TRANSLATION_SERVICE_URL = getattr(settings, 'TRANSLATION_SERVICE_URL', 'http://localhost:8001')


def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    """
    Call Translation Service to translate text.

    Args:
        text: Text to translate
        source_lang: Source language code (e.g., 'en', 'uk')
        target_lang: Target language code (e.g., 'en', 'uk')

    Returns:
        Translated text

    Raises:
        requests.RequestException: If translation service is unavailable
    """
    # Convert short codes to NLLB codes
    source_nllb = get_nllb_code(source_lang)
    target_nllb = get_nllb_code(target_lang)

    response = requests.post(
        f"{TRANSLATION_SERVICE_URL}/translate",
        json={
            "text": text,
            "source_language": source_nllb,
            "target_language": target_nllb
        },
        timeout=30
    )
    response.raise_for_status()

    return response.json()["translated_text"]


def get_nllb_code(short_code: str) -> str:
    """Convert short language code to NLLB code"""
    mapping = {
        'en': 'eng_Latn',
        'uk': 'ukr_Cyrl',
        'ru': 'rus_Cyrl',
        'de': 'deu_Latn',
        'fr': 'fra_Latn',
        'es': 'spa_Latn',
        'pl': 'pol_Latn',
    }
    return mapping.get(short_code, 'eng_Latn')
