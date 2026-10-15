export interface DocumentUploadResponse {
  document_id: string
  filename: string
  scheme_name: string
  version: string | null
  page_count: number
  content_hash: string
  markdown_preview: string
  extracted_rules_count: number
  extraction_confidence: number | null
  message: string
}

export interface ExtractedRule {
  rule_id: string
  field: string
  field_label: string | null
  operator: string
  value: unknown
  value_type: string
  is_mandatory: boolean
  is_exception: boolean
  exception_to: string | null
  source_section: string | null
  source_page: number | null
  source_text: string
  confidence: number
  notes: string | null
  amendment_reference: string | null
  external_dependency: string | null
}

export interface DocumentRulesResponse {
  document_id: string
  scheme_name: string
  rules: ExtractedRule[]
  rule_count: number
  extraction_confidence: number | null
}

export interface SourceCitation {
  document_id: string
  scheme_name: string
  section: string | null
  page: number | null
  text: string
}

export interface Evidence {
  evidence_id: string
  rule_id: string
  field: string
  field_label: string
  operator: string
  rule_value: unknown
  user_value: unknown
  verdict: string
  confidence: string
  source: SourceCitation
  limitations: string | null
}

export interface ResidualUnknown {
  field: string
  field_label: string
  recommendation: string
  impact: string
}

export interface ReasoningStep {
  step: number
  rule_id: string
  field: string
  field_label: string
  operator: string
  required_value: unknown
  user_value: unknown
  result: string
  explanation: string
  source_text: string
  is_exception: boolean
  is_mandatory: boolean
}

export interface EligibilityCheckResponse {
  session_id: string
  bundle_id: string
  document_id: string
  scheme_name: string
  overall_verdict: string
  summary: string
  matched_count: number
  failed_count: number
  unknown_count: number
  total_rules: number
  reasoning_trace: ReasoningStep[]
  matched_criteria: Evidence[]
  disqualifying_criteria: Evidence[]
  missing_information: ResidualUnknown[]
  timestamp: string
}

export interface SchemeListItem {
  document_id: string
  scheme_name: string
  version: string | null
  rule_count: number
  extraction_confidence: number | null
  upload_timestamp: string
}

export interface SchemeListResponse {
  schemes: SchemeListItem[]
  total: number
}

export interface CitizenDocument {
  id: string
  doc_type: string
  filename: string
  extracted_fields: Record<string, unknown>
  upload_timestamp: string
}

export interface CitizenDocumentsResponse {
  documents: CitizenDocument[]
  aggregated_profile: Record<string, unknown>
}

export interface RequiredDocument {
  doc_type: string
  covers_fields: string[]
  is_uploaded: boolean
}

export interface RequiredDocumentsResponse {
  required: RequiredDocument[]
  profile_coverage: Record<string, unknown>
  missing_fields: string[]
  covered_fields: string[]
}

export interface Recommendation {
  id: string
  name: string
  level: string
  state: string | null
  description: string
  tags: string[]
  match_score: number
  match_reasons: string[]
  has_structured_rules: boolean
  document_id: string | null
}

export interface RecommendationsResponse {
  recommendations: Recommendation[]
  profile_field_count: number
}
