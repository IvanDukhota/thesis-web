import requests
from django.conf import settings


OLLAMA_SERVICE_URL = getattr(settings, 'OLLAMA_SERVICE_URL', 'http://localhost:11434')
USE_TRANSLATION_API = getattr(settings, 'USE_TRANSLATION_API', False)


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


def get_translation_prompt(text: str, source_lang: str, target_lang: str) -> str:
    """Generate translation prompt in target language with professional context preservation"""

    target_name = get_language_name(target_lang)

    prompts = {
        'en': f"""Translate to {target_name}. Keep technical terms in English. Return ONLY the translation, nothing else.

{text}""",

        'uk': f"""Переклади українською. Технічні терміни залиш англійською. Поверни ТІЛЬКИ переклад, нічого більше.

{text}""",

        'de': f"""Übersetze auf Deutsch. Technische Begriffe auf Englisch. Gib NUR die Übersetzung zurück.

{text}""",

        'fr': f"""Traduis en français. Termes techniques en anglais. Retourne SEULEMENT la traduction.

{text}""",

        'es': f"""Traduce al español. Términos técnicos en inglés. Devuelve SOLO la traducción.

{text}""",

        'pl': f"""Przetłumacz na polski. Terminy techniczne po angielsku. Zwróć TYLKO tłumaczenie.

{text}""",
    }

    return prompts.get(target_lang, prompts['en'])


def translate_with_google(text: str, source_lang: str, target_lang: str) -> str:
    """
    Translate text using Google Translate via deep-translator library (free, unlimited).

    Args:
        text: Text to translate
        source_lang: Source language code (e.g., 'en', 'uk', 'unknown')
        target_lang: Target language code (e.g., 'en', 'uk')

    Returns:
        Translated text

    Raises:
        Exception: If translation fails
    """
    from deep_translator import GoogleTranslator

    if source_lang == 'unknown' or not source_lang:
        from apps.messages.tasks import detect_message_language
        source_lang = detect_message_language(text)

        if source_lang == 'unknown':
            source_lang = 'auto'

    if source_lang == target_lang and source_lang != 'auto':
        return text

    try:
        translator = GoogleTranslator(source=source_lang, target=target_lang)
        translated_text = translator.translate(text)
        return translated_text
    except Exception as e:
        raise Exception(f"Translation failed: {str(e)}")


def translate_with_ollama(text: str, source_lang: str, target_lang: str) -> str:
    """
    Translate text using Ollama local model.

    Args:
        text: Text to translate
        source_lang: Source language code (e.g., 'en', 'uk', 'unknown')
        target_lang: Target language code (e.g., 'en', 'uk')

    Returns:
        Translated text

    Raises:
        requests.RequestException: If translation service is unavailable
    """
    prompt = get_translation_prompt(text, source_lang, target_lang)

    response = requests.post(
        f"{OLLAMA_SERVICE_URL}/api/generate",
        json={
            "model": "qwen2.5:14b",
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.3,
                "top_p": 0.9,
                "num_predict": 1024
            }
        },
        timeout=180
    )
    response.raise_for_status()

    result = response.json()
    translated_text = result["response"].strip()

    return translated_text


def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    """
    Call translation service to translate text.
    Uses MyMemory API if USE_TRANSLATION_API is True, otherwise uses Ollama.

    Args:
        text: Text to translate
        source_lang: Source language code (e.g., 'en', 'uk', 'unknown')
        target_lang: Target language code (e.g., 'en', 'uk')

    Returns:
        Translated text

    Raises:
        requests.RequestException: If translation service is unavailable
    """
    if USE_TRANSLATION_API:
        return translate_with_google(text, source_lang, target_lang)
    else:
        return translate_with_ollama(text, source_lang, target_lang)
