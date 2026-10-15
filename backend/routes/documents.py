from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from backend.adapters.database import get_db
from backend.adapters.n8n_webhook import notify_document_ingested
from backend.adapters.pdf_provider import parse_pdf
from backend.application.document_service import extract_and_store_rules
from backend.config import settings
from backend.contracts.errors import ApiError, ErrorCode, Remediation
from backend.contracts.schemas import (
    DocumentRulesResponse,
    DocumentUploadResponse,
    ExtractedRule,
)

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    scheme_name: str = Form(...),
    version: str | None = Form(None),
    skip_llm: bool = Form(False),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail=ApiError(
                code=ErrorCode.INVALID_REQUEST,
                category="input",
                message="Only PDF files are supported",
                remediation=Remediation(action="Upload a .pdf file"),
            ).model_dump(),
        )

    upload_dir = settings.upload_abs_path
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / f"{uuid.uuid4().hex}_{file.filename}"

    content = await file.read()
    file_path.write_bytes(content)

    try:
        parsed = parse_pdf(file_path)
    except Exception as exc:
        file_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=422,
            detail=ApiError(
                code=ErrorCode.DOCUMENT_PARSE_FAILED,
                category="extraction",
                message=f"Failed to parse PDF: {exc}",
                retryable=True,
                remediation=Remediation(action="Upload a text-based PDF (not scanned)"),
            ).model_dump(),
        ) from exc

    content_hash = hashlib.sha256(content).hexdigest()
    doc_id = f"doc_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()

    db = await get_db()
    await db.execute(
        """INSERT INTO documents (id, filename, scheme_name, version, raw_text, content_hash, page_count, upload_timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (doc_id, file.filename, scheme_name, version, parsed.markdown_text, content_hash, parsed.page_count, now),
    )
    await db.commit()

    rules = await extract_and_store_rules(
        db=db,
        document_id=doc_id,
        parsed=parsed,
        scheme_name=scheme_name,
        version=version,
        use_llm=not skip_llm,
    )

    avg_conf = sum(r.confidence for r in rules) / len(rules) if rules else None

    await notify_document_ingested(doc_id, scheme_name, len(rules), avg_conf or 0.0)

    return DocumentUploadResponse(
        document_id=doc_id,
        filename=file.filename or "",
        scheme_name=scheme_name,
        version=version,
        page_count=parsed.page_count,
        content_hash=content_hash,
        markdown_preview=parsed.markdown_text[:500],
        extracted_rules_count=len(rules),
        extraction_confidence=avg_conf,
    )


@router.get("/{document_id}/rules", response_model=DocumentRulesResponse)
async def get_document_rules(document_id: str):
    db = await get_db()

    doc_row = await db.execute(
        "SELECT scheme_name, extraction_confidence FROM documents WHERE id = ?",
        (document_id,),
    )
    doc = await doc_row.fetchone()
    if doc is None:
        raise HTTPException(
            status_code=404,
            detail=ApiError(
                code=ErrorCode.SCHEME_NOT_FOUND,
                category="input",
                message=f"Document '{document_id}' not found",
                remediation=Remediation(action="Upload a document first"),
            ).model_dump(),
        )

    rows = await db.execute(
        "SELECT * FROM rules WHERE document_id = ? ORDER BY id",
        (document_id,),
    )
    rule_rows = await rows.fetchall()

    rules = []
    for row in rule_rows:
        value_raw = row["value"]
        try:
            value = json.loads(value_raw)
        except (json.JSONDecodeError, TypeError):
            value = value_raw

        rules.append(ExtractedRule(
            rule_id=row["id"],
            field=row["field"],
            field_label=row["field_label"],
            operator=row["operator"],
            value=value,
            value_type=row["value_type"],
            is_mandatory=bool(row["is_mandatory"]),
            is_exception=bool(row["is_exception"]),
            exception_to=row["exception_to"],
            source_section=row["source_section"],
            source_page=row["source_page"],
            source_text=row["source_text"],
            confidence=row["confidence"],
            notes=row["notes"],
            amendment_reference=row["amendment_reference"],
            external_dependency=row["external_dependency"],
        ))

    return DocumentRulesResponse(
        document_id=document_id,
        scheme_name=doc["scheme_name"],
        rules=rules,
        rule_count=len(rules),
        extraction_confidence=doc["extraction_confidence"],
    )
