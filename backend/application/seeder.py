"""Seed the database with scheme data from three external repos.

Sources:
1. schemefinder (48 YAML) — structured rules, direct import
2. yojana-setu (18 seed) — structured eligibility fields, convert to rules
3. gov-myscheme-dataset (2066 JSON) — catalog with eligibility text
"""
from __future__ import annotations

import hashlib
import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import aiosqlite
import yaml

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "repos"

OP_MAP = {
    "eq": "equals",
    "ne": "not_equals",
    "in": "in",
    "lte": "less_than_or_equal",
    "gte": "greater_than_or_equal",
    "between": "between",
    "lt": "less_than",
    "gt": "greater_than",
}


async def seed_all(db: aiosqlite.Connection) -> dict[str, int]:
    counts = {}
    counts["schemefinder"] = await _seed_schemefinder(db)
    counts["yojana_setu"] = await _seed_yojana_setu(db)
    counts["myscheme"] = await _seed_myscheme_catalog(db)
    await db.commit()
    return counts


async def _seed_schemefinder(db: aiosqlite.Connection) -> int:
    schemes_dir = DATA_DIR / "schemefinder" / "backend" / "data" / "schemes"
    if not schemes_dir.exists():
        logger.warning("schemefinder data not found at %s", schemes_dir)
        return 0

    count = 0
    for yaml_file in sorted(schemes_dir.glob("*.yaml")):
        try:
            data = yaml.safe_load(yaml_file.read_text(encoding="utf-8"))
        except Exception:
            logger.warning("Failed to parse %s", yaml_file.name)
            continue

        scheme_id = data.get("id", yaml_file.stem)
        doc_id = f"sf_{scheme_id}"
        name = data.get("name", scheme_id)
        now = datetime.now(timezone.utc).isoformat()

        eligibility = data.get("eligibility", {})
        rules_raw = eligibility.get("rules", [])
        self_checks = eligibility.get("self_check", [])

        description = data.get("description", "")
        benefits_list = data.get("benefits", [])
        benefits_text = "; ".join(
            b.get("summary", "") for b in benefits_list if isinstance(b, dict)
        )

        await db.execute(
            """INSERT OR IGNORE INTO documents
               (id, filename, scheme_name, version, raw_text, content_hash, page_count, upload_timestamp)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (doc_id, f"{scheme_id}.yaml", name, data.get("last_verified"),
             description, hashlib.sha256(description.encode()).hexdigest(),
             1, now),
        )

        rule_idx = 0
        for rule_entry in rules_raw:
            parsed_rules = _parse_schemefinder_rule(rule_entry)
            for pr in parsed_rules:
                rule_idx += 1
                rule_id = f"{doc_id}_rule_{rule_idx:03d}"
                value_json = json.dumps(pr["value"]) if not isinstance(pr["value"], str) else pr["value"]

                await db.execute(
                    """INSERT OR IGNORE INTO rules
                       (id, document_id, field, field_label, operator, value, value_type,
                        is_mandatory, is_exception, exception_to, source_section, source_page,
                        source_text, confidence, notes, amendment_reference, external_dependency)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (rule_id, doc_id, pr["field"], pr["field_label"],
                     pr["operator"], value_json, pr["value_type"],
                     1, 0, None, None, None,
                     pr.get("source_text", f"Rule: {pr['field']} {pr['operator']} {pr['value']}"),
                     0.95, f"From schemefinder/{scheme_id}", None, None),
                )

        for sc in self_checks:
            rule_idx += 1
            rule_id = f"{doc_id}_self_{rule_idx:03d}"
            field_name = _slugify(sc[:40])
            await db.execute(
                """INSERT OR IGNORE INTO rules
                   (id, document_id, field, field_label, operator, value, value_type,
                    is_mandatory, is_exception, exception_to, source_section, source_page,
                    source_text, confidence, notes, amendment_reference, external_dependency)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (rule_id, doc_id, field_name, sc[:60],
                 "equals", "true", "boolean",
                 1, 0, None, None, None,
                 sc, 0.7, "Self-check item — requires user confirmation", None, None),
            )

        conf = 0.95 if rules_raw else 0.7
        await db.execute(
            "UPDATE documents SET extraction_confidence = ? WHERE id = ?",
            (conf, doc_id),
        )

        docs_req = data.get("required_documents", [])
        tags = data.get("tags", [])
        await db.execute(
            """INSERT OR IGNORE INTO scheme_catalog
               (id, name, slug, level, state, ministry, category, tags, description,
                eligibility_text, exclusions_text, benefits, documents_required,
                application_url, source_url, has_structured_rules, document_id,
                source_repo, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (f"cat_sf_{scheme_id}", name, scheme_id,
             data.get("level", "central"), data.get("state"),
             data.get("ministry"), data.get("category"),
             json.dumps(tags), description,
             "\n".join(self_checks) if self_checks else None,
             None, benefits_text, json.dumps(docs_req),
             data.get("application_url"), json.dumps(data.get("source_urls", [])),
             1, doc_id, "schemefinder", now),
        )
        count += 1

    logger.info("Seeded %d schemes from schemefinder", count)
    return count


def _parse_schemefinder_rule(entry: dict) -> list[dict]:
    results = []
    if "any_of" in entry:
        for sub in entry["any_of"]:
            results.extend(_parse_schemefinder_rule(sub))
        return results

    field = entry.get("field", "unknown")
    op = OP_MAP.get(entry.get("op", "eq"), "equals")
    value = entry.get("value")

    label = field.replace("_", " ").title()
    vtype = "string"
    if isinstance(value, bool):
        vtype = "boolean"
    elif isinstance(value, (int, float)):
        vtype = "number"
    elif isinstance(value, list):
        vtype = "list"

    results.append({
        "field": field,
        "field_label": label,
        "operator": op,
        "value": value,
        "value_type": vtype,
        "source_text": f"{label}: {op} {value}",
    })
    return results


YOJANA_SCHEMES = [
    {
        "name": "PM-KISAN",
        "eligibility": {"occupation": ["FARMER"], "minAge": 18},
    },
    {
        "name": "PM Awas Yojana – Urban 2.0",
        "eligibility": {"maxAnnualIncome": 300000, "minAge": 18},
    },
    {
        "name": "Ayushman Bharat PM-JAY",
        "eligibility": {"maxAnnualIncome": 300000},
    },
    {
        "name": "Ayushman Vay Vandana",
        "eligibility": {"minAge": 70},
    },
    {
        "name": "National Means-cum-Merit Scholarship",
        "eligibility": {"minAge": 13, "maxAge": 18, "maxAnnualIncome": 350000, "isStudentOnly": True, "occupation": ["STUDENT"]},
    },
    {
        "name": "Post Matric Scholarship for SC",
        "eligibility": {"socialCategory": ["SC"], "maxAnnualIncome": 250000, "minAge": 15, "isStudentOnly": True},
    },
    {
        "name": "Sukanya Samriddhi Yojana",
        "eligibility": {"gender": "FEMALE", "maxAge": 10},
    },
    {
        "name": "PM Vishwakarma",
        "eligibility": {"minAge": 18},
    },
    {
        "name": "Atal Pension Yojana",
        "eligibility": {"minAge": 18, "maxAge": 40},
    },
    {
        "name": "PM SVANidhi",
        "eligibility": {"minAge": 18},
    },
    {
        "name": "Janani Suraksha Yojana",
        "eligibility": {"gender": "FEMALE", "minAge": 19, "maxAnnualIncome": 200000},
    },
    {
        "name": "Stand-Up India",
        "eligibility": {"minAge": 18, "socialCategory": ["SC", "ST"]},
    },
    {
        "name": "DDU-GKY",
        "eligibility": {"minAge": 15, "maxAge": 35, "maxAnnualIncome": 100000},
    },
    {
        "name": "National Apprenticeship Promotion Scheme",
        "eligibility": {"minAge": 14},
    },
    {
        "name": "PM MUDRA Yojana",
        "eligibility": {"minAge": 18},
    },
    {
        "name": "PM Ujjwala Yojana 2.0",
        "eligibility": {"gender": "FEMALE", "maxAnnualIncome": 200000},
    },
    {
        "name": "Indira Gandhi National Old Age Pension",
        "eligibility": {"minAge": 60, "maxAnnualIncome": 100000},
    },
    {
        "name": "Indira Gandhi National Disability Pension",
        "eligibility": {"minAge": 18, "requiresDisability": True, "maxAnnualIncome": 100000},
    },
]


async def _seed_yojana_setu(db: aiosqlite.Connection) -> int:
    now = datetime.now(timezone.utc).isoformat()
    count = 0

    for scheme in YOJANA_SCHEMES:
        name = scheme["name"]
        elig = scheme["eligibility"]
        slug = _slugify(name)
        doc_id = f"ys_{slug}"

        desc = f"Eligibility rules for {name}"
        await db.execute(
            """INSERT OR IGNORE INTO documents
               (id, filename, scheme_name, version, raw_text, content_hash, page_count, upload_timestamp)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (doc_id, f"{slug}.json", name, "2024",
             json.dumps(elig), hashlib.sha256(json.dumps(elig).encode()).hexdigest(),
             1, now),
        )

        rule_idx = 0
        rules_data = _eligibility_to_rules(elig)
        for r in rules_data:
            rule_idx += 1
            rule_id = f"{doc_id}_rule_{rule_idx:03d}"
            value_json = json.dumps(r["value"]) if not isinstance(r["value"], str) else r["value"]
            await db.execute(
                """INSERT OR IGNORE INTO rules
                   (id, document_id, field, field_label, operator, value, value_type,
                    is_mandatory, is_exception, exception_to, source_section, source_page,
                    source_text, confidence, notes, amendment_reference, external_dependency)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (rule_id, doc_id, r["field"], r["field_label"],
                 r["operator"], value_json, r["value_type"],
                 1, 0, None, None, None,
                 r["source_text"], 0.9, "From Yojana-setu seed data", None, None),
            )

        await db.execute(
            "UPDATE documents SET extraction_confidence = ? WHERE id = ?",
            (0.9, doc_id),
        )

        await db.execute(
            """INSERT OR IGNORE INTO scheme_catalog
               (id, name, slug, level, state, ministry, category, tags, description,
                eligibility_text, exclusions_text, benefits, documents_required,
                application_url, source_url, has_structured_rules, document_id,
                source_repo, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (f"cat_ys_{slug}", name, slug,
             "central", None, None, None, "[]", desc,
             json.dumps(elig), None, None, "[]",
             None, None, 1, doc_id, "yojana-setu", now),
        )
        count += 1

    logger.info("Seeded %d schemes from Yojana-setu", count)
    return count


def _eligibility_to_rules(elig: dict) -> list[dict]:
    rules = []
    field_map = {
        "minAge": ("age", "Minimum Age", "greater_than_or_equal", "number"),
        "maxAge": ("age", "Maximum Age", "less_than_or_equal", "number"),
        "maxAnnualIncome": ("annual_income", "Maximum Annual Income", "less_than_or_equal", "number"),
        "maxLandHolding": ("landholding_size", "Maximum Land Holding", "less_than_or_equal", "number"),
    }

    for key, (field, label, op, vtype) in field_map.items():
        if key in elig and elig[key] is not None:
            rules.append({
                "field": field, "field_label": label,
                "operator": op, "value": elig[key], "value_type": vtype,
                "source_text": f"{label}: {op.replace('_', ' ')} {elig[key]}",
            })

    if "gender" in elig and elig["gender"] != "*":
        rules.append({
            "field": "gender", "field_label": "Gender",
            "operator": "equals", "value": elig["gender"], "value_type": "string",
            "source_text": f"Gender must be {elig['gender']}",
        })

    if "socialCategory" in elig:
        cats = elig["socialCategory"]
        if isinstance(cats, list):
            rules.append({
                "field": "category", "field_label": "Social Category",
                "operator": "in", "value": cats, "value_type": "list",
                "source_text": f"Must belong to category: {', '.join(cats)}",
            })

    if "occupation" in elig:
        occs = elig["occupation"]
        if isinstance(occs, list):
            rules.append({
                "field": "occupation", "field_label": "Occupation",
                "operator": "in", "value": occs, "value_type": "list",
                "source_text": f"Occupation must be: {', '.join(occs)}",
            })

    if elig.get("isStudentOnly"):
        rules.append({
            "field": "is_student", "field_label": "Student Status",
            "operator": "equals", "value": True, "value_type": "boolean",
            "source_text": "Must be a student",
        })

    if elig.get("requiresDisability"):
        rules.append({
            "field": "has_disability", "field_label": "Disability Status",
            "operator": "equals", "value": True, "value_type": "boolean",
            "source_text": "Applicant must have a disability",
        })

    return rules


async def _seed_myscheme_catalog(db: aiosqlite.Connection) -> int:
    json_path = DATA_DIR / "myscheme_2066.json"
    if not json_path.exists():
        logger.warning("myscheme data not found at %s", json_path)
        return 0

    data = json.loads(json_path.read_text(encoding="utf-8"))
    now = datetime.now(timezone.utc).isoformat()
    count = 0

    for scheme in data:
        name = scheme.get("Scheme Name", "")
        slug = scheme.get("Scheme Slug", _slugify(name))
        cat_id = f"cat_ms_{slug}"

        elig_text = scheme.get("Eligibility (General)", "") or scheme.get("Eligibility Criteria", "")
        exclusions = scheme.get("Exclusions / Ineligibility", "")

        await db.execute(
            """INSERT OR IGNORE INTO scheme_catalog
               (id, name, slug, level, state, ministry, category, tags, description,
                eligibility_text, exclusions_text, benefits, documents_required,
                application_url, source_url, has_structured_rules, document_id,
                source_repo, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (cat_id, name, slug,
             scheme.get("Level", ""), scheme.get("State / UT / Ministry"),
             scheme.get("State / UT / Ministry"), None,
             scheme.get("Tags / Categories", ""),
             (scheme.get("Description", "") or "")[:2000],
             (elig_text or "")[:5000],
             (exclusions or "")[:2000],
             (scheme.get("Benefits", "") or "")[:2000],
             scheme.get("Documents Required", ""),
             scheme.get("Official Link"),
             scheme.get("MyScheme URL"),
             0, None, "gov-myscheme-dataset", now),
        )
        count += 1

    logger.info("Seeded %d schemes from gov-myscheme-dataset", count)
    return count


def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")[:60]
