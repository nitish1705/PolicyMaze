from __future__ import annotations

import json
from typing import Any

import aiosqlite

from backend.adapters.llm_provider import translate_texts
from backend.adapters.n8n_webhook import notify_eligibility_checked
from backend.application.session import (
    create_profile,
    create_session,
    store_bundle,
    store_evidence,
)
from backend.domain.evidence import EligibilityEvidence, SourceCitation
from backend.domain.evidence_bundle import EligibilityEvidenceBundle
from backend.domain.rule import PolicyRule
from backend.domain.rule_engine import determine_overall_verdict, evaluate_rule, evaluate_scheme
from backend.domain.unknown import ResidualUnknown


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


async def _get_scheme_name(db: aiosqlite.Connection, document_id: str) -> str | None:
    cursor = await db.execute(
        "SELECT scheme_name FROM documents WHERE id = ?", (document_id,),
    )
    row = await cursor.fetchone()
    return row["scheme_name"] if row else None


def _build_explanation(rule: PolicyRule, user_value: Any, verdict: bool | None) -> str:
    if verdict is None:
        return f"No value provided for '{rule.field_label}'. Cannot evaluate."

    val_display = user_value
    rule_display = rule.value

    if rule.operator == "greater_than_or_equal":
        op_text = f"must be at least {rule_display}"
    elif rule.operator == "less_than_or_equal":
        op_text = f"must not exceed {rule_display}"
    elif rule.operator == "greater_than":
        op_text = f"must be greater than {rule_display}"
    elif rule.operator == "less_than":
        op_text = f"must be less than {rule_display}"
    elif rule.operator == "equals":
        op_text = f"must equal {rule_display}"
    elif rule.operator == "not_equals":
        op_text = f"must not be {rule_display}"
    elif rule.operator == "in":
        op_text = f"must be one of {rule_display}"
    elif rule.operator == "not_in":
        op_text = f"must not be any of {rule_display}"
    elif rule.operator == "contains":
        op_text = f"must contain '{rule_display}'"
    elif rule.operator == "not_contains":
        op_text = f"must not contain '{rule_display}'"
    elif rule.operator == "between":
        if isinstance(rule_display, dict):
            op_text = f"must be between {rule_display.get('min')} and {rule_display.get('max')}"
        else:
            op_text = f"must be within range {rule_display}"
    elif rule.operator == "exists":
        op_text = "must be provided"
    else:
        op_text = f"{rule.operator} {rule_display}"

    status = "PASS" if verdict else "FAIL"
    return f"{rule.field_label} {op_text}. Your value: {val_display}. Result: {status}."


def _translate_result(result: dict, lang: str) -> dict:
    """Post-translate human-readable text fields in the eligibility result."""
    if lang == "en":
        return result

    texts: list[str] = [result["summary"]]
    for step in result["reasoning_trace"]:
        texts.append(step["explanation"])
    for m in result["missing_information"]:
        texts.append(m["recommendation"])
        texts.append(m["impact"])

    translated = translate_texts(texts, lang)

    idx = 0
    result["summary"] = translated[idx]; idx += 1
    for step in result["reasoning_trace"]:
        step["explanation"] = translated[idx]; idx += 1
    for m in result["missing_information"]:
        m["recommendation"] = translated[idx]; idx += 1
        m["impact"] = translated[idx]; idx += 1

    return result


async def check_eligibility(
    db: aiosqlite.Connection,
    document_id: str,
    profile_data: dict[str, Any],
    lang: str = "en",
) -> dict:
    """Full eligibility check workflow.

    1. Load rules from DB
    2. Create profile + session
    3. Evaluate all rules deterministically
    4. Build evidence records for each evaluation
    5. Build evidence bundle with overall verdict
    6. Store everything in DB
    7. Return structured response with reasoning trace
    """
    scheme_name = await _get_scheme_name(db, document_id)
    if not scheme_name:
        raise ValueError(f"Document '{document_id}' not found")

    rules = await _load_rules(db, document_id)
    if not rules:
        raise ValueError(f"No rules found for document '{document_id}'")

    profile_id = await create_profile(db, profile_data)
    session_id = await create_session(db, profile_id)

    results = evaluate_scheme(rules, profile_data)
    overall_verdict = determine_overall_verdict(results)

    evidence_list: list[EligibilityEvidence] = []
    unknowns: list[ResidualUnknown] = []
    reasoning_trace: list[dict] = []

    for step_num, (rule, verdict) in enumerate(results, 1):
        user_value = profile_data.get(rule.field)

        source = SourceCitation(
            document_id=document_id,
            scheme_name=scheme_name,
            section=rule.source_section,
            page=rule.source_page,
            text=rule.source_text,
        )

        evidence = EligibilityEvidence.build(
            rule_id=rule.rule_id,
            field=rule.field,
            field_label=rule.field_label,
            operator=rule.operator,
            rule_value=rule.value,
            user_value=user_value,
            verdict=verdict,
            source=source,
        )
        evidence_list.append(evidence)
        await store_evidence(db, session_id, evidence)

        if verdict is None:
            unknowns.append(ResidualUnknown.from_rule(
                rule.field, rule.field_label, rule.is_mandatory,
            ))

        explanation = _build_explanation(rule, user_value, verdict)
        verdict_str = {True: "pass", False: "fail", None: "unknown"}[verdict]

        reasoning_trace.append({
            "step": step_num,
            "rule_id": rule.rule_id,
            "field": rule.field,
            "field_label": rule.field_label,
            "operator": rule.operator,
            "required_value": rule.value,
            "user_value": user_value,
            "result": verdict_str,
            "explanation": explanation,
            "source_text": rule.source_text,
            "is_exception": rule.is_exception,
            "is_mandatory": rule.is_mandatory,
        })

    bundle = EligibilityEvidenceBundle.build(
        session_id=session_id,
        document_id=document_id,
        scheme_name=scheme_name,
        profile_id=profile_id,
        overall_verdict=overall_verdict,
        evidence_list=evidence_list,
        unknowns=unknowns,
    )
    await store_bundle(db, bundle)

    await notify_eligibility_checked(
        session_id=session_id,
        scheme_name=scheme_name,
        verdict=overall_verdict,
        matched=len(bundle.matched_criteria),
        failed=len(bundle.disqualifying_criteria),
        unknown=len(bundle.missing_information),
    )

    result = {
        "session_id": session_id,
        "bundle_id": bundle.bundle_id,
        "document_id": document_id,
        "scheme_name": scheme_name,
        "overall_verdict": overall_verdict,
        "summary": bundle.summary,
        "matched_count": len(bundle.matched_criteria),
        "failed_count": len(bundle.disqualifying_criteria),
        "unknown_count": len(bundle.missing_information),
        "total_rules": len(rules),
        "reasoning_trace": reasoning_trace,
        "matched_criteria": [_evidence_to_dict(e) for e in bundle.matched_criteria],
        "disqualifying_criteria": [_evidence_to_dict(e) for e in bundle.disqualifying_criteria],
        "missing_information": [
            {"field": u.field, "field_label": u.field_label,
             "recommendation": u.recommendation, "impact": u.impact}
            for u in bundle.missing_information
        ],
        "timestamp": bundle.timestamp,
    }
    return _translate_result(result, lang)


