from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass(frozen=True)
class SourceCitation:
    document_id: str
    scheme_name: str
    section: str | None = None
    page: int | None = None
    text: str = ""


@dataclass(frozen=True)
class EligibilityEvidence:
    """Immutable, hash-authenticated evidence record for a single rule evaluation."""

    evidence_id: str
    rule_id: str
    field: str
    field_label: str
    operator: str
    rule_value: Any
    user_value: Any
    verdict: str  # "pass", "fail", "unknown"
    confidence: str  # "observed", "derived", "inferred"
    source: SourceCitation
    limitations: str | None = None
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    @staticmethod
    def build(
        rule_id: str,
        field: str,
        field_label: str,
        operator: str,
        rule_value: Any,
        user_value: Any,
        verdict: bool | None,
        source: SourceCitation,
        confidence: str = "observed",
        limitations: str | None = None,
    ) -> EligibilityEvidence:
        verdict_str = {True: "pass", False: "fail", None: "unknown"}[verdict]

        hash_input = f"{rule_id}|{field}|{user_value}|{verdict_str}"
        content_hash = hashlib.sha256(hash_input.encode()).hexdigest()[:16]
        evidence_id = f"elig_{content_hash}"

        if user_value is None:
            confidence = "inferred"
            limitations = limitations or f"No value provided for '{field_label}'"

        return EligibilityEvidence(
            evidence_id=evidence_id,
            rule_id=rule_id,
            field=field,
            field_label=field_label,
            operator=operator,
            rule_value=rule_value,
            user_value=user_value,
            verdict=verdict_str,
            confidence=confidence,
            source=source,
            limitations=limitations,
        )
