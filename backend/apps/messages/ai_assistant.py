import requests
from django.conf import settings


OLLAMA_SERVICE_URL = getattr(settings, 'OLLAMA_SERVICE_URL', 'http://localhost:11434')


def generate_message_from_prompt(prompt: str, context_messages: list[dict], user_nickname: str) -> str:
    context_text = "\n".join([
        f"{msg['sender']}: {msg['text']}"
        for msg in context_messages
    ])

    full_prompt = f"""Role: You are a chat assistant writing a message on behalf of a user.

Chat History:
[START OF HISTORY]
{context_text if context_text else "(chat history is empty)"}
[END OF HISTORY]

Task:
Write a message from the user "{user_nickname}". 
The message must naturally respond to the chat history above (if any) and fulfill this request: "{prompt}".

Strict Rule:
Output ONLY the raw text of the final message. Do not include any introductions, explanations, quotes, or meta-commentary like "Here is your message:"."""

    response = requests.post(
        f"{OLLAMA_SERVICE_URL}/api/generate",
        json={
            "model": "qwen2.5:7b",
            "prompt": full_prompt, 
            "stream": False,
            "options": {
                "temperature": 0.8,
                "top_p": 0.95,
                "top_k": 60,
                "num_predict": 1000,
                "repeat_penalty": 1.05,
                "num_ctx": 8192
            }
        },
        timeout=180
    )
    response.raise_for_status()

    result = response.json()
    generated_text = result["response"].strip()


    if (generated_text.startswith('"') and generated_text.endswith('"')) or \
       (generated_text.startswith("'") and generated_text.endswith("'")):
        generated_text = generated_text[1:-1]

    has_chinese = any('一' <= char <= '鿿' for char in generated_text)
    has_cyrillic = any('а' <= char.lower() <= 'я' for char in generated_text)
    has_latin = any('a' <= char.lower() <= 'z' for char in generated_text)

    conv_language = "Russian"
    if context_messages and len(context_messages) > 0:
        last_msg = context_messages[-1]['text']
        if any('а' <= char.lower() <= 'я' for char in last_msg):
            conv_language = "Russian"
        elif any('a' <= char.lower() <= 'z' for char in last_msg):
            conv_language = "English"

    if has_chinese or (has_cyrillic and has_latin and len(generated_text) > 20):
        strict_prompt = f"""Write one short message in {conv_language} that does: "{prompt}"

DO NOT write "I will write" - write the actual message.
DO NOT use Chinese characters.
DO NOT mix languages.

Just the message text in {conv_language}:"""

        retry_response = requests.post(
            f"{OLLAMA_SERVICE_URL}/api/generate",
            json={
                "model": "qwen2.5:7b",
                "prompt": strict_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.4,
                    "top_p": 0.85,
                    "num_predict": 150,
                    "repeat_penalty": 1.2
                }
            },
            timeout=60
        )
        retry_response.raise_for_status()
        generated_text = retry_response.json()["response"].strip()

        if (generated_text.startswith('"') and generated_text.endswith('"')) or \
           (generated_text.startswith("'") and generated_text.endswith("'")):
            generated_text = generated_text[1:-1]

        if any('一' <= char <= '鿿' for char in generated_text):
            clean_part = ""
            for char in generated_text:
                if '一' <= char <= '鿿':
                    break
                clean_part += char
            if clean_part.strip():
                generated_text = clean_part.strip()

    return generated_text.strip()


def format_as_business(message: str, context_messages: list[dict] = None, user_nickname: str = "") -> str:
    context_text = ""

    prompt = f"""You are a multilingual text-transformation engine. Your task is to rewrite the input message into a professional business tone.

RULES:
1. NO TRANSLATION: Identify the exact language used in <input_message> and use that SAME language for the output.
2. NO ADDED FACTS: Keep the original meaning. Do not add names, dates, or details.
3. FORMAT: Output ONLY the rewritten message text. No tags, no quotes, no conversational filler.
4. NO TRANSLATION: Identify the exact language used in <input_message> and use that SAME language for the output.

{context_text}

Input Data:
<input_message sender="{user_nickname}">
{message}
</input_message>

Execution Checklist:
- Detect the language of <input_message>
- Apply professional business style in that detected language
- Output zero commentary

Professional Message in the same language as above:"""


    response = requests.post(
        f"{OLLAMA_SERVICE_URL}/api/generate",
        json={
            "model": "qwen2.5:7b",
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.6,
                "top_p": 0.9,
                "top_k": 40,
                "num_predict": 300,
                "repeat_penalty": 1.1
            }
        },
        timeout=90
    )
    response.raise_for_status()

    result = response.json()
    result_text = result["response"].strip()

    if (result_text.startswith('"') and result_text.endswith('"')) or \
       (result_text.startswith("'") and result_text.endswith("'")):
        result_text = result_text[1:-1]

    if any('一' <= char <= '鿿' for char in result_text):
        return message

    return result_text.strip()


def format_as_friendly(message: str, context_messages: list[dict] = None, user_nickname: str = "") -> str:
    """
    Format message for casual/friendly communication.

    Args:
        message: Original message text
        context_messages: Last 5 messages for context
        user_nickname: Current user's name/nickname

    Returns:
        Formatted message
    """
    context_text = ""
    if context_messages and len(context_messages) >= 2:
        context_text = f"""
Previous messages:
- {context_messages[-2]['sender']}: "{context_messages[-2]['text']}"
- {context_messages[-1]['sender']}: "{context_messages[-1]['text']}"
"""
    elif context_messages and len(context_messages) == 1:
        context_text = f"""
Previous message:
- {context_messages[-1]['sender']}: "{context_messages[-1]['text']}"
"""

    prompt = f"""You are a message editor. Rewrite for friendly casual tone.
{context_text}
Message from {user_nickname}: "{message}"

CRITICAL RULES:
1. LANGUAGE: Write in SAME language as "{message}". Russian → Russian. English → English. NEVER translate.
2. FACTS: DO NOT add facts, events, times, places, or details that are NOT in "{message}". Only restyle what's already there.
3. MEANING: Keep the exact same meaning. Do not invent new information.

Task:
- Make tone friendly and casual
- Fix grammar mistakes
- Keep brief and natural

SELF-CHECK before answering:
✓ Same language as original?
✓ No new facts added?
✓ Same core meaning?

Your response (same language, no new facts):"""

    response = requests.post(
        f"{OLLAMA_SERVICE_URL}/api/generate",
        json={
            "model": "qwen2.5:7b",
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.6,
                "top_p": 0.9,
                "top_k": 40,
                "num_predict": 250,
                "repeat_penalty": 1.1
            }
        },
        timeout=90
    )
    response.raise_for_status()

    result = response.json()
    result_text = result["response"].strip()

    if (result_text.startswith('"') and result_text.endswith('"')) or \
       (result_text.startswith("'") and result_text.endswith("'")):
        result_text = result_text[1:-1]

    if any('一' <= char <= '鿿' for char in result_text):
        return message

    return result_text.strip()
