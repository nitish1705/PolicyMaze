from __future__ import annotations

import hashlib
import json
import re
import uuid
from datetime import datetime, timezone

import aiosqlite

from backend.adapters.llm_provider import extract_rules_with_llm
from backend.adapters.pdf_provider import ParsedDocument
from backend.domain.rule import VALID_OPERATORS, VALID_VALUE_TYPES, PolicyRule


def _regex_pre_extract(text: str) -> list[dict]:
    """Fast regex-based rule extraction for common Indian policy patterns."""
    rules: list[dict] = []
    idx = 0

    age_patterns = [
        (r"(?:age|aged?)\s*(?:of\s*)?(?:at\s*least\s*|minimum\s*|not\s*less\s*than\s*)(\d+)", "greater_than_or_equal"),
        (r"(?:age|aged?)\s*(?:should\s*)?(?:not\s*(?:exceed|more\s*than)\s*|maximum\s*|up\s*to\s*)(\d+)", "less_than_or_equal"),
        (r"(?:between|from)\s*(\d+)\s*(?:to|and|-)\s*(\d+)\s*years", "between"),
    ]
    for pattern, operator in age_patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            idx += 1
            if operator == "between":
                value = {"min": int(match.group(1)), "max": int(match.group(2))}
                vtype = "range"
            else:
                value = int(match.group(1))
                vtype = "number"
            start = max(0, match.start() - 40)
            end = min(len(text), match.end() + 40)
            rules.append({
                "rule_id": f"regex_{idx:03d}",
                "field": "age",
                "field_label": "Applicant Age",
                "operator": operator,
                "value": value,
                "value_type": vtype,
                "is_mandatory": True,
                "is_exception": False,
                "source_text": text[start:end].strip(),
                "confidence": 0.7,
                "notes": "Extracted via regex pre-pass",
            })

    income_patterns = [
        (r"(?:annual\s*)?(?:family\s*)?income\s*(?:should\s*)?(?:not\s*exceed|(?:be\s*)?(?:less\s*than|below|under|up\s*to))\s*(?:Rs\.?\s*|INR\s*)?([0-9,]+(?:\.\d+)?)\s*(?:lakh|lac)", "less_than_or_equal", 100000),
        (r"(?:annual\s*)?(?:family\s*)?income\s*(?:should\s*)?(?:not\s*exceed|(?:be\s*)?(?:less\s*than|below|under|up\s*to))\s*(?:Rs\.?\s*|INR\s*)?([0-9,]+(?:\.\d+)?)\s*(?:crore)", "less_than_or_equal", 10000000),
    ]
    for pattern, operator, multiplier in income_patterns:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            idx += 1
            raw_val = match.group(1).replace(",", "")
            value = int(float(raw_val) * multiplier)
            start = max(0, match.start() - 40)
            end = min(len(text), match.end() + 40)
            rules.append({
                "rule_id": f"regex_{idx:03d}",
                "field": "annual_income",
                "field_label": "Annual Family Income",
                "operator": operator,
                "value": value,
                "value_type": "number",
                "is_mandatory": True,
                "is_exception": False,
                "source_text": text[start:end].strip(),
                "confidence": 0.7,
                "notes": "Extracted via regex pre-pass",
            })

    category_pattern = r"(?:belonging\s*to|category|categories|caste)\s*[:\-]?\s*((?:(?:SC|ST|OBC|General|EWS|Minority|BPL)(?:\s*[/,&]\s*)?)+)"
    for match in re.finditer(category_pattern, text, re.IGNORECASE):
        idx += 1
        cats = re.findall(r"(SC|ST|OBC|General|EWS|Minority|BPL)", match.group(1), re.IGNORECASE)
        if cats:
            start = max(0, match.start() - 40)
            end = min(len(text), match.end() + 40)
            rules.append({
                "rule_id": f"regex_{idx:03d}",
                "field": "category",
                "field_label": "Social Category",
                "operator": "in",
                "value": [c.upper() for c in cats],
                "value_type": "list",
                "is_mandatory": True,
                "is_exception": False,
                "source_text": text[start:end].strip(),
                "confidence": 0.65,
                "notes": "Extracted via regex pre-pass",
            })

    return rules


