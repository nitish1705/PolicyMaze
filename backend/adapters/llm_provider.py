from __future__ import annotations

import json
import logging
import re

from groq import Groq

from backend.config import settings
from backend.prompts.rule_extraction import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE

logger = logging.getLogger(__name__)

_client: Groq | None = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=settings.groq_api_key)
    return _client


def _clean_json_response(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


def extract_rules_with_llm(
    text: str,
    scheme_name: str,
    version: str | None = None,
    model: str = "qwen/qwen3.8-27b",
) -> list[dict]:
    client = _get_client()

    user_prompt = USER_PROMPT_TEMPLATE.format(
        scheme_name=scheme_name,
        version=version or "N/A",
        text=text[:12000],
    )

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0,
            max_tokens=4096,
            response_format={"type": "json_object"},
        )
    except Exception:
        logger.exception("Groq API call failed")
        return []

    raw = response.choices[0].message.content or ""
    raw = _clean_json_response(raw)

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        logger.error("Failed to parse LLM JSON response: %s", raw[:200])
        return []

    if isinstance(parsed, dict):
        for key in ("rules", "eligibility_criteria", "criteria", "results"):
            if key in parsed and isinstance(parsed[key], list):
                return parsed[key]
        return []

    if isinstance(parsed, list):
        return parsed

    return []
