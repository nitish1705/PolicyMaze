from __future__ import annotations

from dataclasses import dataclass
from typing import Any


VALID_OPERATORS = frozenset({
    "equals",
    "not_equals",
    "greater_than",
    "greater_than_or_equal",
    "less_than",
    "less_than_or_equal",
    "contains",
    "not_contains",
    "in",
    "not_in",
    "between",
    "exists",
})

VALID_VALUE_TYPES = frozenset({"number", "string", "boolean", "list", "range"})


@dataclass(frozen=True)
class PolicyRule:
    rule_id: str
    document_id: str
    field: str
    field_label: str
    operator: str
    value: Any
    value_type: str
    is_mandatory: bool = True
    is_exception: bool = False
    exception_to: str | None = None
    source_section: str | None = None
    source_page: int | None = None
    source_text: str = ""
    confidence: float = 1.0
    notes: str | None = None
    amendment_reference: str | None = None
    external_dependency: str | None = None
