from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ResidualUnknown:
    """Tracks missing data that prevents a complete eligibility determination."""

    field: str
    field_label: str
    recommendation: str
    impact: str

    @staticmethod
    def from_rule(field: str, field_label: str, is_mandatory: bool) -> ResidualUnknown:
        impact = (
            "Cannot determine eligibility without this information"
            if is_mandatory
            else "Optional — eligibility can be partially determined without this"
        )
        return ResidualUnknown(
            field=field,
            field_label=field_label,
            recommendation=f"Please provide your {field_label.lower()}",
            impact=impact,
        )
