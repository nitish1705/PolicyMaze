# Policy Maze — Presentation Guide
## Byteathon 2026 | BYTE02: Explainable Policy Interpretation & Eligibility Decision Support

---

## Slide 1: The Problem

- India has **2,000+ government schemes** across central and state levels
- Eligibility criteria are buried in dense PDF documents, written in legal language
- Rules **overlap, conflict, and get amended** frequently
- Citizens have no way to know what they qualify for without navigating a maze of documents
- Existing portals (MyScheme, Haqdarshak) give yes/no answers with **zero explanation**

**The gap:** No existing solution combines AI-powered rule extraction + deterministic evaluation + source-traced explanations + conflict resolution.

---

## Slide 2: Our Solution — Policy Maze

An AI-powered platform that:

1. **Parses** government policy documents and extracts structured eligibility rules
2. **Evaluates** citizen eligibility using a deterministic rule engine (not LLM guessing)
3. **Explains** every decision with exact citations from the source document
4. **Detects** conflicts between overlapping policies
5. **Automates** workflows via n8n integration

**Key insight:** The LLM extracts rules, but a **deterministic engine** evaluates them. Every verdict is traceable — never a black box.

---

## Slide 3: Architecture — Neurosymbolic Design

```
┌─────────────────────────────────────────────────┐
│                  NEURAL LAYER                    │
│    Groq LLM (Qwen 27B) extracts structured      │
│    rules from policy PDFs and citizen documents  │
└──────────────────────┬──────────────────────────┘
                       │ Structured JSON rules
┌──────────────────────▼──────────────────────────┐
│                SYMBOLIC LAYER                    │
│   Deterministic Rule Engine evaluates each rule  │
│   Three-valued logic: Pass / Fail / Unknown      │
│   12 operators, pure functions, zero LLM calls   │
└──────────────────────┬──────────────────────────┘
                       │ Evidence records
┌──────────────────────▼──────────────────────────┐
│               EVIDENCE LAYER                     │
│  Immutable, SHA-256 hash-authenticated records   │
│  Every verdict cites: document, page, section,   │
│  exact quoted text from the policy               │
└─────────────────────────────────────────────────┘
```

**Why this matters:** LLMs hallucinate. Our symbolic layer guarantees correctness. Every decision has a paper trail.

---

## Slide 4: Clean Architecture (Hexagonal)

```
Routes (thin HTTP handlers)
    ↓
Application Layer (orchestration workflows)
    ↓
Domain Layer (pure logic, ZERO external dependencies)
    ↑
Contracts (Pydantic schemas at every boundary)

Adapters (PDF parser, Groq LLM, SQLite, n8n)
    — pluggable via provider interfaces
```

- **Domain layer** has zero imports from FastAPI, Groq, or any external library
- **Rule engine** is pure Python functions — testable in complete isolation
- **Adapters are swappable** — change LLM provider without touching business logic

---

## Slide 5: Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Backend | Python + FastAPI | Auto-generated API docs, async support |
| LLM | Groq (free tier) + Qwen 27B | Zero cost, fast inference, JSON mode |
| PDF Parsing | PyMuPDF4LLM | 10-50x faster than alternatives, LLM-ready markdown |
| Database | SQLite (aiosqlite) | Zero setup, async, portable |
| Frontend | React + Tailwind + Vite | Government portal aesthetic |
| Automation | n8n | Visual workflow builder, webhook integration |
| Data | 3 GitHub repos | 2,100+ real Indian government schemes |

---

## Slide 6: Key Features

### 1. Dual Extraction Engine
- **Regex pre-pass** catches obvious patterns (age > 18, income < 2.5 lakh) — fast and free
- **LLM structured output** handles complex/ambiguous rules — comprehensive
- If LLM fails, regex results still work (graceful degradation)

### 2. 12-Operator Rule System
`equals` · `not_equals` · `greater_than` · `greater_than_or_equal` · `less_than` · `less_than_or_equal` · `contains` · `not_contains` · `in` · `not_in` · `between` · `exists`

### 3. Three-Valued Logic
- **True** → rule passes
- **False** → rule fails (disqualifying)
- **None** → insufficient data (tells user exactly what document to upload)

### 4. Smart Document Import
- Citizens upload personal documents (Aadhaar, income certificate, caste certificate)
- LLM extracts profile fields automatically — no manual form filling
- System tells you exactly which documents are missing for a given scheme

### 5. Conflict Detection
- Compares rules across different policy documents
- Detects: threshold mismatches, operator contradictions, value overlaps
- Severity levels: high / medium / low

---

## Slide 7: Data Sources — 2,100+ Real Schemes

| Source | Schemes | What it provides |
|---|---|---|
| gov-myscheme-dataset | 2,066 | Name, description, eligibility text, tags, state/central |
| schemefinder | 48 | Pre-structured YAML rules with operators and values |
| Yojana-setu | 18 | Seed schemes with detailed eligibility criteria |

**Total: 2,122 schemes** in the catalog — no API access needed, all sourced from open GitHub repositories.

---

## Slide 8: The Citizen Flow

```
1. Browse Catalog          → 2,100+ schemes searchable by name, state, tags
        ↓
2. Select a Scheme         → System shows what rules need to be checked
        ↓
3. Import Documents        → Upload Aadhaar, income cert, caste cert, etc.
   (AI extracts profile)     LLM reads documents, extracts your details
        ↓
4. Auto-Check Eligibility  → Deterministic engine evaluates every rule
        ↓
5. Traced Verdict          → ELIGIBLE / NOT_ELIGIBLE / PARTIAL / INSUFFICIENT_DATA
   with full reasoning       Each step cites the exact policy text
        ↓
6. Missing Info Guidance   → "Upload your Income Certificate to verify annual_income"
```

