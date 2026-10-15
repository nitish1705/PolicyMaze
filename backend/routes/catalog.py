from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException, Query

from backend.adapters.database import get_db
from backend.adapters.llm_provider import extract_rules_with_llm
from backend.application.document_service import _validate_rule, _deduplicate_rules, _regex_pre_extract
from backend.application.seeder import seed_all
from backend.contracts.errors import ApiError, ErrorCode, Remediation

router = APIRouter(prefix="/api/catalog", tags=["catalog"])


@router.get("/filters")
async def get_filters():
    db = await get_db()
    states_cur = await db.execute(
        "SELECT DISTINCT state FROM scheme_catalog WHERE state IS NOT NULL AND state != '' ORDER BY state"
    )
    states = [row["state"] for row in await states_cur.fetchall()]

    categories_cur = await db.execute(
        "SELECT DISTINCT category FROM scheme_catalog WHERE category IS NOT NULL AND category != '' ORDER BY category"
    )
    categories = [row["category"] for row in await categories_cur.fetchall()]

    levels_cur = await db.execute(
        "SELECT DISTINCT level FROM scheme_catalog WHERE level IS NOT NULL AND level != '' ORDER BY level"
    )
    levels = [row["level"] for row in await levels_cur.fetchall()]

    return {"states": states, "categories": categories, "levels": levels}


@router.get("")
async def list_catalog(
    search: str = Query("", description="Search by name, tags, or state"),
    level: str = Query("", description="Filter by level: central, state"),
    state: str = Query("", description="Filter by state"),
    category: str = Query("", description="Filter by category"),
    has_rules: bool | None = Query(None, description="Filter by has structured rules"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    db = await get_db()

    where_clauses = []
    params: list = []

    if search:
        where_clauses.append("(name LIKE ? OR tags LIKE ? OR state LIKE ? OR description LIKE ?)")
        s = f"%{search}%"
        params.extend([s, s, s, s])

    if level:
        where_clauses.append("level LIKE ?")
        params.append(f"%{level}%")

    if state:
        where_clauses.append("state = ?")
        params.append(state)

    if category:
        where_clauses.append("category = ?")
        params.append(category)

    if has_rules is not None:
        where_clauses.append("has_structured_rules = ?")
        params.append(int(has_rules))

    where = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    count_cursor = await db.execute(f"SELECT COUNT(*) as cnt FROM scheme_catalog {where}", params)
    total = (await count_cursor.fetchone())["cnt"]

    offset = (page - 1) * per_page
    cursor = await db.execute(
        f"""SELECT id, name, slug, level, state, ministry, category, tags,
                   description, has_structured_rules, document_id, source_repo
            FROM scheme_catalog {where}
            ORDER BY has_structured_rules DESC, name ASC
            LIMIT ? OFFSET ?""",
        params + [per_page, offset],
    )
    rows = await cursor.fetchall()

    schemes = [
        {
            "id": row["id"],
            "name": row["name"],
            "slug": row["slug"],
            "level": row["level"],
            "state": row["state"],
            "ministry": row["ministry"],
            "category": row["category"],
            "tags": row["tags"],
            "description": (row["description"] or "")[:200],
            "has_structured_rules": bool(row["has_structured_rules"]),
            "document_id": row["document_id"],
            "source_repo": row["source_repo"],
        }
        for row in rows
    ]

    return {
        "schemes": schemes,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }


@router.get("/{catalog_id}")
async def get_catalog_detail(catalog_id: str):
    db = await get_db()
    cursor = await db.execute("SELECT * FROM scheme_catalog WHERE id = ?", (catalog_id,))
    row = await cursor.fetchone()

    if not row:
        raise HTTPException(
            status_code=404,
            detail=ApiError(
                code=ErrorCode.SCHEME_NOT_FOUND,
                category="input",
                message=f"Scheme '{catalog_id}' not found",
                remediation=Remediation(action="Check the catalog list"),
            ).model_dump(),
        )

    return {k: row[k] for k in row.keys()}


@router.post("/{catalog_id}/extract")
async def extract_rules_from_catalog(catalog_id: str):
    """On-demand LLM extraction from a catalog scheme's eligibility text."""
    db = await get_db()
    cursor = await db.execute("SELECT * FROM scheme_catalog WHERE id = ?", (catalog_id,))
    row = await cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Scheme not found")

    if row["has_structured_rules"] and row["document_id"]:
        return {"status": "already_extracted", "document_id": row["document_id"]}

    elig_text = row["eligibility_text"] or ""
    exclusions = row["exclusions_text"] or ""
    full_text = f"Eligibility Criteria:\n{elig_text}\n\nExclusions:\n{exclusions}"

    if len(full_text.strip()) < 20:
        raise HTTPException(status_code=422, detail="No eligibility text available for this scheme")

    import hashlib
    import uuid
    from datetime import datetime, timezone

    name = row["name"]
    doc_id = f"cat_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()

    await db.execute(
        """INSERT OR IGNORE INTO documents
           (id, filename, scheme_name, version, raw_text, content_hash, page_count, upload_timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (doc_id, f"{row['slug']}_extracted", name, None,
         full_text, hashlib.sha256(full_text.encode()).hexdigest(), 1, now),
    )

    regex_rules = _regex_pre_extract(full_text)
    llm_rules = extract_rules_with_llm(full_text, name)

    validated_llm = [r for raw in llm_rules if (r := _validate_rule(raw)) is not None]
    validated_regex = [r for raw in regex_rules if (r := _validate_rule(raw)) is not None]
    merged = _deduplicate_rules(validated_regex, validated_llm)

    for i, raw in enumerate(merged):
        rule_id = f"{doc_id}_rule_{i+1:03d}"
        value = raw["value"]
        value_json = json.dumps(value) if not isinstance(value, str) else value

        await db.execute(
            """INSERT OR REPLACE INTO rules
               (id, document_id, field, field_label, operator, value, value_type,
                is_mandatory, is_exception, exception_to, source_section, source_page,
                source_text, confidence, notes, amendment_reference, external_dependency)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (rule_id, doc_id, raw["field"], raw.get("field_label", ""),
             raw["operator"], value_json, raw["value_type"],
             int(raw.get("is_mandatory", True)), int(raw.get("is_exception", False)),
             raw.get("exception_to"), raw.get("source_section"), raw.get("source_page"),
             raw.get("source_text", ""), float(raw.get("confidence", 0.8)),
             raw.get("notes"), raw.get("amendment_reference"), raw.get("external_dependency")),
        )

    avg_conf = sum(float(r.get("confidence", 0.8)) for r in merged) / len(merged) if merged else 0
    await db.execute(
        "UPDATE documents SET extraction_confidence = ? WHERE id = ?",
        (avg_conf, doc_id),
    )
    await db.execute(
        "UPDATE scheme_catalog SET has_structured_rules = 1, document_id = ? WHERE id = ?",
        (doc_id, catalog_id),
    )
    await db.commit()

    return {
        "status": "extracted",
        "document_id": doc_id,
        "rules_count": len(merged),
        "confidence": avg_conf,
    }


@router.post("/seed")
async def seed_database():
    db = await get_db()
    counts = await seed_all(db)
    return {"status": "seeded", "counts": counts}
