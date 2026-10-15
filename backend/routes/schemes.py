from __future__ import annotations

from fastapi import APIRouter

from backend.adapters.database import get_db
from backend.contracts.schemas import SchemeListItem, SchemeListResponse

router = APIRouter(prefix="/api/schemes", tags=["schemes"])


@router.get("", response_model=SchemeListResponse)
async def list_schemes():
    db = await get_db()
    cursor = await db.execute(
        """SELECT d.id, d.scheme_name, d.version, d.extraction_confidence,
                  d.upload_timestamp, COUNT(r.id) as rule_count
           FROM documents d
           LEFT JOIN rules r ON r.document_id = d.id
           GROUP BY d.id
           ORDER BY d.upload_timestamp DESC""",
    )
    rows = await cursor.fetchall()

    schemes = [
        SchemeListItem(
            document_id=row["id"],
            scheme_name=row["scheme_name"],
            version=row["version"],
            rule_count=row["rule_count"],
            extraction_confidence=row["extraction_confidence"],
            upload_timestamp=row["upload_timestamp"],
        )
        for row in rows
    ]

    return SchemeListResponse(schemes=schemes, total=len(schemes))
