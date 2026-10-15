from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend.adapters.database import get_db
from backend.application.eligibility_service import check_eligibility, get_session_trace
from backend.contracts.errors import ApiError, ErrorCode, Remediation
from backend.contracts.schemas import (
    EligibilityCheckRequest,
    EligibilityCheckResponse,
    SessionTraceResponse,
)

router = APIRouter(prefix="/api/eligibility", tags=["eligibility"])


@router.post("/check", response_model=EligibilityCheckResponse)
async def check(request: EligibilityCheckRequest):
    db = await get_db()

    profile_dict = request.profile.model_dump(exclude_none=False)
    extra = request.profile.model_extra or {}
    profile_dict.update(extra)

    try:
        result = await check_eligibility(db, request.document_id, profile_dict, lang=request.lang)
    except ValueError as exc:
        raise HTTPException(
            status_code=404,
            detail=ApiError(
                code=ErrorCode.SCHEME_NOT_FOUND,
                category="input",
                message=str(exc),
                remediation=Remediation(action="Upload a policy document first"),
            ).model_dump(),
        ) from exc

    return result


@router.get("/history")
async def get_history():
    db = await get_db()
    rows = await db.execute(
        """SELECT eb.id as bundle_id, eb.session_id, eb.scheme_id as document_id,
                  eb.overall_verdict, eb.summary, eb.timestamp,
                  d.scheme_name
           FROM evidence_bundles eb
           LEFT JOIN documents d ON d.id = eb.scheme_id
           INNER JOIN (
               SELECT scheme_id, MAX(timestamp) as max_ts
               FROM evidence_bundles
               GROUP BY scheme_id
           ) latest ON eb.scheme_id = latest.scheme_id AND eb.timestamp = latest.max_ts
           ORDER BY eb.timestamp DESC
           LIMIT 50"""
    )
    assessments = []
    for row in await rows.fetchall():
        assessments.append({
            "bundle_id": row["bundle_id"],
            "session_id": row["session_id"],
            "document_id": row["document_id"],
            "scheme_name": row["scheme_name"] or "Unknown Scheme",
            "overall_verdict": row["overall_verdict"],
            "summary": row["summary"],
            "timestamp": row["timestamp"],
        })
    return {"assessments": assessments, "total": len(assessments)}


@router.get("/{session_id}/trace", response_model=SessionTraceResponse)
async def get_trace(session_id: str):
    db = await get_db()
    result = await get_session_trace(db, session_id)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail=ApiError(
                code=ErrorCode.SCHEME_NOT_FOUND,
                category="input",
                message=f"Session '{session_id}' not found",
                remediation=Remediation(action="Run an eligibility check first"),
            ).model_dump(),
        )

    return result
