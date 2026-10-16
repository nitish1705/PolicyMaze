"""Fire-and-forget webhook triggers for n8n integration."""
from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

from backend.config import settings

N8N_BASE_URL = settings.n8n_base_url


async def trigger_webhook(
    path: str,
    payload: dict[str, Any],
    base_url: str = N8N_BASE_URL,
) -> bool:
    url = f"{base_url}/webhook/{path}"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(url, json=payload)
            logger.info("n8n webhook %s: status %d", path, resp.status_code)
            return resp.status_code < 400
    except Exception:
        logger.debug("n8n webhook %s unreachable (n8n may not be running)", path)
        return False


async def notify_citizen_document_uploaded(
    document_id: str,
    doc_type: str,
    fields_extracted: int,
    user_id: str | None = None,
) -> bool:
    return await trigger_webhook("citizen-document-uploaded", {
        "event": "citizen_document_uploaded",
        "document_id": document_id,
        "doc_type": doc_type,
        "fields_extracted": fields_extracted,
        "user_id": user_id,
    })


async def notify_eligibility_checked(
    session_id: str,
    scheme_name: str,
    verdict: str,
    matched: int,
    failed: int,
    unknown: int,
) -> bool:
    return await trigger_webhook("eligibility-checked", {
        "event": "eligibility_checked",
        "session_id": session_id,
        "scheme_name": scheme_name,
        "verdict": verdict,
        "matched": matched,
        "failed": failed,
        "unknown": unknown,
    })


async def notify_conflict_detected(
    document_a: str,
    document_b: str,
    conflict_count: int,
    high_severity: int,
) -> bool:
    return await trigger_webhook("conflict-detected", {
        "event": "conflict_detected",
        "document_a": document_a,
        "document_b": document_b,
        "conflict_count": conflict_count,
        "high_severity_count": high_severity,
    })
