# BYTE02 — The Policy Maze
## Explainable Policy Interpretation & Eligibility Decision Support
### Complete Implementation Plan — Byteathon 2026 Grand Finale

**Duration:** 24 Hours | 15-16 Oct 2026
**Team Project:** BYTE02 — Law, Governance & Public Services
**Judge Profile:** Full-stack Java developer

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Our Solution — What We're Building](#2-our-solution)
3. [Why We Win — The Gap No One Fills](#3-why-we-win)
4. [Tech Stack](#4-tech-stack)
5. [Architecture](#5-architecture)
6. [Project Structure](#6-project-structure)
7. [Core Systems Design](#7-core-systems-design)
8. [API Endpoints](#8-api-endpoints)
9. [Database Schema](#9-database-schema)
10. [LLM Prompt Engineering](#10-llm-prompt-engineering)
11. [Patterns from Reverse-Engineered Projects](#11-patterns-from-reverse-engineered-projects)
12. [Implementation Phases](#12-implementation-phases)
13. [n8n Workflow Integration](#13-n8n-workflow-integration)
14. [Frontend Components](#14-frontend-components)
15. [Key Design Decisions](#15-key-design-decisions)
16. [Reference Projects](#16-reference-projects)
17. [Data Sources](#17-data-sources)
18. [Verification Checklist](#18-verification-checklist)
19. [Demo Script](#19-demo-script)
20. [The 30-Second Pitch](#20-the-30-second-pitch)

---

## 1. Problem Statement

Government schemes, institutional regulations, and public benefit programs frequently contain overlapping eligibility requirements, exceptions, conflicting documents, and amendments. Determining whether an individual qualifies for a particular benefit is complicated, time-consuming, and prone to error.

**The Challenge:** Build an intelligent platform that:
- Interprets policy documents (PDFs)
- Extracts eligibility requirements automatically
- Resolves applicable exceptions
- Evaluates eligibility based on user information
- Provides **traceable explanations** for every decision
- Handles incomplete documentation
- Recognizes policy changes
- Does NOT rely on unsupported assumptions

**Optional n8n Integration:** Document ingestion, approval routing, amendment notifications, application status workflows.

---

## 2. Our Solution

A **neurosymbolic eligibility platform** that:

1. **Reads** government policy PDFs and automatically extracts structured eligibility rules using AI
2. **Evaluates** user eligibility against those rules using a deterministic engine (no AI hallucination)
3. **Explains** every decision by tracing it back to the exact section, page, and quoted text in the source document
4. **Detects** conflicts between overlapping policies and flags them
5. **Tracks** policy amendments and shows what changed
6. **Automates** workflows via n8n (document ingestion, alerts, approval routing)

**The key innovation:** LLM extracts rules (neural) → Deterministic engine evaluates (symbolic) → Every verdict is traceable to source text. No hallucination. No black boxes.

---

## 3. Why We Win — The Gap No One Fills

| Feature | MyScheme | Haqdarshak | OpenFisca | SchemeAI | gov-scheme-checker | **Us** |
|---|---|---|---|---|---|---|
| AI Rule Extraction from PDFs | x | x | x | x | x | **YES** |
| Deterministic Evaluation | x | ~ | YES | ~ | YES | **YES** |
| Source-Traced Explanations | x | x | ~ | x | x | **YES** |
| Conflict Detection | x | x | x | x | x | **YES** |
| Amendment Tracking | x | x | x | x | x | **YES** |
| Handles Incomplete Data | x | x | x | x | ~ | **YES** |

**No existing product combines all six.** Everyone either manually codes rules (taking weeks) or uses pure LLM chat (risking hallucination).

---

## 4. Tech Stack

| Layer | Tool | Why |
|---|---|---|
| **Backend** | Python + FastAPI | Fast to build, auto-generated API docs at /docs, async support |
| **LLM** | Groq (free tier) + Llama 3.1 8B Instant | Free, blazing fast inference, OpenAI-compatible SDK, validated by SchemeAI project |
| **PDF Parsing** | PyMuPDF + PyMuPDF4LLM | 10-50x faster than alternatives, outputs LLM-ready Markdown with tables |
| **Vector DB** | ChromaDB | Zero-config local, 4-function API (create, add, query, get) |
| **Database** | SQLite via aiosqlite | Zero setup, async support, stores rules + profiles + evidence |
| **Frontend** | React 18 + Tailwind CSS + Vite | Fast dev, clean UI, component-based |
| **Automation** | n8n | Document ingestion, amendment alerts, approval routing workflows |
| **Validation** | Pydantic v2 | Strict schema validation at every API boundary |

### Dependencies (requirements.txt)
```
fastapi==0.115.0
uvicorn[standard]==0.31.0
pymupdf4llm==0.0.17
chromadb==0.5.0
groq==0.11.0
aiosqlite==0.20.0
python-multipart==0.0.9
httpx==0.27.0
pydantic==2.9.0
python-dotenv==1.0.1
```

---

## 5. Architecture

### Hexagonal / Clean Architecture

Inspired by the morluto/rea project's architecture. Inward-flowing dependencies with pluggable adapters.

```
┌─────────────────────────────────────────────────────────────┐
│                         ROUTES                               │
│  (Thin HTTP handlers — validate input, call services, return)│
│  documents.py │ eligibility.py │ schemes.py │ webhooks.py    │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    APPLICATION LAYER                          │
│  (Orchestration — wires domain logic + adapters)             │
│  document_service.py │ eligibility_service.py │ session.py   │
│  providers.py │ diff_service.py                              │
└───────────┬───────────────────────────┬─────────────────────┘
            │                           │
┌───────────▼───────────┐   ┌───────────▼─────────────────────┐
│     DOMAIN LAYER      │   │         ADAPTERS                 │
│  (Pure logic, ZERO    │   │  (External system integrations)  │
│   external deps)      │   │                                  │
│                       │   │  pdf_provider.py   (PyMuPDF4LLM) │
│  evidence.py          │   │  llm_provider.py   (Groq API)    │
│  evidence_bundle.py   │   │  vector_store.py   (ChromaDB)    │
│  rule.py              │   │  database.py       (SQLite)      │
│  rule_engine.py       │   │  n8n_webhook.py    (n8n)         │
│  conflict.py          │   │                                  │
│  unknown.py           │   │                                  │
│  policy_diff.py       │   │                                  │
│  result.py            │   │                                  │
└───────────────────────┘   └─────────────────────────────────┘
            ↑
┌───────────┴───────────┐
│       CONTRACTS       │
│  (Pydantic schemas)   │
│  schemas.py           │
│  errors.py            │
└───────────────────────┘
```

### Data Flow

```
User uploads PDF
    │
    ▼
[PDF Provider] → Extract text as Markdown (PyMuPDF4LLM)
    │
    ▼
[Document Service] → Chunk by sections → Embed into ChromaDB
    │
    ▼
[LLM Provider] → Send chunks to Groq (Llama 3.1) with extraction prompt
    │                → temperature=0, structured JSON output
    ▼
[Domain: Rule] → Parse LLM response into PolicyRule frozen dataclasses
    │              → Validate with Pydantic, store in SQLite
    ▼
User submits profile
    │
    ▼
[Eligibility Service] → Load rules for selected scheme(s)
    │
    ▼
[Domain: Rule Engine] → Evaluate each rule deterministically
    │                    → Three-valued: True / False / None
    │                    → NO LLM involved — pure Python
    ▼
[Domain: Evidence] → Create immutable evidence record per rule
    │                 → Content-hash ID, source citation, confidence
    ▼
[Domain: Evidence Bundle] → Aggregate into overall verdict
    │                        → ELIGIBLE / NOT_ELIGIBLE / PARTIAL / INSUFFICIENT_DATA
    │                        → Track matched, missing, disqualifying
    ▼
[Domain: Conflict] → Check for contradictions across policies
    │
    ▼
[Eligibility Service] → Build reasoning trace (ordered steps with citations)
    │
    ▼
API Response → Evidence bundle + reasoning trace + conflicts + unknowns
    │
    ▼
[n8n Webhook] → Fire notification (eligible → approve, conflict → route to reviewer)
```

---

## 6. Project Structure

```
Bytethon/
├── backend/
│   ├── main.py                        # FastAPI app entry, CORS, lifespan
│   ├── config.py                      # Settings from env vars
│   │
│   ├── domain/                        # Pure logic — NO external dependencies
│   │   ├── __init__.py
│   │   ├── evidence.py                # EligibilityEvidence (immutable, hash-authenticated)
│   │   ├── evidence_bundle.py         # EligibilityEvidenceBundle (aggregated verdict)
│   │   ├── rule.py                    # PolicyRule frozen dataclass
│   │   ├── rule_engine.py             # Deterministic evaluator (pure functions)
│   │   ├── conflict.py                # Conflict detection between policies
│   │   ├── unknown.py                 # ResidualUnknown: missing data tracking
│   │   ├── policy_diff.py            # Policy version diffing logic
│   │   └── result.py                  # Result[T, E] discriminated union
│   │
│   ├── contracts/                     # Pydantic schemas — API boundary
│   │   ├── __init__.py
│   │   ├── schemas.py                 # All request/response models
│   │   └── errors.py                  # Discriminated error codes + ApiError
│   │
│   ├── application/                   # Orchestration workflows
│   │   ├── __init__.py
│   │   ├── providers.py               # PolicySourceProvider interface
│   │   ├── session.py                 # AssessmentSession with evidence accumulation
│   │   ├── document_service.py        # Upload → parse → extract → store
│   │   ├── eligibility_service.py     # Profile → evaluate → evidence → trace
│   │   └── diff_service.py           # Version comparison workflow
│   │
│   ├── adapters/                      # External system integrations
│   │   ├── __init__.py
│   │   ├── pdf_provider.py            # PyMuPDF4LLM PDF parsing
│   │   ├── llm_provider.py            # Groq API (Llama 3.1) rule extraction
│   │   ├── vector_store.py            # ChromaDB adapter
│   │   ├── database.py                # SQLite adapter (aiosqlite)
│   │   └── n8n_webhook.py             # n8n webhook trigger adapter
│   │
│   ├── routes/                        # Thin FastAPI route handlers
│   │   ├── __init__.py
│   │   ├── documents.py               # /api/documents/*
│   │   ├── eligibility.py             # /api/eligibility/*
│   │   ├── schemes.py                 # /api/schemes/*
│   │   └── webhooks.py                # /api/webhooks/* (n8n)
│   │
│   ├── prompts/                       # LLM prompt templates
│   │   ├── __init__.py
│   │   ├── rule_extraction.py         # Structured rule extraction prompt
│   │   └── conflict_analysis.py       # Conflict interpretation prompt
│   │
│   └── db/
│       ├── __init__.py
│       └── schema.sql                 # SQLite DDL
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/
│       │   └── client.ts              # Typed API client
│       ├── components/
│       │   ├── Layout.tsx             # Shell with sidebar navigation
│       │   ├── DocumentUpload.tsx     # Drag-and-drop PDF upload
│       │   ├── ExtractedRulesTable.tsx # Rules table with source citations
│       │   ├── UserProfileForm.tsx    # Multi-step dynamic profile form
│       │   ├── EligibilityResult.tsx  # Verdict card (large, color-coded)
│       │   ├── ReasoningTrace.tsx     # Step-by-step decision chain
│       │   ├── ConflictAlert.tsx      # Conflict detection display
│       │   ├── PolicyDiffViewer.tsx   # Side-by-side policy comparison
│       │   └── SchemeComparison.tsx   # Multi-scheme eligibility matrix
│       ├── pages/
│       │   ├── Dashboard.tsx          # Landing page, scheme list
│       │   ├── UploadPage.tsx         # Document upload flow
│       │   ├── CheckEligibility.tsx   # Profile + check flow
│       │   └── PolicyDiff.tsx         # Diff viewer page
│       └── types/
│           └── index.ts               # TypeScript types mirroring backend schemas
│
├── n8n/
│   ├── workflows/
│   │   ├── document-ingestion.json    # Webhook → parse → extract → notify
│   │   ├── amendment-alert.json       # Scheduled → diff → alert
│   │   └── approval-routing.json      # Eligible → route → notify
│   └── README.md
│
├── data/
│   └── sample_policies/               # Real Indian scheme PDFs for demo
│
├── requirements.txt
├── .env.example
├── .gitignore
├── PLAN.md                            # This file
└── BYTE02_Research.md                 # Research document
```

---

## 7. Core Systems Design

### 7.1 Evidence System (from REA's evidence.ts)

Every eligibility verdict is an **immutable, hash-authenticated evidence record**:

```python
@dataclass(frozen=True)
class EligibilityEvidence:
    evidence_id: str           # "elig_" + sha256(canonical content)
    rule_id: str               # Which rule was evaluated
    field: str                 # e.g., "age", "income", "category"
    operator: str              # e.g., ">=", "in", "equals"
    threshold: Any             # Rule's required value
    user_value: Any | None     # User's actual value (None if missing)
    verdict: Literal["pass", "fail", "insufficient_data", "conflict"]
    confidence: Literal["observed", "derived", "inferred"]
    authority: Literal["policy-document", "user-attestation", "system-derived"]
    source_document: str       # Document filename
    source_page: int | None    # Page number in PDF
    source_section: str        # Section reference (e.g., "Section 3.2")
    source_text: str           # Exact quoted text from the PDF
    limitations: list[str]     # What this evidence cannot determine
    timestamp: str             # ISO 8601
```

### 7.2 Evidence Bundle

```python
@dataclass(frozen=True)
class EligibilityEvidenceBundle:
    bundle_id: str
    session_id: str
    scheme_id: str
    profile_id: str
    overall_verdict: Literal["eligible", "not_eligible", "partial", "insufficient_data"]
    evidence_records: list[EligibilityEvidence]   # All rule evaluations
    matched_criteria: list[str]                    # What passed
    disqualifying_criteria: list[str]              # What failed
    missing_information: list[str]                 # What's unknown
    conflicts: list[PolicyConflict]                # Detected conflicts
    unknowns: list[ResidualUnknown]               # Missing data with recommendations
    summary: str                                   # Human-readable summary
    timestamp: str
```

### 7.3 Residual Unknown (from REA's residualUnknown.ts)

```python
@dataclass(frozen=True)
class ResidualUnknown:
    unknown_id: str
    question: str              # "Does applicant hold BPL card?"
    severity: Literal["low", "medium", "high", "critical"]
    status: Literal["open", "blocked", "resolved"]
    required_user_fields: list[str]  # What data would resolve this
    recommendation: str        # "Please provide BPL certificate"
```

### 7.4 Deterministic Rule Engine

```python
# 12 operators (from Tender-Sahayak)
OPERATORS = {
    "equals":                    lambda u, t: u == t,
    "not_equals":                lambda u, t: u != t,
    "greater_than":              lambda u, t: u > t,
    "greater_than_or_equal":     lambda u, t: u >= t,
    "less_than":                 lambda u, t: u < t,
    "less_than_or_equal":        lambda u, t: u <= t,
    "contains":                  lambda u, t: t.lower() in str(u).lower(),
    "not_contains":              lambda u, t: t.lower() not in str(u).lower(),
    "in":                        lambda u, t: u in t,
    "not_in":                    lambda u, t: u not in t,
    "between":                   lambda u, t: t["min"] <= u <= t["max"],
    "exists":                    lambda u, t: u is not None,
}

def evaluate_rule(rule, profile) -> EligibilityEvidence:
    """Three-valued: True (pass) / False (fail) / None (insufficient data)"""
    user_value = getattr(profile, rule.field, None)
    if user_value is None:
        return evidence(verdict="insufficient_data", ...)
    passed = OPERATORS[rule.operator](user_value, rule.value)
    return evidence(verdict="pass" if passed else "fail", ...)

def evaluate_scheme(rules, profile) -> EligibilityEvidenceBundle:
    """
    1. Evaluate all base rules
    2. Check exception rules (override base failures)
    3. Detect conflicts
    4. Aggregate: all pass → eligible, any fail → not_eligible,
       any None (no fail) → partial/insufficient_data
    """
```

### 7.5 Conflict Detection

```python
def detect_conflicts(rules_across_documents) -> list[PolicyConflict]:
    """
    Conflicts arise when:
    1. Same field, contradictory thresholds across two documents
    2. Exception in one document contradicts base rule in another
    3. Amendment supersedes a rule that another document still references
    """
    # Group rules by field → compare pairs from different documents
    # Flag contradictions (e.g., Doc A: income <= 200000, Doc B: income <= 250000)
```

---

## 8. API Endpoints

### Document Management
```
POST   /api/documents/upload
  Input:  multipart/form-data { file: PDF, scheme_name: str, version?: str }
  Output: { document_id, filename, page_count, rules: ExtractedRule[], extraction_confidence, warnings }

GET    /api/documents/{document_id}/rules
  Output: { document_id, scheme_name, rules: ExtractedRule[], rule_count, extraction_metadata }

POST   /api/documents/diff
  Input:  { document_id_v1: str, document_id_v2: str }
  Output: { added_rules, removed_rules, modified_rules, impact_summary }
```

### Eligibility
```
POST   /api/eligibility/check
  Input:  { profile: UserProfile, scheme_ids: str[] }
  Output: { session_id, results: SchemeEligibilityResult[], cross_scheme_conflicts, timestamp }

GET    /api/eligibility/{session_id}/trace
  Output: { session_id, steps: ReasoningStep[], source_citations, verdict, evidence_bundle }
```

### Schemes
```
GET    /api/schemes
  Output: { schemes: SchemeInfo[], total: int }
```

### Profiles
```
POST   /api/profile
  Input:  UserProfile { name, age, gender, income, category, state, education, occupation, ... }
  Output: { profile_id, ... }
```

### n8n Webhooks
```
POST   /api/webhooks/document-ingested     → Called by n8n after PDF processing
POST   /api/webhooks/amendment-detected    → Called by n8n when amendment found
POST   /api/webhooks/approval-decision     → Called by n8n after human review
```

---

## 9. Database Schema

```sql
CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    scheme_name TEXT NOT NULL,
    version TEXT,
    raw_text TEXT NOT NULL,
    content_hash TEXT NOT NULL,          -- SHA-256 for versioning
    page_count INTEGER,
    upload_timestamp TEXT NOT NULL,
    extraction_confidence REAL
);

CREATE TABLE rules (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id),
    field TEXT NOT NULL,
    field_label TEXT,
    operator TEXT NOT NULL,              -- one of 12 operators
    value TEXT NOT NULL,                 -- JSON-encoded
    value_type TEXT NOT NULL,            -- number, string, boolean, list, range
    is_mandatory INTEGER DEFAULT 1,
    is_exception INTEGER DEFAULT 0,
    exception_to TEXT,                   -- references rules(id)
    source_section TEXT,
    source_page INTEGER,
    source_text TEXT NOT NULL,
    confidence REAL DEFAULT 1.0,
    notes TEXT,
    amendment_reference TEXT,
    external_dependency TEXT
);

CREATE TABLE profiles (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,                  -- JSON-encoded profile
    created_at TEXT NOT NULL
);

CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    profile_id TEXT REFERENCES profiles(id),
    created_at TEXT NOT NULL
);

CREATE TABLE evidence_records (
    id TEXT PRIMARY KEY,                 -- content-hash ID ("elig_" + sha256)
    session_id TEXT REFERENCES sessions(id),
    rule_id TEXT REFERENCES rules(id),
    field TEXT,
    verdict TEXT NOT NULL,               -- pass, fail, insufficient_data, conflict
    confidence TEXT NOT NULL,            -- observed, derived, inferred
    authority TEXT NOT NULL,
    user_value TEXT,                     -- JSON-encoded
    source_document TEXT,
    source_page INTEGER,
    source_section TEXT,
    source_text TEXT,
    limitations TEXT,                    -- JSON array
    timestamp TEXT NOT NULL
);

CREATE TABLE evidence_bundles (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES sessions(id),
    scheme_id TEXT,
    profile_id TEXT REFERENCES profiles(id),
    overall_verdict TEXT NOT NULL,       -- eligible, not_eligible, partial, insufficient_data
    matched_criteria TEXT,               -- JSON array
    disqualifying_criteria TEXT,         -- JSON array
    missing_information TEXT,            -- JSON array
    summary TEXT,
    conflicts TEXT,                      -- JSON array
    unknowns TEXT,                       -- JSON array
    timestamp TEXT NOT NULL
);
```

---

## 10. LLM Prompt Engineering

### Rule Extraction Prompt

```
SYSTEM:
You are a legal document analyst specializing in government policy interpretation.
Extract ALL eligibility criteria from the provided policy text as structured JSON rules.

RULES:
1. Each rule must cite the EXACT source text and section number
2. Extract field name, comparison operator, and threshold value
3. Mark rules as mandatory or optional (exceptions/waivers)
4. Flag ambiguous language with confidence < 1.0
5. Identify exception clauses that override base rules
6. Extract amendment/supersession references if present
7. Do NOT invent or assume — only extract what is explicitly stated
8. Handle Indian number notation: "5 crore" = 50000000, "2.5 lakh" = 250000

OUTPUT FORMAT (strict JSON array):
[
  {
    "rule_id": "rule_001",
    "field": "age",
    "field_label": "Applicant Age",
    "operator": "greater_than_or_equal",
    "value": 18,
    "value_type": "number",
    "is_mandatory": true,
    "is_exception": false,
    "exception_to": null,
    "source_section": "Section 3.2(a)",
    "source_page": 4,
    "source_text": "The applicant must have attained the age of 18 years...",
    "confidence": 0.95,
    "notes": "",
    "amendment_reference": null,
    "external_dependency": null
  }
]

USER:
Analyze the following policy document and extract all eligibility criteria:

DOCUMENT: {scheme_name}
VERSION: {version}
TEXT:
---
{extracted_markdown_text}
---
```

### Extraction Settings
- **Model:** Llama 3.1 8B Instant (via Groq)
- **Temperature:** 0 (deterministic extraction)
- **Response format:** JSON mode
- **Fallback:** Regex-based pre-extraction if LLM fails

---

## 11. Patterns from Reverse-Engineered Projects

### From `ai-refund-eligibility-assistant` (FastAPI + Gemini) — Architecture Gold Standard

1. **Three-valued rule evaluation**: True/False/None. Any False → NOT_ELIGIBLE, any None (no False) → NEEDS_REVIEW, all True → ELIGIBLE.
2. **Two-tier assessment**: Tier 1 = deterministic rules (always runs). Tier 2 = LLM that only selects from existing evidence, never generates. Falls back to `"deterministic_fallback"` if LLM fails. **Anti-hallucination pattern.**
3. **Investigation record**: Stores recommendation, explanation, evidence_json, rule_results_json, policy_evidence_json, assessment_source.
4. **Policy versioning**: SHA-256 hash + snapshot at assessment time for audit trail.

### From `Tender-Sahayak` (Node.js + OpenAI) — PDF Extraction Reference

5. **Dual extraction engine**: Regex pre-extraction (fast, free) + LLM structured output (comprehensive). Fallback if API fails.
6. **12-operator system**: equals, not_equals, greater_than, greater_than_or_equal, less_than, less_than_or_equal, contains, not_contains, in, not_in, between, exists.
7. **Three-state evaluation**: pass / fail / review. Multi-format audit reports.
8. **Indian number handling**: "5 crore" → 50000000, "2.5 lakh" → 250000.

### From `ai-automation-workflow` (Python + LangChain + n8n) — Pipeline Reference

9. **LLM extraction**: `ChatPromptTemplate` + `with_structured_output(Model)` + `temperature=0`.
10. **Immutable decisions**: Frozen dataclass. Separation of extraction from evaluation.
11. **n8n pattern**: Webhook → Execute → IF → Branch (approved / needs review).
12. **Pipeline**: `read → extract → evaluate → output`. Clean sequential flow.

### From `gov-scheme-checker` (React + Supabase) — Frontend Reference

13. **Multi-step form**: 6 steps (personal → social → economic → education → location → other) with per-step validation.
14. **`matchedCriteria` / `missingInformation` / `disqualifyingCriteria`** triple for explainability.
15. **15+ real Indian schemes** as seed data with actual rules.

### From `Government-scheme-checker` (PHP + SQLite) — Data Reference

16. **SQLite schema**: schemes + scheme_criteria tables, operator-based rule evaluation, 4,680+ pre-built scheme records.

### From `SchemeAI` (Streamlit + Groq) — LLM Reference

17. **Groq + Llama 3.1 8B Instant** validated in production. Free tier. Fast inference.

---

## 12. Implementation Phases

### Phase 1: Foundation (Hours 0-4)
**Goal:** Project scaffolding, database, PDF upload, text extraction.

**Create:**
- `requirements.txt` — all Python dependencies
- `backend/main.py` — FastAPI app with CORS, lifespan (DB init)
- `backend/config.py` — Settings from env vars (GROQ_API_KEY, DB_PATH, CHROMA_PATH)
- `backend/db/schema.sql` — Full SQLite schema
- `backend/adapters/database.py` — SQLite connection + schema initialization
- `backend/adapters/pdf_provider.py` — PyMuPDF4LLM text extraction
- `backend/domain/result.py` — Result[T, E] type
- `backend/contracts/schemas.py` — Initial Pydantic models
- `backend/contracts/errors.py` — Error codes + ApiError model
- `backend/routes/documents.py` — POST /api/documents/upload
- `.env.example`, `.gitignore`

**Verify:** `curl -X POST localhost:8000/api/documents/upload -F "file=@sample.pdf"` returns extracted Markdown. `/docs` shows API.

---

### Phase 2: Rule Extraction Engine (Hours 4-8)
**Goal:** LLM extracts structured JSON rules from PDF text.

**Create:**
- `backend/adapters/llm_provider.py` — Groq client, structured JSON output, retry logic
- `backend/adapters/vector_store.py` — ChromaDB: embed chunks, store, query
- `backend/prompts/rule_extraction.py` — System + user prompt templates
- `backend/domain/rule.py` — PolicyRule frozen dataclass
- `backend/application/providers.py` — PolicySourceProvider interface + PdfPolicyProvider
- `backend/application/document_service.py` — Full pipeline: upload → parse → chunk → extract → store

**Modify:**
- `backend/routes/documents.py` — Wire extraction, add GET /documents/{id}/rules
- `backend/contracts/schemas.py` — Add ExtractionMetadata, DocumentRulesResponse

**Verify:** Upload PM Kisan PDF → get structured rules with source citations as JSON.

---

### Phase 3: Eligibility Engine + Evidence System (Hours 8-14)
**Goal:** Deterministic evaluation producing traceable evidence bundles.

**Create:**
- `backend/domain/evidence.py` — EligibilityEvidence (immutable, content-hash ID)
- `backend/domain/evidence_bundle.py` — EligibilityEvidenceBundle
- `backend/domain/unknown.py` — ResidualUnknown
- `backend/domain/rule_engine.py` — Deterministic evaluator with 12 operators
- `backend/application/session.py` — AssessmentSession
- `backend/application/eligibility_service.py` — Full workflow + trace builder
- `backend/routes/eligibility.py` — POST /api/eligibility/check, GET /trace
- `backend/routes/schemes.py` — GET /api/schemes

**Modify:**
- `backend/contracts/schemas.py` — Add eligibility request/response models
- `backend/main.py` — Register new routes

**Verify:** POST user profile → get verdict with full reasoning trace. Every step cites source text.

---

### Phase 4: Frontend (Hours 14-19)
**Goal:** Working React UI end-to-end.

**Create:**
- Frontend scaffold: package.json, vite.config.ts, tailwind.config.js
- `src/api/client.ts` — Typed fetch wrapper
- `src/types/index.ts` — TypeScript types mirroring Pydantic models
- `src/components/Layout.tsx` — Sidebar nav
- `src/components/DocumentUpload.tsx` — Drag-and-drop
- `src/components/ExtractedRulesTable.tsx` — Sortable rules with source popover
- `src/components/UserProfileForm.tsx` — Multi-step dynamic form
- `src/components/EligibilityResult.tsx` — Large verdict badge
- `src/components/ReasoningTrace.tsx` — Step cards (green/red/yellow/orange)
- Pages: Dashboard, Upload, CheckEligibility

**Verify:** Open localhost:5173, upload PDF, fill profile, see results with reasoning trace.

---

### Phase 5: Advanced Features + n8n (Hours 19-22)
**Goal:** Conflict detection, policy diff, n8n workflows.

**Create:**
- `backend/domain/conflict.py` — Detect contradictory thresholds
- `backend/domain/policy_diff.py` — Diff rules between versions
- `backend/application/diff_service.py` — Diff orchestration
- `backend/adapters/n8n_webhook.py` — Fire-and-forget webhook
- `backend/routes/webhooks.py` — n8n callback endpoints
- `frontend/src/components/PolicyDiffViewer.tsx`
- `frontend/src/components/SchemeComparison.tsx`
- `n8n/workflows/*.json` — 3 workflow definitions

**Verify:** Upload two policy versions → see diff. n8n workflows fire.

---

### Phase 6: Polish & Demo Prep (Hours 22-24)
**Goal:** Demo-ready with sample data and error handling.

**Tasks:**
- Download real scheme PDFs into `data/sample_policies/`
- Pre-load sample data for instant demo
- Add loading spinners, error toasts, empty states
- Global exception handler returning ApiError format
- Architecture diagram for presentation
- README with setup instructions
- Demo script practice

---

## 13. n8n Workflow Integration

### Workflow 1: Document Ingestion
```
Webhook (POST) → HTTP: POST /api/documents/upload → IF: confidence > 0.8
    → Yes: Notify "Scheme processed, {rule_count} rules extracted"
    → No:  Notify "Low confidence, manual review needed"
```

### Workflow 2: Amendment Alert
```
Cron (daily 9am) → HTTP: GET /api/schemes → Loop each scheme
    → HTTP: POST /api/documents/diff → IF: has changes
        → Notify "Amendment detected: {scheme_name}. {impact_summary}"
```

### Workflow 3: Approval Routing
```
Webhook (from backend after check) → IF: verdict == "eligible"
    → Notify "User eligible, begin application"
→ IF: verdict == "partial" or "conflict"
    → Route to human reviewer with trace link
→ IF: verdict == "insufficient_data"
    → Email user "Please provide {missing_fields}"
```

---

## 14. Frontend Components

| Component | Purpose | Key Feature |
|---|---|---|
| `Layout.tsx` | Shell with nav | Sidebar: Dashboard, Upload, Check, Diff |
| `DocumentUpload.tsx` | PDF upload | Drag-and-drop, progress bar, shows extracted rules on success |
| `ExtractedRulesTable.tsx` | Rules display | Sortable table; click to see source text popover; confidence badge |
| `UserProfileForm.tsx` | User data | Multi-step (personal → economic → education → location); dynamic fields |
| `EligibilityResult.tsx` | Verdict | Large badge (green/red/yellow), confidence %, summary |
| `ReasoningTrace.tsx` | Decision chain | Step cards: green check (pass), red X (fail), yellow ? (missing), orange ! (conflict) |
| `ConflictAlert.tsx` | Conflicts | Orange cards with both interpretations and source quotes |
| `PolicyDiffViewer.tsx` | Version diff | Added (green), removed (red), modified (yellow) rules |
| `SchemeComparison.tsx` | Multi-scheme | Grid: rows = criteria, columns = schemes, cells = pass/fail/missing |

---

## 15. Key Design Decisions

| # | Decision | Rationale | Source |
|---|---|---|---|
| 1 | Evidence records as core primitive | Every decision is immutable, hash-verified, with provenance | REA + refund-assistant |
| 2 | Three-valued logic (True/False/None) | Insufficient data is a first-class outcome, not an error | refund-assistant |
| 3 | Two-tier anti-hallucination | Deterministic first, LLM only selects existing evidence | refund-assistant |
| 4 | Dual extraction (regex + LLM) | Graceful degradation if API fails | Tender-Sahayak |
| 5 | Domain has ZERO external deps | Pure Python, testable in isolation | Hexagonal architecture |
| 6 | Explicit neurosymbolic split | LLM in adapters only, rule engine is deterministic | Academic research |
| 7 | Groq + Llama 3.1 8B | Free tier, validated in production by SchemeAI | SchemeAI project |
| 8 | Provider adapter pattern | PDF today, API tomorrow, interface is stable | REA pattern |
| 9 | 12-operator system | Proven in production, covers all comparison types | Tender-Sahayak |
| 10 | Multi-format output | JSON (API), Markdown (reports), UI cards (frontend) | Tender-Sahayak |

---

## 16. Reference Projects

| Project | GitHub User | Stack | What We Take |
|---|---|---|---|
| ai-refund-eligibility-assistant | gaganakumarm | FastAPI + Gemini | Three-valued logic, two-tier assessment, investigation records |
| Tender-Sahayak | PRINCE-TIWARI07 | Node + OpenAI | Full extraction pipeline, 12 operators, dual extraction |
| gov-scheme-checker | premsahu8960 | React + Supabase | Multi-step form, matched/missing/disqualifying, seed data |
| Government-scheme-checker | Elavarasu21 | PHP + SQLite | SQLite schema, 4,680+ schemes, operator eval |
| sih-scheme-matcher | Sonitmehta | FastAPI + SBERT | FastAPI structure, hybrid scoring, explanation templates |
| SchemeAI | jyoti-kumari-singh20 | Streamlit + Groq | Groq + Llama 3.1 8B (free, validated), RAG pipeline |

---

## 17. Data Sources

| Source | What's Available | Usage |
|---|---|---|
| myScheme.gov.in | 4,680+ schemes, usable API | Scheme metadata, eligibility info |
| india-govschemes-pipeline (GitHub) | Pre-scraped Excel of 4,680 schemes | Seed data |
| pmkisan.gov.in | PM Kisan guidelines PDF | Demo document |
| scholarships.gov.in | NSP scholarship PDFs | Demo document (overlapping eligibility) |
| pmjay.gov.in | Ayushman Bharat guidelines | Demo document (complex criteria) |
| gov-scheme-checker schemes.ts | 15+ schemes with actual rules | Seed data / reference |

---

## 18. Verification Checklist

| Phase | Test | Expected Result |
|---|---|---|
| 1 | `curl -X POST localhost:8000/api/documents/upload -F "file=@sample.pdf"` | Extracted Markdown text returned |
| 1 | Visit `localhost:8000/docs` | Auto-generated API docs visible |
| 2 | Upload PM Kisan PDF | Structured rules JSON with source citations |
| 3 | POST /api/eligibility/check with profile | Verdict + reasoning trace |
| 3 | Check with missing income field | "insufficient_data" with recommendation |
| 4 | Open localhost:5173 | Full UI: upload → rules → profile → results |
| 5 | Upload two policy versions | Diff showing added/removed/modified rules |
| 5 | POST triggers n8n webhook | n8n workflow fires notification |
| 6 | Full demo flow | No errors, clean UI, sample data works |

---

## 19. Demo Script (3-5 minutes, for Java dev judge)

1. **Upload** real PM Kisan PDF → show extracted rules table with source citations
2. **Click** any rule → see exact PDF section and quoted text it came from
3. **Fill** sample user profile (pre-filled for speed)
4. **Hit "Check Eligibility"** → show verdict with reasoning trace
5. **Walk through** each reasoning step → source text, pass/fail, explanation
6. **Show "insufficient data"** — remove income → re-check → system says "cannot determine, please provide income certificate"
7. **Upload second scheme** → multi-scheme comparison matrix
8. **Show n8n dashboard** → workflows firing on events
9. **Show `/docs`** → auto-generated API documentation (judge appreciates this)
10. **Show architecture diagram** → hexagonal layers, evidence system, neurosymbolic split

---

## 20. The 30-Second Pitch

> "Every existing solution either manually codes eligibility rules — taking weeks of developer time — or uses black-box AI that hallucinates answers. We built a **neurosymbolic platform** that automatically reads government policy PDFs, extracts verifiable rules, evaluates them deterministically, and traces every single decision back to the exact source text. Upload a policy PDF, and get explainable eligibility decisions in minutes — not weeks. No hallucination. No black boxes. Every answer comes with proof."
