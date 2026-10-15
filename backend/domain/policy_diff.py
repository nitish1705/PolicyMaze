"""Diff rules between two document versions."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from backend.domain.rule import PolicyRule


@dataclass(frozen=True)
class RuleDiff:
    field: str
    field_label: str
    change_type: str  # "added", "removed", "modified"
    old_rule: PolicyRule | None
    new_rule: PolicyRule | None
    details: str


def diff_rules(
    old_rules: list[PolicyRule],
    new_rules: list[PolicyRule],
) -> list[RuleDiff]:
    diffs: list[RuleDiff] = []

    old_by_field: dict[str, PolicyRule] = {}
    for r in old_rules:
        key = f"{r.field}_{r.operator}"
        old_by_field[key] = r

    new_by_field: dict[str, PolicyRule] = {}
    for r in new_rules:
        key = f"{r.field}_{r.operator}"
        new_by_field[key] = r

    for key, new_rule in new_by_field.items():
        if key not in old_by_field:
            diffs.append(RuleDiff(
                field=new_rule.field,
                field_label=new_rule.field_label,
                change_type="added",
                old_rule=None,
                new_rule=new_rule,
                details=f"New rule: {new_rule.field_label} {new_rule.operator} {new_rule.value}",
            ))
        else:
            old_rule = old_by_field[key]
            changes = _compare_values(old_rule, new_rule)
            if changes:
                diffs.append(RuleDiff(
                    field=new_rule.field,
                    field_label=new_rule.field_label,
                    change_type="modified",
                    old_rule=old_rule,
                    new_rule=new_rule,
                    details=changes,
                ))

    for key, old_rule in old_by_field.items():
        if key not in new_by_field:
            diffs.append(RuleDiff(
                field=old_rule.field,
                field_label=old_rule.field_label,
                change_type="removed",
                old_rule=old_rule,
                new_rule=None,
                details=f"Removed: {old_rule.field_label} {old_rule.operator} {old_rule.value}",
            ))

    return sorted(diffs, key=lambda d: ("removed", "modified", "added").index(d.change_type))


def _compare_values(old: PolicyRule, new: PolicyRule) -> str | None:
    changes: list[str] = []

    if str(old.value) != str(new.value):
        changes.append(f"Value: {old.value} -> {new.value}")
    if old.operator != new.operator:
        changes.append(f"Operator: {old.operator} -> {new.operator}")
    if old.is_mandatory != new.is_mandatory:
        changes.append(f"Mandatory: {old.is_mandatory} -> {new.is_mandatory}")
    if old.is_exception != new.is_exception:
        changes.append(f"Exception: {old.is_exception} -> {new.is_exception}")

    return "; ".join(changes) if changes else None