async def get_session_trace(
    db: aiosqlite.Connection,
    session_id: str,
) -> dict | None:
    """Retrieve the full reasoning trace for a session."""
    cursor = await db.execute(
        "SELECT * FROM evidence_bundles WHERE session_id = ?", (session_id,),
    )
    bundle_row = await cursor.fetchone()
    if not bundle_row:
        return None

    cursor = await db.execute(
        "SELECT * FROM evidence_records WHERE session_id = ? ORDER BY id", (session_id,),
    )
    evidence_rows = await cursor.fetchall()

    scheme_name = ""
    doc_id = bundle_row["scheme_id"]
    if doc_id:
        sn = await _get_scheme_name(db, doc_id)
        scheme_name = sn or ""

    rules = await _load_rules(db, doc_id) if doc_id else []
    rule_map = {r.rule_id: r for r in rules}

    all_evidence = []
    reasoning_trace = []
    missing_information = []

    for step_num, row in enumerate(evidence_rows, 1):
        user_val_raw = row["user_value"]
        try:
            user_value = json.loads(user_val_raw) if user_val_raw else None
        except (json.JSONDecodeError, TypeError):
            user_value = user_val_raw

        evidence_dict = {
            "evidence_id": row["id"],
            "rule_id": row["rule_id"],
            "field": row["field"],
            "field_label": row["field"],
            "operator": "",
            "rule_value": "",
            "user_value": user_value,
            "verdict": row["verdict"],
            "confidence": row["confidence"],
            "source": {
                "document_id": row["source_document"] or "",
                "scheme_name": scheme_name,
                "section": row["source_section"],
                "page": row["source_page"],
                "text": row["source_text"] or "",
            },
            "limitations": row["limitations"],
        }

        rule = rule_map.get(row["rule_id"])
        if rule:
            evidence_dict["field_label"] = rule.field_label
            evidence_dict["operator"] = rule.operator
            evidence_dict["rule_value"] = rule.value

            verdict_bool = {"pass": True, "fail": False, "unknown": None}.get(row["verdict"])
            explanation = _build_explanation(rule, user_value, verdict_bool)

            reasoning_trace.append({
                "step": step_num,
                "rule_id": rule.rule_id,
                "field": rule.field,
                "field_label": rule.field_label,
                "operator": rule.operator,
                "required_value": rule.value,
                "user_value": user_value,
                "result": row["verdict"],
                "explanation": explanation,
                "source_text": rule.source_text,
                "is_exception": rule.is_exception,
                "is_mandatory": rule.is_mandatory,
            })

        all_evidence.append(evidence_dict)

        if row["verdict"] == "unknown" and rule:
            missing_information.append({
                "field": rule.field,
                "field_label": rule.field_label,
                "recommendation": f"Please provide your {rule.field_label.lower()}",
                "impact": "Cannot determine eligibility without this information"
                if rule.is_mandatory else "Optional",
            })

    missing_raw = bundle_row["missing_information"]
    try:
        stored_missing = json.loads(missing_raw) if missing_raw else []
        if isinstance(stored_missing, list) and stored_missing and isinstance(stored_missing[0], dict):
            missing_information = stored_missing
    except (json.JSONDecodeError, TypeError):
        pass

    return {
        "session_id": session_id,
        "bundle_id": bundle_row["id"],
        "document_id": doc_id or "",
        "scheme_name": scheme_name,
        "overall_verdict": bundle_row["overall_verdict"],
        "summary": bundle_row["summary"],
        "reasoning_trace": reasoning_trace,
        "all_evidence": all_evidence,
        "missing_information": missing_information,
        "timestamp": bundle_row["timestamp"],
    }


def _evidence_to_dict(e: EligibilityEvidence) -> dict:
    return {
        "evidence_id": e.evidence_id,
        "rule_id": e.rule_id,
        "field": e.field,
        "field_label": e.field_label,
        "operator": e.operator,
        "rule_value": e.rule_value,
        "user_value": e.user_value,
        "verdict": e.verdict,
        "confidence": e.confidence,
        "source": {
            "document_id": e.source.document_id,
            "scheme_name": e.source.scheme_name,
            "section": e.source.section,
            "page": e.source.page,
            "text": e.source.text,
        },
        "limitations": e.limitations,
    }
