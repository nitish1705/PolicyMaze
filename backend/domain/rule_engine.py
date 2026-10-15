from __future__ import annotations

from typing import Any

from backend.domain.rule import PolicyRule


def _coerce_numeric(val: Any) -> float | None:
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        cleaned = val.replace(",", "").strip()
        try:
            return float(cleaned)
        except ValueError:
            return None
    return None


def _coerce_string(val: Any) -> str:
    if val is None:
        return ""
    return str(val).strip().lower()


def evaluate_rule(rule: PolicyRule, user_value: Any) -> bool | None:
    """Evaluate a single rule against a user-provided value.

    Returns True (pass), False (fail), or None (insufficient data).
    Pure function — zero external dependencies.
    """
    if user_value is None:
        if rule.operator == "exists":
            return False
        return None

    op = rule.operator
    rule_val = rule.value

    if op == "exists":
        if isinstance(user_value, bool):
            return user_value
        if isinstance(user_value, str):
            return len(user_value.strip()) > 0
        return user_value is not None

    if op == "equals":
        unum = _coerce_numeric(user_value)
        rnum = _coerce_numeric(rule_val)
        if unum is not None and rnum is not None:
            return unum == rnum
        if isinstance(rule_val, bool) or isinstance(user_value, bool):
            return bool(user_value) == bool(rule_val)
        return _coerce_string(user_value) == _coerce_string(rule_val)

    if op == "not_equals":
        unum = _coerce_numeric(user_value)
        rnum = _coerce_numeric(rule_val)
        if unum is not None and rnum is not None:
            return unum != rnum
        if isinstance(rule_val, bool) or isinstance(user_value, bool):
            return bool(user_value) != bool(rule_val)
        return _coerce_string(user_value) != _coerce_string(rule_val)

    if op == "greater_than":
        unum = _coerce_numeric(user_value)
        rnum = _coerce_numeric(rule_val)
        if unum is None or rnum is None:
            return None
        return unum > rnum

    if op == "greater_than_or_equal":
        unum = _coerce_numeric(user_value)
        rnum = _coerce_numeric(rule_val)
        if unum is None or rnum is None:
            return None
        return unum >= rnum

    if op == "less_than":
        unum = _coerce_numeric(user_value)
        rnum = _coerce_numeric(rule_val)
        if unum is None or rnum is None:
            return None
        return unum < rnum

    if op == "less_than_or_equal":
        unum = _coerce_numeric(user_value)
        rnum = _coerce_numeric(rule_val)
        if unum is None or rnum is None:
            return None
        return unum <= rnum

    if op == "contains":
        return _coerce_string(rule_val) in _coerce_string(user_value)

    if op == "not_contains":
        return _coerce_string(rule_val) not in _coerce_string(user_value)

    if op == "in":
        if isinstance(rule_val, list):
            normalized = [_coerce_string(v) for v in rule_val]
            return _coerce_string(user_value) in normalized
        return _coerce_string(user_value) in _coerce_string(rule_val)

    if op == "not_in":
        if isinstance(rule_val, list):
            normalized = [_coerce_string(v) for v in rule_val]
            return _coerce_string(user_value) not in normalized
        return _coerce_string(user_value) not in _coerce_string(rule_val)

    if op == "between":
        unum = _coerce_numeric(user_value)
        if unum is None:
            return None
        if isinstance(rule_val, dict):
            lo = _coerce_numeric(rule_val.get("min"))
            hi = _coerce_numeric(rule_val.get("max"))
        elif isinstance(rule_val, (list, tuple)) and len(rule_val) >= 2:
            lo = _coerce_numeric(rule_val[0])
            hi = _coerce_numeric(rule_val[1])
        else:
            return None
        if lo is None or hi is None:
            return None
        return lo <= unum <= hi

    return None


def evaluate_scheme(
    rules: list[PolicyRule],
    profile: dict[str, Any],
) -> list[tuple[PolicyRule, bool | None]]:
    """Evaluate all rules for a scheme against a user profile.

    Returns list of (rule, verdict) tuples.
    """
    results: list[tuple[PolicyRule, bool | None]] = []
    for rule in rules:
        user_value = profile.get(rule.field)
        verdict = evaluate_rule(rule, user_value)
        results.append((rule, verdict))
    return results


def determine_overall_verdict(
    results: list[tuple[PolicyRule, bool | None]],
) -> str:
    """Determine overall eligibility from individual rule results.

    Three-valued logic:
    - Any mandatory rule fails → NOT_ELIGIBLE
    - Any mandatory rule is None (no fails) → INSUFFICIENT_DATA
    - All mandatory rules pass → ELIGIBLE
    - Mix of passes and unknowns (no fails) → PARTIAL
    """
    has_fail = False
    has_unknown = False
    has_pass = False

    for rule, verdict in results:
        if not rule.is_mandatory and not rule.is_exception:
            continue

        if verdict is False:
            has_fail = True
        elif verdict is None:
            has_unknown = True
        else:
            has_pass = True

    if has_fail:
        return "NOT_ELIGIBLE"
    if has_unknown and has_pass:
        return "PARTIAL"
    if has_unknown:
        return "INSUFFICIENT_DATA"
    return "ELIGIBLE"
