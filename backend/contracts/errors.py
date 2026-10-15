from enum import Enum

from pydantic import BaseModel


class ErrorCode(str, Enum):
    INVALID_REQUEST = "invalid_request"
    DOCUMENT_PARSE_FAILED = "document_parse_failed"
    RULE_EXTRACTION_FAILED = "rule_extraction_failed"
    PROFILE_INCOMPLETE = "profile_incomplete"
    SCHEME_NOT_FOUND = "scheme_not_found"
    LLM_UNAVAILABLE = "llm_unavailable"
    CONFLICT_UNRESOLVABLE = "conflict_unresolvable"
    INTERNAL_ERROR = "internal_error"


class Remediation(BaseModel):
    action: str
    details: str | None = None


class ApiError(BaseModel):
    code: ErrorCode
    category: str
    message: str
    retryable: bool = False
    remediation: Remediation | None = None
