"""Fire-and-forget webhook triggers for n8n integration."""
from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

N8N_BASE_URL = "http://localhost:5678"


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


async def notify_document_ingested(
    document_id: str,
    scheme_name: str,
    rule_count: int,
    confidence: float,
) -> bool:
    return await trigger_webhook("document-ingested", {
        "event": "document_ingested",
        "document_id": document_id,
        "scheme_name": scheme_name,
        "rule_count": rule_count,
        "confidence": confidence,
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