---

## Slide 9: Evidence & Traceability

Every eligibility decision produces:

- **Reasoning Trace** — step-by-step evaluation of each rule
  - Rule: `age >= 18` → Your value: `25` → **PASS**
  - Source: *"The applicant must be aged 18 years or above"* (Section 3.1, Page 2)

- **Evidence Bundle** — immutable record with:
  - Content-based ID (SHA-256 hash)
  - Matched criteria / Disqualifying criteria / Missing information
  - Source citations for every verdict

- **Conflict Report** — when rules from different documents contradict each other

**This is auditable.** Every decision can be traced back to the exact text in the policy document.

---

## Slide 10: n8n Workflow Automation

Three automated workflows:

1. **Document Ingestion** — When a policy is processed:
   - IF rules extracted → notify success
   - ELSE → alert for manual review

2. **Eligibility Routing** — When eligibility is checked:
   - ELIGIBLE → auto-approve pathway
   - PARTIAL → route to human review
   - NOT_ELIGIBLE → notify with reasons

3. **Conflict Alert** — When policy conflicts detected:
   - High severity → urgent alert
   - Low/medium → scheduled review queue

---

## Slide 11: API Design

```
POST  /api/documents/upload              Upload PDF, extract rules
GET   /api/documents/{id}/rules          Get rules with source citations
POST  /api/eligibility/check             Check eligibility, get evidence
GET   /api/eligibility/{session_id}/trace Full reasoning trace
POST  /api/documents/diff                Compare two policy versions
POST  /api/eligibility/multi-check       Check one profile against N schemes
GET   /api/catalog                       Search 2,100+ schemes
POST  /api/catalog/{id}/extract          On-demand LLM rule extraction
POST  /api/citizen/documents             Upload personal document, extract profile
GET   /api/citizen/profile               Aggregated profile from all documents
GET   /api/citizen/required-documents/{id} What documents needed for a scheme
```

Full interactive docs at `/docs` (auto-generated by FastAPI).

---

## Slide 12: What Makes This Different

| Feature | MyScheme | Haqdarshak | OpenFisca | **Policy Maze** |
|---|---|---|---|---|
| AI rule extraction from PDFs | No | No | No | **Yes** |
| Deterministic evaluation | No | No | Yes | **Yes** |
| Source-traced explanations | No | No | No | **Yes** |
| Conflict detection | No | No | No | **Yes** |
| Document-based profile | No | Partial | No | **Yes** |
| Works with any policy PDF | No | No | No | **Yes** |
| Open, auditable decisions | No | No | Partial | **Yes** |

---

## Slide 13: Demo Highlights

1. **Browse** the catalog — 2,100+ real Indian government schemes
2. **Select** PM Kisan → see extracted rules with source citations
3. **Import** an Aadhaar card → AI extracts name, age, gender automatically
4. **Check eligibility** → see PASS/FAIL for each rule with exact policy quotes
5. **Missing data** → system says "Upload Income Certificate to verify annual_income"
6. **Compare** two schemes → see rule diffs and conflicts highlighted
7. **API docs** at `/docs` → fully documented REST API
8. **n8n dashboard** → workflows firing on every event

---

## Slide 14: Future Scope

- **Multilingual support** — policy documents in Hindi, Tamil, Malayalam
- **Voice-based input** — citizens speak their details, AI fills the profile
- **Real-time policy monitoring** — auto-detect when government updates a scheme
- **Integration with DigiLocker** — pull verified documents directly
- **Mobile app** — take it to rural India where it's needed most
- **Policy recommendation engine** — "Based on your profile, you may also qualify for..."

---

## Slide 15: Team & Credits

- **Problem Statement:** BYTE02 — Explainable Policy Interpretation
- **Architecture:** Neurosymbolic (Neural extraction + Symbolic evaluation)
- **Data:** 2,122 schemes from 3 open-source repositories
- **Built in:** 24 hours at Byteathon 2026

> *"Every citizen deserves to know what they're entitled to — and exactly why."*

---

## Talking Points for Q&A

**Q: Why not just use an LLM to answer eligibility questions directly?**
A: LLMs hallucinate. Our LLM only extracts rules into structured JSON. The evaluation is 100% deterministic — pure functions with three-valued logic. We can prove every verdict is correct because it traces back to source text.

**Q: How do you handle policy amendments?**
A: Our policy diff engine compares two versions of a document, showing added/removed/modified rules. The conflict detector flags when amendments create contradictory requirements.

**Q: What happens when data is missing?**
A: Three-valued logic means "unknown" is a first-class outcome. Instead of guessing, we tell the citizen exactly which document to upload. The system lists required documents and maps them to the missing fields.

**Q: How accurate is the rule extraction?**
A: We use a dual engine — regex catches structured patterns with near-100% accuracy, LLM handles nuanced language. Each extracted rule carries a confidence score. The deterministic engine only evaluates what was extracted — it never invents rules.

**Q: Can this work with any policy document?**
A: Yes. Upload any government scheme PDF — the dual extraction engine (regex + LLM) processes it. We also have 2,100+ pre-loaded schemes from open datasets for instant access.