def _validate_rule(raw: dict) -> dict | None:
    """Validate and normalize a raw rule dict from LLM or regex."""
    if not isinstance(raw, dict):
        return None
    if not raw.get("field") or not raw.get("source_text"):
        return None

    operator = raw.get("operator", "exists")
    if operator not in VALID_OPERATORS:
        operator = "exists"
    raw["operator"] = operator

    vtype = raw.get("value_type", "string")
    if vtype not in VALID_VALUE_TYPES:
        vtype = "string"
    raw["value_type"] = vtype

    raw.setdefault("field_label", raw["field"].replace("_", " ").title())
    raw.setdefault("is_mandatory", True)
    raw.setdefault("is_exception", False)
    raw.setdefault("confidence", 0.8)

    return raw


def _deduplicate_rules(regex_rules: list[dict], llm_rules: list[dict]) -> list[dict]:
    """Merge regex + LLM rules, preferring LLM when both cover same field."""
    llm_fields = {r.get("field") for r in llm_rules}
    merged = list(llm_rules)
    for rr in regex_rules:
        if rr.get("field") not in llm_fields:
            merged.append(rr)
    return merged


async def extract_and_store_rules(
    db: aiosqlite.Connection,
    document_id: str,
    parsed: ParsedDocument,
    scheme_name: str,
    version: str | None,
    use_llm: bool = True,
) -> list[PolicyRule]:
    text = parsed.markdown_text

    regex_rules = _regex_pre_extract(text)

    llm_rules: list[dict] = []
    if use_llm:
        llm_rules = extract_rules_with_llm(text, scheme_name, version)

    validated_llm = [r for raw in llm_rules if (r := _validate_rule(raw)) is not None]
    validated_regex = [r for raw in regex_rules if (r := _validate_rule(raw)) is not None]
    merged = _deduplicate_rules(validated_regex, validated_llm)

    stored_rules: list[PolicyRule] = []
    for i, raw in enumerate(merged):
        rule_id = raw.get("rule_id", f"rule_{i+1:03d}")
        if not rule_id.startswith("rule_") and not rule_id.startswith("regex_"):
            rule_id = f"rule_{i+1:03d}"

        value = raw["value"]
        value_json = json.dumps(value) if not isinstance(value, str) else value

        rule = PolicyRule(
            rule_id=f"{document_id}_{rule_id}",
            document_id=document_id,
            field=raw["field"],
            field_label=raw.get("field_label", ""),
            operator=raw["operator"],
            value=value,
            value_type=raw["value_type"],
            is_mandatory=bool(raw.get("is_mandatory", True)),
            is_exception=bool(raw.get("is_exception", False)),
            exception_to=raw.get("exception_to"),
            source_section=raw.get("source_section"),
            source_page=raw.get("source_page"),
            source_text=raw.get("source_text", ""),
            confidence=float(raw.get("confidence", 0.8)),
            notes=raw.get("notes"),
            amendment_reference=raw.get("amendment_reference"),
            external_dependency=raw.get("external_dependency"),
        )

        await db.execute(
            """INSERT OR REPLACE INTO rules
               (id, document_id, field, field_label, operator, value, value_type,
                is_mandatory, is_exception, exception_to, source_section, source_page,
                source_text, confidence, notes, amendment_reference, external_dependency)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                rule.rule_id, rule.document_id, rule.field, rule.field_label,
                rule.operator, value_json, rule.value_type,
                int(rule.is_mandatory), int(rule.is_exception), rule.exception_to,
                rule.source_section, rule.source_page, rule.source_text,
                rule.confidence, rule.notes, rule.amendment_reference, rule.external_dependency,
            ),
        )
        stored_rules.append(rule)

    avg_confidence = (
        sum(r.confidence for r in stored_rules) / len(stored_rules)
        if stored_rules else 0.0
    )
    await db.execute(
        "UPDATE documents SET extraction_confidence = ? WHERE id = ?",
        (avg_confidence, document_id),
    )
    await db.commit()

    return stored_rules
