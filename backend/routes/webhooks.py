from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from backend.adapters.database import get_db
from backend.application.diff_service import compare_documents, multi_scheme_check

router = APIRouter(prefix="/api", tags=["advanced"])


class DiffRequest(BaseModel):
    document_id_a: str
    document_id_b: str


class MultiCheckRequest(BaseModel):
    document_ids: list[str]
    profile: dict


@router.post("/documents/diff")
async def diff_documents(req: DiffRequest):
    db = await get_db()
    result = await compare_documents(db, req.document_id_a, req.document_id_b)
    return result


@router.post("/eligibility/multi-check")
async def multi_check(req: MultiCheckRequest):
    db = await get_db()
    results = await multi_scheme_check(db, req.document_ids, req.profile)
    verdicts = [r.get("overall_verdict", "ERROR") for r in results]

    return {
        "results": results,
        "summary": {
            "total_schemes": len(results),
            "eligible": verdicts.count("ELIGIBLE"),
            "not_eligible": verdicts.count("NOT_ELIGIBLE"),
            "partial": verdicts.count("PARTIAL"),
            "insufficient_data": verdicts.count("INSUFFICIENT_DATA"),
        },
    }


@router.post("/webhooks/document-ingested")
async def webhook_document_ingested(payload: dict):
    return {"status": "received", "event": "document_ingested", "payload": payload}


@router.post("/webhooks/eligibility-checked")
async def webhook_eligibility_checked(payload: dict):
    return {"status": "received", "event": "eligibility_checked", "payload": payload}


@router.post("/webhooks/conflict-detected")
async def webhook_conflict_detected(payload: dict):
    return {"status": "received", "event": "conflict_detected", "payload": payload}
