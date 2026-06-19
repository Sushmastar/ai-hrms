"""
Gemini API wrapper with retry logic, system prompting, and response parsing.
Uses google-generativeai SDK (free-tier compatible).
"""

import json
import re
from typing import Optional, Any
from loguru import logger
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import google.generativeai as genai
from config import settings

# Configure Gemini SDK once at module load
genai.configure(api_key=settings.GEMINI_API_KEY)

SAFE_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_ONLY_HIGH"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_ONLY_HIGH"},
]

GENERATION_CONFIG = genai.types.GenerationConfig(
    temperature=settings.TEMPERATURE,
    max_output_tokens=settings.MAX_TOKENS,
    candidate_count=1,
)


def _get_model(model_name: str = "gemini-2.5-flash") -> genai.GenerativeModel:
    """Get a configured Gemini model instance. Flash is free-tier friendly."""
    return genai.GenerativeModel(
        model_name=model_name,
        generation_config=GENERATION_CONFIG,
        safety_settings=SAFE_SETTINGS,
    )


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type(Exception),
    reraise=True,
)
async def generate_text(
    prompt: str,
    system_instruction: Optional[str] = None,
    model_name: str = "gemini-2.5-flash",
) -> str:
    """
    Generate text from Gemini with retry logic.
    Returns raw string response.
    """
    try:
        if system_instruction:
            model = genai.GenerativeModel(
                model_name=model_name,
                generation_config=GENERATION_CONFIG,
                safety_settings=SAFE_SETTINGS,
                system_instruction=system_instruction,
            )
        else:
            model = _get_model(model_name)

        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        logger.warning(f"Gemini API error (will retry): {e}")
        raise


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    reraise=True,
)
async def generate_json(
    prompt: str,
    system_instruction: Optional[str] = None,
    fallback: Optional[Any] = None,
) -> Any:
    """
    Generate and parse a JSON response from Gemini.
    Cleans markdown fences before parsing.
    Falls back to `fallback` value on parse failure.
    """
    raw = await generate_text(prompt, system_instruction)
    return parse_json_response(raw, fallback)


def parse_json_response(text: str, fallback: Any = None) -> Any:
    """
    Robustly extract JSON from a Gemini response.
    Handles ```json ... ``` fences and bare JSON.
    """
    # Strip markdown fences
    cleaned = re.sub(r"```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    cleaned = cleaned.replace("```", "").strip()

    # Try direct parse
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Try extracting JSON object/array with regex
    match = re.search(r"(\{.*\}|\[.*\])", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass

    logger.error(f"Failed to parse JSON from Gemini response:\n{text[:500]}")
    return fallback


async def chat_session(history: list[dict], new_message: str, system_instruction: str) -> str:
    """
    Continue a multi-turn conversation with Gemini.
    history: list of {"role": "user"|"model", "parts": ["text"]}
    """
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        generation_config=GENERATION_CONFIG,
        safety_settings=SAFE_SETTINGS,
        system_instruction=system_instruction,
    )

    chat = model.start_chat(history=history)

    try:
        response = chat.send_message(new_message)
        return response.text
    except Exception as e:
        logger.error(f"Chat session error: {e}")
        raise
