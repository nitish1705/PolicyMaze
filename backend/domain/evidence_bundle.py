from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from datetime import datetime, timezone

from backend.domain.evidence import EligibilityEvidence
from backend.domain.unknown import ResidualUnknown


@dataclass(frozen=True)
class EligibilityEvidenceBundle:
    """Aggregated eligibility assessment — the final deliverable."""

    bundle_id: str
    session_id: str
    document_id: str
    scheme_name: str
    profile_id: str
    overall_verdict: str  # ELIGIBLE, NOT_ELIGIBLE, PARTIAL, INSUFFICIENT_DATA
    matched_criteria: tuple[EligibilityEvidence, ...]
    disqualifying_criteria: tuple[EligibilityEvidence, ...]
    missing_information: tuple[ResidualUnknown, ...]
    all_evidence: tuple[EligibilityEvidence, ...]
    summary: str
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    @staticmethod
    def build(
        session_id: str,
        document_id: str,
        scheme_name: str,
        profile_id: str,
        overall_verdict: str,
        evidence_list: list[EligibilityEvidence],
        unknowns: list[ResidualUnknown],
    ) -> EligibilityEvidenceBundle:
        matched = tuple(e for e in evidence_list if e.verdict == "pass")
        disqualifying = tuple(e for e in evidence_list if e.verdict == "fail")
        missing = tuple(unknowns)

        hash_input = f"{session_id}|{document_id}|{profile_id}|{overall_verdict}"
        bundle_id = f"bundle_{hashlib.sha256(hash_input.encode()).hexdigest()[:12]}"

        total = len(evidence_list)
        passed = len(matched)
        failed = len(disqualifying)
        unknown = total - passed - failed

        if overall_verdict == "ELIGIBLE":
            summary = f"Eligible for {scheme_name}. All {passed} criteria met."
        elif overall_verdict == "NOT_ELIGIBLE":
            reasons = ", ".join(e.field_label for e in disqualifying[:3])
            summary = f"Not eligible for {scheme_name}. Failed on: {reasons}."
        elif overall_verdict == "PARTIAL":
            summary = (
                f"Partial eligibility for {scheme_name}. "
                f"{passed} criteria met, {unknown} require more information."
            )
        else:
            summary = (
                f"Cannot determine eligibility for {scheme_name}. "
                f"{unknown} required fields missing."
            )

        return EligibilityEvidenceBundle(
            bundle_id=bundle_id,
            session_id=session_id,
            document_id=document_id,
            scheme_name=scheme_name,
            profile_id=profile_id,
            overall_verdict=overall_verdict,
            matched_criteria=matched,
            disqualifying_criteria=disqualifying,
            missing_information=missing,
            all_evidence=tuple(evidence_list),
            summary=summary,
        )
