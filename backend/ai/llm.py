"""LLM provider abstraction for MoreChats.

Supports:
- Google Gemini (google-genai)
- NVIDIA NIM OpenAI-compatible endpoint
"""

import json
from urllib import request
from urllib.error import HTTPError

from google import genai
from google.genai import types

from backend.config import settings


NVIDIA_CHAT_COMPLETIONS_URL = "https://integrate.api.nvidia.com/v1/chat/completions"


def _active_provider() -> str:
    if settings.nvidia_api_key:
        return "nvidia"
    return "gemini"


def _generate_with_gemini(prompt: str, temperature: float) -> str:
    client = genai.Client(api_key=settings.gemini_api_key)
    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=temperature,
        ),
    )
    return response.text


def _generate_with_nvidia(prompt: str, temperature: float) -> str:
    model_name = settings.gemini_model
    if "/" not in model_name:
        model_name = f"google/{model_name}"

    payload = {
        "model": model_name,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperature,
        "response_format": {"type": "json_object"},
    }
    body = json.dumps(payload).encode("utf-8")
    req = request.Request(
        NVIDIA_CHAT_COMPLETIONS_URL,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.nvidia_api_key}",
        },
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=60) as resp:
            raw = resp.read().decode("utf-8")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"NVIDIA API error {exc.code}: {detail}") from exc

    data = json.loads(raw)
    return data["choices"][0]["message"]["content"]


def generate_json(prompt: str, temperature: float = 0.4) -> str:
    provider = _active_provider()
    if provider == "nvidia":
        return _generate_with_nvidia(prompt, temperature)
    return _generate_with_gemini(prompt, temperature)


def get_active_model() -> str:
    return settings.gemini_model


def get_active_provider() -> str:
    return _active_provider()
