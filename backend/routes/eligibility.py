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
        result = await check_eligibility(db, request.document_id, profile_dict)
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
