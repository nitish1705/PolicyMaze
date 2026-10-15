from __future__ import annotations

from pydantic import BaseModel, Field


class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    scheme_name: str
    version: str | None = None
    page_count: int
    content_hash: str
    markdown_preview: str = Field(description="First 500 chars of extracted text")
    extracted_rules_count: int = 0
    extraction_confidence: float | None = None
    message: str = "Document uploaded and parsed successfully"


class ExtractedRule(BaseModel):
    rule_id: str
    field: str
    field_label: str | None = None
    operator: str
    value: str | int | float | bool | list | dict
    value_type: str
    is_mandatory: bool = True
    is_exception: bool = False
    exception_to: str | None = None
    source_section: str | None = None
    source_page: int | None = None
    source_text: str
    confidence: float = 1.0
    notes: str | None = None
    amendment_reference: str | None = None
    external_dependency: str | None = None


class DocumentRulesResponse(BaseModel):
    document_id: str
    scheme_name: str
    rules: list[ExtractedRule]
    rule_count: int
    extraction_confidence: float | None = None


# --- Eligibility Engine Schemas ---


class UserProfileData(BaseModel):
    age: int | None = None
    annual_income: int | float | None = None
    annual_family_income: int | float | None = None
    category: str | None = None
    land_ownership: bool | None = None
    landholding_size: float | None = None
    nationality: str | None = None
    aadhaar_card: bool | None = None
    land_holder_type: str | None = None
    constitutional_post_status: str | None = None
    political_office_status: str | None = None
    professional_registration: str | None = None
    income_tax_payment: bool | None = None

    class Config:
        extra = "allow"


class EligibilityCheckRequest(BaseModel):
    document_id: str
    profile: UserProfileData


class SourceCitationSchema(BaseModel):
    document_id: str
    scheme_name: str
    section: str | None = None
    page: int | None = None
    text: str = ""


class EvidenceSchema(BaseModel):
    evidence_id: str
    rule_id: str
    field: str
    field_label: str
    operator: str
    rule_value: str | int | float | bool | list | dict
    user_value: str | int | float | bool | list | dict | None = None
    verdict: str
    confidence: str
    source: SourceCitationSchema
    limitations: str | None = None


class ResidualUnknownSchema(BaseModel):
    field: str
    field_label: str
    recommendation: str
    impact: str


class ReasoningStep(BaseModel):
    step: int
    rule_id: str
    field: str
    field_label: str
    operator: str
    required_value: str | int | float | bool | list | dict
    user_value: str | int | float | bool | list | dict | None = None
    result: str  # "pass", "fail", "unknown"
    explanation: str
    source_text: str
    is_exception: bool = False
    is_mandatory: bool = True


class EligibilityCheckResponse(BaseModel):
    session_id: str
    bundle_id: str
    document_id: str
    scheme_name: str
    overall_verdict: str
    summary: str
    matched_count: int
    failed_count: int
    unknown_count: int
    total_rules: int
    reasoning_trace: list[ReasoningStep]
    matched_criteria: list[EvidenceSchema]
    disqualifying_criteria: list[EvidenceSchema]
    missing_information: list[ResidualUnknownSchema]
    timestamp: str


class SessionTraceResponse(BaseModel):
    session_id: str
    bundle_id: str
    document_id: str
    scheme_name: str
    overall_verdict: str
    summary: str
    reasoning_trace: list[ReasoningStep]
    all_evidence: list[EvidenceSchema]
    missing_information: list[ResidualUnknownSchema]
    timestamp: str


class SchemeListItem(BaseModel):
    document_id: str
    scheme_name: str
    version: str | None = None
    rule_count: int
    extraction_confidence: float | None = None
    upload_timestamp: str


class SchemeListResponse(BaseModel):
    schemes: list[SchemeListItem]
    total: int
