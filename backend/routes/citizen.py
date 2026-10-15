from __future__ import annotations

import hashlib
import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel

from backend.adapters.database import get_db
from backend.routes.auth import get_optional_user
from backend.adapters.llm_provider import _get_client, _clean_json_response
from backend.adapters.pdf_provider import parse_pdf
from backend.config import settings
from backend.prompts.document_extraction import (
    ALL_DOCUMENT_TYPES,
    DOCUMENT_EXTRACT_SYSTEM,
    DOCUMENT_EXTRACT_USER,
    FIELD_TO_DOCUMENTS,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/citizen", tags=["citizen"])


class CitizenDocument(BaseModel):
    id: str
    doc_type: str
    filename: str
    extracted_fields: dict
    upload_timestamp: str


class CitizenDocumentsResponse(BaseModel):
    documents: list[CitizenDocument]
    aggregated_profile: dict


class RequiredDocument(BaseModel):
    doc_type: str
    covers_fields: list[str]
    is_uploaded: bool


class RequiredDocumentsResponse(BaseModel):
    required: list[RequiredDocument]
    profile_coverage: dict
    missing_fields: list[str]
    covered_fields: list[str]


def _extract_fields_from_text(text: str, doc_type: str, filename: str) -> dict:
    client = _get_client()
    prompt = DOCUMENT_EXTRACT_USER.format(
        doc_type=doc_type, filename=filename, text=text[:8000]
    )
    try:
        response = client.chat.completions.create(
            model="qwen/qwen3.8-27b",
            messages=[
                {"role": "system", "content": DOCUMENT_EXTRACT_SYSTEM},
                {"role": "user", "content": prompt},
            ],
            temperature=0,
            max_tokens=2048,
            response_format={"type": "json_object"},
        )
        raw = _clean_json_response(response.choices[0].message.content or "{}")
        return json.loads(raw)
    except Exception:
        logger.exception("Failed to extract fields from document")
        return {}


def _extract_fields_from_image(file_path, doc_type: str, filename: str) -> dict:
    import io

    import pymupdf

    try:
        doc = pymupdf.open(str(file_path))
        ocr_texts = []
        for page in doc:
            pix = page.get_pixmap(dpi=300)
            img_bytes = pix.tobytes("png")
            from PIL import Image
            import pytesseract
            img = Image.open(io.BytesIO(img_bytes))
            ocr_text = pytesseract.image_to_string(img)
            ocr_texts.append(ocr_text)
        doc.close()
        text = "\n".join(ocr_texts).strip()
    except Exception:
        logger.exception("OCR extraction failed")
        return {}

    if not text:
        return {}

    logger.info("OCR extracted %d chars from scanned PDF", len(text))
    return _extract_fields_from_text(text, doc_type, filename)


def _aggregate_profile(documents: list[dict]) -> dict:
    profile: dict = {}
    for doc in documents:
        fields = doc.get("extracted_fields", {})
        if isinstance(fields, str):
            fields = json.loads(fields)
        for k, v in fields.items():
            if v is not None and v != "" and k not in profile:
                profile[k] = v

    if "age" not in profile and "date_of_birth" in profile:
        try:
            from datetime import date
            dob = date.fromisoformat(str(profile["date_of_birth"]))
            today = date.today()
            age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
            profile["age"] = age
        except Exception:
            pass

    return profile


@router.get("/document-types")
async def list_document_types():
    return {"types": ALL_DOCUMENT_TYPES}


@router.post("/documents", response_model=CitizenDocument)
async def upload_citizen_document(
    request: Request,
    file: UploadFile = File(...),
    doc_type: str = Form(...),
    user: dict | None = Depends(get_optional_user),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    upload_dir = settings.upload_abs_path / "citizen"
    upload_dir.mkdir(parents=True, exist_ok=True)

    content = await file.read()
    file_path = upload_dir / f"{uuid.uuid4().hex}_{file.filename}"
    file_path.write_bytes(content)

    is_pdf = file.filename.lower().endswith(".pdf")
    text = ""
    if is_pdf:
        try:
            parsed = parse_pdf(file_path)
            text = parsed.markdown_text
        except Exception:
            text = ""
    else:
        try:
            text = content.decode("utf-8", errors="ignore")
        except Exception:
            text = ""

    if text.strip():
        extracted = _extract_fields_from_text(text, doc_type, file.filename)
    elif is_pdf:
        extracted = _extract_fields_from_image(file_path, doc_type, file.filename)
    else:
        extracted = {}

    doc_id = f"cdoc_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    user_id = user["id"] if user else None

    db = await get_db()
    await db.execute(
        """INSERT INTO citizen_documents (id, user_id, doc_type, filename, raw_text, extracted_fields, upload_timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (doc_id, user_id, doc_type, file.filename, text[:5000], json.dumps(extracted), now),
    )
    await db.commit()

    return CitizenDocument(
        id=doc_id,
        doc_type=doc_type,
        filename=file.filename,
        extracted_fields=extracted,
        upload_timestamp=now,
    )


@router.get("/documents", response_model=CitizenDocumentsResponse)
async def list_citizen_documents(request: Request, user: dict | None = Depends(get_optional_user)):
    db = await get_db()
    user_id = user["id"] if user else None
    if user_id:
        rows = await db.execute("SELECT * FROM citizen_documents WHERE user_id = ? ORDER BY upload_timestamp DESC", (user_id,))
    else:
        rows = await db.execute("SELECT * FROM citizen_documents WHERE user_id IS NULL ORDER BY upload_timestamp DESC")
    docs = await rows.fetchall()

    documents = []
    raw_docs = []
    for row in docs:
        fields = row["extracted_fields"]
        if isinstance(fields, str):
            fields = json.loads(fields)
        documents.append(CitizenDocument(
            id=row["id"],
            doc_type=row["doc_type"],
            filename=row["filename"],
            extracted_fields=fields,
            upload_timestamp=row["upload_timestamp"],
        ))
        raw_docs.append({"extracted_fields": fields})

    return CitizenDocumentsResponse(
        documents=documents,
        aggregated_profile=_aggregate_profile(raw_docs),
    )


@router.delete("/documents/{doc_id}")
async def delete_citizen_document(doc_id: str):
    db = await get_db()
    await db.execute("DELETE FROM citizen_documents WHERE id = ?", (doc_id,))
    await db.commit()
    return {"status": "deleted", "id": doc_id}


@router.get("/profile")
async def get_citizen_profile(request: Request, user: dict | None = Depends(get_optional_user)):
    db = await get_db()
    user_id = user["id"] if user else None
    if user_id:
        rows = await db.execute("SELECT extracted_fields FROM citizen_documents WHERE user_id = ?", (user_id,))
    else:
        rows = await db.execute("SELECT extracted_fields FROM citizen_documents WHERE user_id IS NULL")
    docs = [{"extracted_fields": row["extracted_fields"]} for row in await rows.fetchall()]
    return {"profile": _aggregate_profile(docs)}


COMMON_ELIGIBILITY_FIELDS = [
    "age", "gender", "annual_income", "category", "state",
    "residence_type", "occupation", "education",
]

ELIGIBILITY_TEXT_KEYWORDS: dict[str, list[str]] = {
    "age": ["age", "years old", "born", "minor", "adult", "senior citizen"],
    "gender": ["gender", "women", "female", "male", "girl", "boy", "transgender"],
    "annual_income": ["income", "earning", "salary", "lakh", "bpl", "below poverty"],
    "annual_family_income": ["family income", "household income"],
    "category": ["caste", "sc", "st", "obc", "ews", "general", "scheduled", "backward"],
    "state": ["domicile", "resident of", "state"],
    "residence_type": ["rural", "urban", "village", "city"],
    "occupation": ["occupation", "employed", "farmer", "worker", "self-employed"],
    "is_farmer": ["farmer", "agriculture", "cultivat", "kisan"],
    "is_student": ["student", "enrolled", "studying", "education"],
    "education": ["education", "literate", "class", "degree", "graduate", "matricul"],
    "marital_status": ["married", "widow", "divorced", "unmarried", "single"],
    "disability": ["disability", "disabled", "handicap", "divyang"],
    "land_ownership": ["land", "landless", "hectare", "acre"],
    "bpl": ["bpl", "below poverty", "poverty line"],
    "bank_account": ["bank account", "bank", "jan dhan"],
    "aadhaar_card": ["aadhaar", "aadhar", "uid"],
}


def _infer_fields_from_text(text: str) -> list[str]:
    text_lower = text.lower()
    fields = []
    for field, keywords in ELIGIBILITY_TEXT_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            fields.append(field)
    return fields if fields else COMMON_ELIGIBILITY_FIELDS


def _score_scheme(row: dict, profile: dict) -> tuple[int, list[str]]:
    """Score a catalog scheme against a citizen profile. Returns (score, reasons)."""
    score = 0
    reasons: list[str] = []

    tags_raw = row.get("tags") or ""
    try:
        tags: list[str] = json.loads(tags_raw) if tags_raw.startswith("[") else [t.strip() for t in tags_raw.split(",") if t.strip()]
    except Exception:
        tags = [t.strip() for t in tags_raw.split(",") if t.strip()]
    tags_lower = [t.lower() for t in tags]

    eligibility = ((row.get("eligibility_text") or "") + " " + (row.get("description") or "")).lower()
    level = str(row.get("level") or "").lower()
    scheme_state = str(row.get("state") or "").lower()

    # Central schemes get a small base score — relevant to everyone
    if "central" in level:
        score += 1

    # State match
    citizen_state = str(profile.get("state", "")).lower()
    if citizen_state and scheme_state and (citizen_state in scheme_state or scheme_state in citizen_state):
        score += 4
        reasons.append(f"{profile.get('state')} state scheme")

    # Category match (SC / ST / OBC / EWS / BPL)
    category = str(profile.get("category", "")).lower()
    CATEGORY_MAP = {
        "sc": ["sc", "scheduled caste", "dalit"],
        "st": ["st", "scheduled tribe", "tribal", "adivasi"],
        "obc": ["obc", "other backward"],
        "ews": ["ews", "economically weaker"],
        "general": [],
    }
    for cat_key, cat_terms in CATEGORY_MAP.items():
        if cat_key in category or any(t in category for t in cat_terms):
            all_terms = [cat_key] + cat_terms
            if any(t in tags_lower for t in all_terms) or any(t in eligibility for t in all_terms):
                score += 4
                reasons.append(f"{cat_key.upper()} category")
            break

    # BPL / low income
    income = profile.get("annual_income") or profile.get("annual_family_income")
    if income is not None:
        try:
            income_val = float(income)
            if income_val < 100000 and ("bpl" in eligibility or "below poverty" in eligibility):
                score += 3
                reasons.append("BPL income")
            if income_val < 200000 and ("2 lakh" in eligibility or "2,00,000" in eligibility or "1.5 lakh" in eligibility):
                score += 2
                reasons.append("Low income")
        except (ValueError, TypeError):
            pass

    # Farmer
    occupation = str(profile.get("occupation", "")).lower()
    FARMER_TERMS = ["farmer", "kisan", "agriculture", "cultivat", "farming"]
    if any(t in occupation for t in FARMER_TERMS):
        if any(t in tags_lower for t in FARMER_TERMS) or any(t in eligibility for t in FARMER_TERMS):
            score += 4
            reasons.append("For farmers")

    # Senior citizen
    age = profile.get("age")
    if age is not None:
        try:
            age_val = int(age)
            if age_val >= 60 and ("senior" in eligibility or "elderly" in eligibility or "old age" in eligibility):
                score += 3
                reasons.append("Senior citizen")
        except (ValueError, TypeError):
            pass

    # Gender
    gender = str(profile.get("gender", "")).lower()
    if "female" in gender or "woman" in gender or "girl" in gender:
        if any(t in tags_lower for t in ["women", "woman", "girl", "female", "mahila"]) or \
           any(t in eligibility for t in ["women", "girl", "female", "mahila"]):
            score += 3
            reasons.append("For women")

    # Disability
    if profile.get("disability") or "disabled" in occupation:
        if any(t in eligibility for t in ["disabled", "disability", "divyang", "handicap"]):
            score += 3
            reasons.append("For disabled persons")

    # Student / education
    if profile.get("is_student") or "student" in occupation:
        if any(t in tags_lower for t in ["student", "education", "scholarship"]) or \
           any(t in eligibility for t in ["student", "scholarship", "education"]):
            score += 3
            reasons.append("For students")

    # General keyword overlap from known profile fields
    FIELD_KEYWORDS = {
        "land_ownership": ["land", "landless", "landowner", "hectare", "acre"],
        "aadhaar_card": ["aadhaar", "aadhar"],
        "bank_account": ["bank account", "jan dhan"],
        "residence_type": ["rural", "urban"],
    }
    for field, keywords in FIELD_KEYWORDS.items():
        if field in profile:
            if any(kw in eligibility for kw in keywords):
                score += 1

    return score, reasons


@router.get("/recommendations")
async def get_recommendations(request: Request, user: dict | None = Depends(get_optional_user)):
    db = await get_db()
    user_id = user["id"] if user else None

    # Load citizen profile
    if user_id:
        rows = await db.execute("SELECT extracted_fields FROM citizen_documents WHERE user_id = ?", (user_id,))
    else:
        rows = await db.execute("SELECT extracted_fields FROM citizen_documents WHERE user_id IS NULL")
    docs = [{"extracted_fields": row["extracted_fields"]} for row in await rows.fetchall()]
    profile = _aggregate_profile(docs)

    if not profile:
        return {"recommendations": [], "profile_field_count": 0}

    # Fetch a broad sample from catalog (avoid full table scan on large DBs)
    cursor = await db.execute(
        """SELECT id, name, level, state, category, tags, description,
                  eligibility_text, has_structured_rules, document_id
           FROM scheme_catalog
           ORDER BY RANDOM()
           LIMIT 600"""
    )
    schemes = await cursor.fetchall()

    scored = []
    for s in schemes:
        row = dict(s)
        score, reasons = _score_scheme(row, profile)
        if score >= 3:
            tags_raw = row.get("tags") or ""
            try:
                tags = json.loads(tags_raw) if tags_raw.startswith("[") else [t.strip() for t in tags_raw.split(",") if t.strip()]
            except Exception:
                tags = [t.strip() for t in tags_raw.split(",") if t.strip()]

            scored.append({
                "id": row["id"],
                "name": row["name"],
                "level": row["level"] or "",
                "state": row["state"],
                "description": (row["description"] or "")[:200],
                "tags": [t for t in tags[:5] if t],
                "match_score": score,
                "match_reasons": reasons[:3],
                "has_structured_rules": bool(row["has_structured_rules"]),
                "document_id": row["document_id"],
            })

    scored.sort(key=lambda x: (x["match_score"], x["has_structured_rules"]), reverse=True)

    return {"recommendations": scored[:8], "profile_field_count": len(profile)}


@router.get("/required-documents/{document_id}", response_model=RequiredDocumentsResponse)
async def get_required_documents(document_id: str, request: Request, user: dict | None = Depends(get_optional_user)):
    db = await get_db()
    user_id = user["id"] if user else None

    rule_rows = await db.execute(
        "SELECT DISTINCT field FROM rules WHERE document_id = ?", (document_id,)
    )
    fields_needed = [row["field"] for row in await rule_rows.fetchall()]

    if not fields_needed:
        catalog_cur = await db.execute(
            "SELECT eligibility_text, exclusions_text, documents_required FROM scheme_catalog WHERE document_id = ?",
            (document_id,),
        )
        catalog_row = await catalog_cur.fetchone()
        if not catalog_row:
            catalog_cur = await db.execute(
                "SELECT eligibility_text, exclusions_text, documents_required FROM scheme_catalog WHERE id = ?",
                (document_id,),
            )
            catalog_row = await catalog_cur.fetchone()

        if catalog_row:
            combined = " ".join(filter(None, [
                catalog_row["eligibility_text"],
                catalog_row["exclusions_text"],
                catalog_row["documents_required"],
            ]))
            fields_needed = _infer_fields_from_text(combined) if combined.strip() else COMMON_ELIGIBILITY_FIELDS
        else:
            fields_needed = COMMON_ELIGIBILITY_FIELDS

    if user_id:
        doc_rows = await db.execute("SELECT doc_type, extracted_fields FROM citizen_documents WHERE user_id = ?", (user_id,))
    else:
        doc_rows = await db.execute("SELECT doc_type, extracted_fields FROM citizen_documents WHERE user_id IS NULL")
    uploaded_docs = await doc_rows.fetchall()
    uploaded_types = {row["doc_type"] for row in uploaded_docs}

    raw_docs = [{"extracted_fields": row["extracted_fields"]} for row in uploaded_docs]
    profile_data = _aggregate_profile(raw_docs)

    covered_fields = [f for f in fields_needed if f in profile_data]
    missing_fields = [f for f in fields_needed if f not in profile_data]

    doc_type_map: dict[str, list[str]] = {}
    for field in missing_fields:
        for dt in FIELD_TO_DOCUMENTS.get(field, ["Supporting Document"]):
            doc_type_map.setdefault(dt, []).append(field)

    required = []
    for dt, fields_list in doc_type_map.items():
        required.append(RequiredDocument(
            doc_type=dt,
            covers_fields=fields_list,
            is_uploaded=dt in uploaded_types,
        ))

    return RequiredDocumentsResponse(
        required=required,
        profile_coverage=profile_data,
        missing_fields=missing_fields,
        covered_fields=covered_fields,
    )
