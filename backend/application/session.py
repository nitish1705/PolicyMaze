from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

import aiosqlite

from backend.domain.evidence import EligibilityEvidence
from backend.domain.evidence_bundle import EligibilityEvidenceBundle
from backend.domain.unknown import ResidualUnknown


async def create_profile(db: aiosqlite.Connection, profile_data: dict) -> str:
    profile_id = f"prof_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    await db.execute(
        "INSERT INTO profiles (id, data, created_at) VALUES (?, ?, ?)",
        (profile_id, json.dumps(profile_data), now),
    )
    await db.commit()
    return profile_id


async def create_session(db: aiosqlite.Connection, profile_id: str) -> str:
    session_id = f"sess_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    await db.execute(
        "INSERT INTO sessions (id, profile_id, created_at) VALUES (?, ?, ?)",
        (session_id, profile_id, now),
    )
    await db.commit()
    return session_id


async def store_evidence(
    db: aiosqlite.Connection,
    session_id: str,
    evidence: EligibilityEvidence,
) -> None:
    await db.execute(
        """INSERT OR REPLACE INTO evidence_records
           (id, session_id, rule_id, field, verdict, confidence, authority,
            user_value, source_document, source_page, source_section, source_text,
            limitations, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            evidence.evidence_id,
            session_id,
            evidence.rule_id,
            evidence.field,
            evidence.verdict,
            evidence.confidence,
            "deterministic_engine",
            json.dumps(evidence.user_value),
            evidence.source.document_id,
            evidence.source.page,
            evidence.source.section,
            evidence.source.text,
            evidence.limitations,
            evidence.timestamp,
        ),
    )


async def store_bundle(
    db: aiosqlite.Connection,
    bundle: EligibilityEvidenceBundle,
) -> None:
    matched_ids = json.dumps([e.evidence_id for e in bundle.matched_criteria])
    disqualifying_ids = json.dumps([e.evidence_id for e in bundle.disqualifying_criteria])
    missing = json.dumps([
        {"field": u.field, "field_label": u.field_label,
         "recommendation": u.recommendation, "impact": u.impact}
        for u in bundle.missing_information
    ])

    await db.execute(
        """INSERT OR REPLACE INTO evidence_bundles
           (id, session_id, scheme_id, profile_id, overall_verdict,
            matched_criteria, disqualifying_criteria, missing_information,
            summary, conflicts, unknowns, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            bundle.bundle_id,
            bundle.session_id,
            bundle.document_id,
            bundle.profile_id,
            bundle.overall_verdict,
            matched_ids,
            disqualifying_ids,
            missing,
            bundle.summary,
            "[]",
            json.dumps(len(bundle.missing_information)),
            bundle.timestamp,
        ),
    )
    await db.commit()
