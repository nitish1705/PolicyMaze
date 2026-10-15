"""Orchestrates policy diff and conflict detection."""
from __future__ import annotations

import json
from typing import Any

import aiosqlite

from backend.domain.conflict import RuleConflict, detect_conflicts
from backend.domain.policy_diff import RuleDiff, diff_rules
from backend.domain.rule import PolicyRule


async def _load_rules(db: aiosqlite.Connection, document_id: str) -> list[PolicyRule]:
    cursor = await db.execute(
        "SELECT * FROM rules WHERE document_id = ? ORDER BY id", (document_id,),
    )
    rows = await cursor.fetchall()
    rules = []
    for row in rows:
        value_raw = row["value"]
        try:
            value = json.loads(value_raw)
        except (json.JSONDecodeError, TypeError):
            value = value_raw

        rules.append(PolicyRule(
            rule_id=row["id"],
            document_id=row["document_id"],
            field=row["field"],
            field_label=row["field_label"] or "",
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
    return rules


async def _get_scheme_name(db: aiosqlite.Connection, doc_id: str) -> str:
    cursor = await db.execute("SELECT scheme_name FROM documents WHERE id = ?", (doc_id,))
    row = await cursor.fetchone()
    return row["scheme_name"] if row else doc_id


async def compare_documents(
    db: aiosqlite.Connection,
    doc_id_a: str,
    doc_id_b: str,
) -> dict[str, Any]:
    rules_a = await _load_rules(db, doc_id_a)
    rules_b = await _load_rules(db, doc_id_b)
    name_a = await _get_scheme_name(db, doc_id_a)
    name_b = await _get_scheme_name(db, doc_id_b)

    diffs = diff_rules(rules_a, rules_b)
    conflicts = detect_conflicts(rules_a, rules_b, name_a, name_b)

    return {
        "document_a": {"id": doc_id_a, "name": name_a, "rule_count": len(rules_a)},
        "document_b": {"id": doc_id_b, "name": name_b, "rule_count": len(rules_b)},
        "diffs": [_diff_to_dict(d) for d in diffs],
        "diff_summary": {
            "added": sum(1 for d in diffs if d.change_type == "added"),
            "removed": sum(1 for d in diffs if d.change_type == "removed"),
            "modified": sum(1 for d in diffs if d.change_type == "modified"),
        },
        "conflicts": [_conflict_to_dict(c) for c in conflicts],
        "conflict_summary": {
            "total": len(conflicts),
            "high": sum(1 for c in conflicts if c.severity == "high"),
            "medium": sum(1 for c in conflicts if c.severity == "medium"),
            "low": sum(1 for c in conflicts if c.severity == "low"),
        },
    }


async def multi_scheme_check(
    db: aiosqlite.Connection,
    document_ids: list[str],
    profile: dict[str, Any],
) -> list[dict]:
    from backend.application.eligibility_service import check_eligibility

    results = []
    for doc_id in document_ids:
        try:
            result = await check_eligibility(db, doc_id, profile)
            results.append(result)
        except ValueError:
            results.append({
                "document_id": doc_id,
                "scheme_name": await _get_scheme_name(db, doc_id),
                "overall_verdict": "ERROR",
                "summary": f"Could not evaluate document {doc_id}",
                "matched_count": 0,
                "failed_count": 0,
                "unknown_count": 0,
                "total_rules": 0,
            })
    return results


def _diff_to_dict(d: RuleDiff) -> dict:
    result: dict[str, Any] = {
        "field": d.field,
        "field_label": d.field_label,
        "change_type": d.change_type,
        "details": d.details,
    }
    if d.old_rule:
        result["old"] = {"operator": d.old_rule.operator, "value": d.old_rule.value}
    if d.new_rule:
        result["new"] = {"operator": d.new_rule.operator, "value": d.new_rule.value}
    return result


def _conflict_to_dict(c: RuleConflict) -> dict:
    return {
        "conflict_id": c.conflict_id,
        "field": c.field,
        "conflict_type": c.conflict_type,
        "severity": c.severity,
        "description": c.description,
        "recommendation": c.recommendation,
        "rule_a": {
            "rule_id": c.rule_a.rule_id,
            "document_id": c.rule_a.document_id,
            "operator": c.rule_a.operator,
            "value": c.rule_a.value,
            "source_text": c.rule_a.source_text,
        },
        "rule_b": {
            "rule_id": c.rule_b.rule_id,
            "document_id": c.rule_b.document_id,
            "operator": c.rule_b.operator,
            "value": c.rule_b.value,
            "source_text": c.rule_b.source_text,
        },
    }
