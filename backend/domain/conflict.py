"""Detect contradictory or overlapping rules across policy documents."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from backend.domain.rule import PolicyRule


@dataclass(frozen=True)
class RuleConflict:
    conflict_id: str
    field: str
    rule_a: PolicyRule
    rule_b: PolicyRule
    conflict_type: str  # "threshold_mismatch", "operator_contradiction", "value_overlap"
    severity: str  # "high", "medium", "low"
    description: str
    recommendation: str


def detect_conflicts(
    rules_a: list[PolicyRule],
    rules_b: list[PolicyRule],
    label_a: str = "Document A",
    label_b: str = "Document B",
) -> list[RuleConflict]:
    conflicts: list[RuleConflict] = []
    idx = 0

    a_by_field: dict[str, list[PolicyRule]] = {}
    for r in rules_a:
        a_by_field.setdefault(r.field, []).append(r)

    b_by_field: dict[str, list[PolicyRule]] = {}
    for r in rules_b:
        b_by_field.setdefault(r.field, []).append(r)

    common_fields = set(a_by_field.keys()) & set(b_by_field.keys())

    for field in sorted(common_fields):
        for ra in a_by_field[field]:
            for rb in b_by_field[field]:
                conflict = _compare_rules(ra, rb, label_a, label_b, idx)
                if conflict:
                    conflicts.append(conflict)
                    idx += 1

    return conflicts


def _compare_rules(
    ra: PolicyRule,
    rb: PolicyRule,
    label_a: str,
    label_b: str,
    idx: int,
) -> RuleConflict | None:
    if ra.operator == rb.operator and _values_equal(ra.value, rb.value):
        return None

    numeric_ops = {"greater_than", "greater_than_or_equal", "less_than", "less_than_or_equal"}

    if ra.operator in numeric_ops and rb.operator in numeric_ops:
        va = _to_num(ra.value)
        vb = _to_num(rb.value)
        if va is not None and vb is not None and va != vb:
            severity = "high" if abs(va - vb) / max(abs(va), abs(vb), 1) > 0.2 else "medium"
            return RuleConflict(
                conflict_id=f"conflict_{idx:03d}",
                field=ra.field,
                rule_a=ra,
                rule_b=rb,
                conflict_type="threshold_mismatch",
                severity=severity,
                description=(
                    f"{ra.field_label}: {label_a} requires {ra.operator} {ra.value}, "
                    f"but {label_b} requires {rb.operator} {rb.value}"
                ),
                recommendation=f"Use the stricter threshold or check which document is more recent",
            )

    if ra.operator == "equals" and rb.operator == "equals" and not _values_equal(ra.value, rb.value):
        return RuleConflict(
            conflict_id=f"conflict_{idx:03d}",
            field=ra.field,
            rule_a=ra,
            rule_b=rb,
            conflict_type="value_overlap",
            severity="high",
            description=(
                f"{ra.field_label}: {label_a} requires '{ra.value}', "
                f"but {label_b} requires '{rb.value}'"
            ),
            recommendation="These documents have contradictory requirements for this field",
        )

    upper_a = ra.operator in ("less_than", "less_than_or_equal")
    lower_b = rb.operator in ("greater_than", "greater_than_or_equal")
    if upper_a and lower_b:
        va = _to_num(ra.value)
        vb = _to_num(rb.value)
        if va is not None and vb is not None and va < vb:
            return RuleConflict(
                conflict_id=f"conflict_{idx:03d}",
                field=ra.field,
                rule_a=ra,
                rule_b=rb,
                conflict_type="operator_contradiction",
                severity="high",
                description=(
                    f"{ra.field_label}: {label_a} caps at {ra.value}, "
                    f"but {label_b} requires minimum {rb.value} — impossible to satisfy both"
                ),
                recommendation="These requirements are mutually exclusive",
            )

    lower_a = ra.operator in ("greater_than", "greater_than_or_equal")
    upper_b = rb.operator in ("less_than", "less_than_or_equal")
    if lower_a and upper_b:
        va = _to_num(ra.value)
        vb = _to_num(rb.value)
        if va is not None and vb is not None and va > vb:
            return RuleConflict(
                conflict_id=f"conflict_{idx:03d}",
                field=ra.field,
                rule_a=ra,
                rule_b=rb,
                conflict_type="operator_contradiction",
                severity="high",
                description=(
                    f"{ra.field_label}: {label_a} requires minimum {ra.value}, "
                    f"but {label_b} caps at {rb.value} — impossible to satisfy both"
                ),
                recommendation="These requirements are mutually exclusive",
            )

    if ra.operator != rb.operator:
        return RuleConflict(
            conflict_id=f"conflict_{idx:03d}",
            field=ra.field,
            rule_a=ra,
            rule_b=rb,
            conflict_type="operator_contradiction",
            severity="low",
            description=(
                f"{ra.field_label}: {label_a} uses '{ra.operator}' while {label_b} uses '{rb.operator}'"
            ),
            recommendation="Different evaluation logic for the same field — verify intent",
        )

    return None


def _to_num(val: Any) -> float | None:
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        try:
            return float(val.replace(",", ""))
        except ValueError:
            return None
    return None


def _values_equal(a: Any, b: Any) -> bool:
    if a == b:
        return True
    na, nb = _to_num(a), _to_num(b)
    if na is not None and nb is not None:
        return na == nb
    return str(a).lower().strip() == str(b).lower().strip()
