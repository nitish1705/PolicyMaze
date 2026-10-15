# BYTE02 — Explainable Policy Interpretation & Eligibility Decision Support

## Complete Research Report

**Byteathon 2026 Grand Finale | 24-Hour Hackathon | 15–16 Oct 2026**

---

## Table of Contents

1. [Problem Statement Recap](#1-problem-statement-recap)
2. [Existing Commercial Products & Startups](#2-existing-commercial-products--startups)
3. [Government Portals & Their Limitations](#3-government-portals--their-limitations)
4. [Open-Source Projects & Hackathon References](#4-open-source-projects--hackathon-references)
5. [Legal AI & Adjacent Tools](#5-legal-ai--adjacent-tools)
6. [Rules-as-Code Movement & Academic Approaches](#6-rules-as-code-movement--academic-approaches)
7. [The Gap Analysis — What No One Does](#7-the-gap-analysis--what-no-one-does)
8. [Recommended Tech Stack](#8-recommended-tech-stack)
9. [Libraries & Frameworks Deep Dive](#9-libraries--frameworks-deep-dive)
10. [n8n Integration Patterns](#10-n8n-integration-patterns)
11. [Indian Government Scheme Data Sources](#11-indian-government-scheme-data-sources)
12. [Architecture & What We're Building](#12-architecture--what-were-building)
13. [Key Differentiators — Our Winning Story](#13-key-differentiators--our-winning-story)
14. [Demo Strategy](#14-demo-strategy)

---

## 1. Problem Statement Recap

**Codename:** The Policy Maze
**Domain:** Law, Governance & Public Services

**Problem:** Government schemes, institutional regulations, and public benefit programs frequently contain overlapping eligibility requirements, exceptions, conflicting documents, and amendments. Determining whether an individual qualifies for a particular benefit is complicated, time-consuming, and prone to error.

**Challenge:** Develop an intelligent platform capable of interpreting policy documents, extracting requirements, resolving applicable exceptions, and evaluating eligibility based on supporting information. The platform must provide traceable explanations for every decision, handle incomplete documentation, and recognize policy changes without relying on unsupported assumptions.

**Optional n8n Integration:** Document ingestion, approval routing, amendment notifications, and application status workflows.

---

## 2. Existing Commercial Products & Startups

### 2.1 India-Specific

#### MyScheme (myscheme.gov.in) — Government of India
- National platform consolidating central + state government schemes
- Users enter demographics (age, gender, income, category), system filters matching schemes
- 4,680+ schemes cataloged
- **Strengths:** Broad coverage of schemes, simple UI, official government backing
- **Weaknesses:**
  - Purely keyword/demographic filtering — NO document interpretation
  - NO rule extraction from policy text
  - NO explainability ("you qualify because Section 3.2 says…")
  - NO handling of conflicting or amended policies
  - It's a static database, not an intelligent reasoning engine

#### Haqdarshak (haqdarshak.com) — Indian Startup
- $2.2B in benefits unlocked to date
- ML engine mapping 5,000+ government schemes across 30+ states
- Multilingual (14+ languages), voice + text, operates via mobile app + field agents
- **Strengths:** Scale, multilingual access, agent-assisted model for low-literacy populations
- **Weaknesses:**
  - Proprietary ML engine — no explainability or reasoning trace
  - Users get a match, not an explanation of *why* they match
  - No document-level policy interpretation
  - No conflict resolution between policies

#### Jugalbandi (OpenNyAI/Jugalbandi-Manager) — AI4Bharat / Microsoft Initiative
- Multilingual conversational chatbot for government scheme access
- Uses Bhashini speech models for Indian languages, RAG for document retrieval
- WhatsApp and web interfaces
- **Strengths:** Multilingual voice/text access, RAG-based retrieval from policy documents
- **Weaknesses:**
  - Conversational Q&A over documents — not structured rule extraction
  - No traceable decision chain
  - No eligibility engine with deterministic rule matching

### 2.2 International

#### PolicyEngine (policyengine.org) — US/UK
- Open-source tax-benefit microsimulation model (167 stars on GitHub)
- Rules-as-code: every US federal + state tax/benefit rule modeled in Python
- Can simulate policy reforms at population scale
- **Strengths:** Rigorous, deterministic, open-source, research-grade
- **Weaknesses:**
  - Rules are manually coded by developers — no AI extraction from documents
  - US/UK only
  - Requires deep policy knowledge to add new rules
  - Not designed for real-time user-facing eligibility checking from raw PDFs

#### OpenFisca (openfisca.org) — France, Spain, Japan, and Others
- Open-source rules-as-code engine (244 stars on GitHub)
- Models tax/benefit rules as Python code organized in "country packages"
- REST API + Python API for calculations
- Used in production: Barcelona's "Les meves ajudes," Japan's "Support Estimate Hermit Crab," France's LexImpact
- Awards: UN Digital Public Good, EU Most Innovative Open-Source Software
- **Strengths:** Best-in-class rules-as-code framework. Transparent, tested, versioned rules. API-first.
- **Weaknesses:**
  - Same as PolicyEngine — rules must be manually coded by developers who read the policy documents
  - No NLP/AI layer to extract rules from unstructured text
  - Adding a new country or scheme is weeks of developer work

#### Benefits.gov / USA.gov Benefit Finder — US Government
- Category-based benefit discovery (select life situations, see matching programs)
- **Strengths:** Simple, accessible
- **Weaknesses:** No AI, no document analysis, no explainability. Simple checkbox filter.

#### GSA BEARS / px-benefit-finder (USA)
- US government benefits finder by life experience (death, disability, retirement)
- Built with Vue.js + Nuxt
- Now archived
- **Weaknesses:** Rule-based, no AI, no document parsing. Criteria are manually coded.

---

## 3. Government Portals & Their Limitations

| Portal | Country | Approach | Strengths | Gaps |
|---|---|---|---|---|
| **MyScheme** | India | Demographic filtering | Wide coverage, official | No reasoning, no explainability, static rules |
| **USA.gov Benefit Finder** | US | Category checkboxes | Simple, accessible | No AI, no document analysis |
| **OpenFisca deployments** | France/Spain/Japan | Rules-as-code | Transparent, testable | Manual coding, no NLP |
| **PolicyEngine** | US/UK | Microsimulation | Research-grade accuracy | Developer-only rule authoring |
| **Haqdarshak** | India | ML matching | Scale, multilingual | Black box, no explainability |

**The universal gap across ALL portals:** No existing government portal or product does ALL of:
1. Parse raw policy documents (PDFs)
2. Extract structured rules automatically using AI
3. Evaluate eligibility deterministically
4. Provide traceable explanations citing source text
5. Handle policy conflicts and amendments

---

## 4. Open-Source Projects & Hackathon References

### 4.1 Directly Relevant Projects

#### SchemeAI / sih-scheme-matcher (Smart India Hackathon 2026)
- **Stack:** React + FastAPI + Sentence-BERT + myScheme API
- **What they did:** Hybrid rule + semantic matching over 1,000+ schemes. Dual engine: rule-based hard filtering (0.6 weight) + sentence-BERT cosine similarity (0.4 weight). 10-language support, voice I/O, auto-syncs from myScheme.gov.in every 6 hours.
- **What you can learn:** Their hybrid scoring formula and live data sync from myScheme.gov.in are directly reusable ideas.
- **Gap you fill:** NO explainability — no reasoning trace showing *why* a user qualifies or doesn't.

#### SAHAYAK (GitHub: Shashankpr17)
- **Stack:** React + FastAPI + SQLite
- **What they did:** Profile questionnaire → rule-based matching → per-criterion pass/fail. Multi-language (English, Hindi, Odia).
- **What you can learn:** Good UI pattern for showing per-criterion pass/fail status. Clean approach.
- **Gap you fill:** No AI, no document parsing. Rules are hardcoded.

#### gov-scheme-checker (GitHub: premsahu8960)
- **Stack:** React 19 + Supabase + OpenAI + Zod
- **What they did:** JSON rule engine + ChatGPT RAG chatbot. Hybrid: local retrieval first, then LLM. PDF report generation. WCAG accessible.
- **What you can learn:** Their JSON rule engine + RAG chatbot pattern is exactly what BYTE02 needs. Zod schema validation for structured rule extraction is a great pattern.
- **Gap you fill:** No document parsing — rules are still hardcoded. No source traceability.

#### Tender-Sahayak
- **Stack:** React + Node/Express + Tesseract OCR
- **What they did:** Extracts eligibility criteria from tender PDFs → evaluates bidder submissions → Pass/Fail/Review with explanations.
- **What you can learn:** Closest architecture to BYTE02 — document in, structured criteria out, evaluation with explanations. Different domain (tenders vs. policy) but same architectural pattern.
- **Gap you fill:** Different domain. You're applying this to government policy — more complex, overlapping rules.

#### Refund Eligibility Agent (Wayfair)
- **Stack:** Next.js + Vercel AI SDK + Qwen3.6
- **What they did:** Single-prompt agent that evaluates refund requests against return policy. Outputs: APPROVED/DENIED/ESCALATE + confidence score + reasoning trail + draft response.
- **What you can learn:** Best explainability reference. Their structured JSON output format (decision + confidence + reasoning steps + cited policy clause) is exactly the output schema to emulate.
- **Gap you fill:** Single-policy, single-domain. You're handling multiple overlapping policies with conflicts.

#### AI Document Approval Workflow (n8n + LangChain)
- **Stack:** Python + LangChain + Pydantic + n8n
- **What they did:** Webhook → LLM extracts structured data → business rules validate → auto-approve or route to human. Uses Pydantic for typed extraction schemas.
- **What you can learn:** Best n8n integration reference. Their webhook → extraction → rules → routing pattern maps directly to BYTE02's n8n requirement.

#### PAKGOV-RAG-project
- **Stars:** 31
- **What they did:** Bilingual Urdu-English RAG for Pakistani government and legal documents with OCR, hybrid retrieval, and citation grounding.
- **What you can learn:** Architecturally the closest to BYTE02's concept.
- **Gap you fill:** No structured rule extraction, no deterministic eligibility evaluation.

### 4.2 Rules Engines (Architecture References)

| Project | Stars | Language | What It Does |
|---|---|---|---|
| **json-rules-engine** | 3.1k | JavaScript | JSON-based business rules processor — define conditions + actions in JSON, evaluate dynamically |
| **Microsoft/RulesEngine** | 4.4k | C# | .NET rules engine with lambda expressions, JSON rule definitions, workflow-based evaluation |
| **j-easy/easy-rules** | 5.3k | Java | Lightweight Java rules engine — fire rules against facts, supports MVEL/SpEL expressions |
| **GoPlasmatic/datalogic-rs** | 92 | Rust | Fast JSONLogic rules engine with multi-language bindings |

**Key insight:** These are execution engines — they evaluate rules, but don't extract them from text. Our project's differentiator is the AI-powered rule extraction FEEDING INTO a deterministic rules engine.

### 4.3 Legal NLP & Document Understanding

| Project | Stars | What It Does |
|---|---|---|
| **OpenNyAI/Opennyai** | 103 | NLP pipeline for Indian legal documents — NER, document structuring |
| **Atticus/CUAD** | 570 | Contract Understanding dataset + BERT-based contract clause extraction |
| **deepdoctection** | 3.3k | Document AI toolkit — OCR, layout analysis, table detection |
| **Liquid-Legal-Institute/Legal-Text-Analytics** | — | Curated list of legal NLP resources, datasets, and tools |

---

## 5. Legal AI & Adjacent Tools

### Commercial Legal AI
- **Thomson Reuters CoCounsel** — GPT-4 for legal research, document review, contract analysis. Enterprise-grade but focused on lawyers, not citizen eligibility.
- **Casetext** (now part of Thomson Reuters) — Legal research AI. Not focused on policy/benefits.
- **Harvey AI** — Legal AI for law firms. Contract analysis, due diligence.

### Indian Legal AI
- **LitigatAI** (GitHub) — Indian legal practice workbench with case law research via Indian Kanoon, judgment summarization, OCR translation. Streamlit + Gemini + OpenAI. Relevant architecture patterns but focused on litigation, not policy eligibility.
- **Indian Kanoon** — Legal search engine for Indian court judgments. Good for case law but not policy documents.

---

## 6. Rules-as-Code Movement & Academic Approaches

### Rules-as-Code Movement
- OECD has endorsed "Rules as Code" as enabling "better policy outcomes and enhanced service delivery"
- New Zealand, France, and Australia have government programs converting legislation to executable code
- The limitation: it's manual, expensive, and requires developer-lawyer collaboration
- Takes weeks to add a single new scheme

### Academic Findings

#### LLMs for Legal Understanding
- Research (Chalkidis 2023) shows GPT-3.5 achieved only **47.6% avg micro-F1** on LexGLUE legal NLP benchmark
- LLMs alone are NOT reliable enough for deterministic legal reasoning
- **Critical finding:** A hybrid approach is needed — use LLMs for extraction/understanding, but a deterministic engine for evaluation

#### Key Techniques
- **Structured extraction with LLMs:** Use Claude/GPT to extract IF-THEN rules from policy text into JSON, then evaluate deterministically
- **RAG with citation grounding:** Retrieve relevant policy sections, generate answers with exact source citations
- **Legal NER:** Named entity recognition for extracting entities like ages, income thresholds, categories from policy text (OpenNyAI's pipeline)
- **Neurosymbolic AI:** LLM extracts rules (neural), symbolic engine evaluates them. This avoids hallucination risk while leveraging LLM comprehension.

#### The Neurosymbolic Pattern (Our Approach)
```
PDF Document → LLM reads & extracts → Structured JSON Rules → Deterministic Engine Evaluates → Each Verdict Maps to Source Text
```

This is the academically supported best practice. Pure LLM = hallucination risk. Pure rules-as-code = requires manual coding. The hybrid is the sweet spot.

---

## 7. The Gap Analysis — What No One Does

```
                       AI Rule      Deterministic    Source-Traced    Handles      Handles
                       Extraction   Evaluation       Explanation      Conflicts    Amendments
MyScheme                  x            x                x               x             x
Haqdarshak                x            ~                x               x             x
OpenFisca                 x           YES               ~               x             x
Jugalbandi                x            x                x               x             x
SchemeAI (SIH)            x            ~                x               x             x
gov-scheme-checker        x           YES               x               x             x
Tender-Sahayak           YES          YES               ~               x             x
─────────────────────────────────────────────────────────────────────────────────────────
OUR PROJECT              YES          YES              YES             YES           YES
```

**Our unique value proposition:**
1. No one does AI-powered rule extraction from raw policy PDFs into structured rules
2. No one combines extraction + deterministic evaluation + explainability in one pipeline
3. No Indian solution handles policy conflicts, amendments, or incomplete documents intelligently
4. The hybrid approach (LLM extraction → JSON rules → deterministic engine → traced verdict) is a novel architecture not implemented in any existing product

---

## 8. Recommended Tech Stack

| Layer | Tool | Why |
|---|---|---|
| **PDF Parsing** | PyMuPDF + PyMuPDF4LLM | 10-50x faster than alternatives, outputs LLM-ready Markdown with tables |
| **RAG / Orchestration** | LangChain | Better than LlamaIndex for multi-step pipelines (extract → evaluate → explain) |
| **Vector DB** | ChromaDB | 4-function API, zero-config local setup, perfect for hackathon |
| **LLM** | Claude API or OpenAI | For rule extraction + reasoning |
| **Rule Engine** | Custom JSON engine (~50 lines Python) | Judges can see exactly how it works, fully transparent |
| **Backend** | Python + FastAPI | Fast, clean, auto-generates API docs at /docs |
| **Frontend** | React + Tailwind CSS | Clean UI, reasoning trace viewer |
| **Database** | SQLite | Zero setup, stores rules + profiles + decisions |
| **Automation** | n8n | Document ingestion triggers, amendment alerts, approval routing |

---

## 9. Libraries & Frameworks Deep Dive

### 9.1 PDF Parsing (Python)

| Library | Best For | Key Strength |
|---|---|---|
| **PyMuPDF** (v1.28.2) | Government PDFs | 10–50x faster than pure-Python libs. `find_tables()` exports to Markdown/Pandas. Has `PyMuPDF4LLM` extension for LLM-ready chunked output. Fully local, no data leaves machine. |
| **pdfplumber** (v0.11.10) | Table-heavy PDFs | Superior table extraction with 20+ tuning knobs. Visual debugging in Jupyter. MIT license. |
| **Unstructured** | Multi-format ingestion | Handles PDF, DOCX, HTML, etc. with a single API. Popular in RAG pipelines. |

**Our choice: PyMuPDF + PyMuPDF4LLM** — fastest, outputs LLM-ready Markdown. One-liner install: `pip install pymupdf4llm`

### 9.2 RAG Frameworks

| Framework | Stars | Why Consider |
|---|---|---|
| **LlamaIndex** | 52.5k | Purpose-built for document Q&A. Best for simple "ask questions about documents." |
| **LangChain** | 147.8k | More general, better for chaining operations — extraction → rule building → evaluation → explanation. Has LangSmith for tracing/debugging. |
| **ChromaDB** | 29.5k | Vector store. 4-function API (`create, add, query, get`). Zero-config local setup. |

**Our choice: LangChain + ChromaDB** — LangChain gives control over the full pipeline, ChromaDB for vector storage.

### 9.3 Rule Engine

**Our choice: Custom JSON rule engine in Python (~50 lines)**

Most hackathon projects roll their own — define rules as JSON objects and evaluate with simple Python logic:

```json
{
  "field": "age",
  "operator": ">=",
  "value": 18,
  "source_section": "Section 3.2",
  "source_text": "The applicant must be at least 18 years of age"
}
```

Fastest to build, easiest to demo, fully transparent to judges. The `gov-scheme-checker` project by premsahu8960 uses exactly this approach with Zod schema validation.

### 9.4 Explainability

No standalone library needed. The pattern is:
1. LLM extracts rules with source citations (section numbers, page references)
2. Rule engine evaluates each rule and records pass/fail + the source
3. Frontend renders this as a traceable reasoning chain

The Refund Eligibility Agent (Wayfair) project demonstrates this: step-by-step policy evaluation → confidence score → color-coded decision cards.

---

## 10. n8n Integration Patterns

### Workflow 1: Document Ingestion Trigger
```
Webhook (new PDF uploaded) → Extract text (PyMuPDF) → LLM rule extraction → Store rules in DB → Notify admin
```

### Workflow 2: Amendment Alert
```
Scheduled trigger (daily/weekly) → Fetch latest policy version → Compare with stored version → If eligibility criteria changed → Send notification (email/Slack/Telegram)
```

### Workflow 3: Application Status
```
User submits profile → Eligibility evaluated → If eligible → Route to approval queue → Notify user of status changes at each step
```

### Workflow 4: Conflict Escalation
```
Eligibility engine detects conflicting policies → Route to human reviewer via Telegram/email with full context → Reviewer decides → Notify user
```

**Reference project:** The `ai-automation-workflow` (kalecaner) project has a reusable n8n workflow JSON (`workflows/invoice-approval.json`) — same pattern (webhook → LLM extraction → rules → route) adapted to policy documents.

---

## 11. Indian Government Scheme Data Sources

| Source | What's Available | How to Use |
|---|---|---|
| **myScheme.gov.in** | Official portal, 4,680+ schemes | Has a usable API (SchemeAI project proves it with `/api/schemes/sync-live` pattern) |
| **india-govschemes-pipeline** (GitHub) | Pre-scraped dataset of 4,680 schemes as Excel | Download `.xlsx` — use as seed data for scheme metadata |
| **PM Kisan (pmkisan.gov.in)** | Official guidelines PDF | Download — complex eligibility with income/land criteria, good for demo |
| **NSP (scholarships.gov.in)** | National Scholarship Portal, multiple scheme PDFs | Download — overlapping eligibility across scholarships, perfect test data |
| **Ayushman Bharat (pmjay.gov.in)** | Health insurance scheme guidelines | Download — SECC-based criteria, good for demonstrating complex eligibility |
| **PM Awas Yojana** | Housing scheme guidelines | Download — income slabs, category-based eligibility |

**For the demo:** Use 2-3 real scheme PDFs. Indian government schemes are public, complex, have overlapping eligibility and amendments — perfect for showcasing every feature.

---

## 12. Architecture & What We're Building

### System Architecture

```
┌──────────────────────────────────────────────────────┐
│                    FRONTEND (React + Tailwind)         │
│                                                       │
│  Upload Policy PDFs  │  User Profile Form             │
│  Extracted Rules View │  Eligibility Results           │
│  Reasoning Trace Viewer │  Policy Diff Viewer          │
│  Multi-Scheme Comparison │  n8n Dashboard Link         │
└──────────────────┬────────────────────────────────────┘
                   │ REST API
┌──────────────────▼────────────────────────────────────┐
│              BACKEND (Python + FastAPI)                │
│                                                       │
│  ┌─────────────────────────────────────────────┐      │
│  │ 1. DOCUMENT INGESTION & PARSING             │      │
│  │    - PyMuPDF4LLM extracts text from PDF     │      │
│  │    - Chunks text into sections              │      │
│  │    - Embeds chunks into ChromaDB            │      │
│  └─────────────────────┬───────────────────────┘      │
│                        │                              │
│  ┌─────────────────────▼───────────────────────┐      │
│  │ 2. RULE EXTRACTION ENGINE                   │      │
│  │    - LLM reads chunks, extracts structured  │      │
│  │      rules as JSON                          │      │
│  │    - Each rule: field, operator, value,     │      │
│  │      source_section, source_text            │      │
│  │    - Stores in SQLite                       │      │
│  └─────────────────────┬───────────────────────┘      │
│                        │                              │
│  ┌─────────────────────▼───────────────────────┐      │
│  │ 3. ELIGIBILITY ENGINE                       │      │
│  │    - Matches user profile against rules     │      │
│  │    - Handles exceptions & conflicting rules │      │
│  │    - Handles incomplete user data           │      │
│  │    - Produces verdict + reasoning chain     │      │
│  └─────────────────────┬───────────────────────┘      │
│                        │                              │
│  ┌─────────────────────▼───────────────────────┐      │
│  │ 4. EXPLAINABILITY LAYER                     │      │
│  │    - Each decision → source doc citation    │      │
│  │    - "You qualify because [Section 3.2]..." │      │
│  │    - Conflict flagging with both interps    │      │
│  └─────────────────────┬───────────────────────┘      │
│                        │                              │
│  ┌─────────────────────▼───────────────────────┐      │
│  │ 5. POLICY CHANGE DETECTION                  │      │
│  │    - Diff two versions of a policy          │      │
│  │    - Highlight eligibility criteria changes  │      │
│  └─────────────────────────────────────────────┘      │
└──────────┬───────────────────┬────────────────────────┘
           │                   │
     ┌─────▼─────┐      ┌─────▼──────┐
     │ ChromaDB  │      │    n8n     │
     │ (vectors) │      │ Workflows  │
     │           │      │            │
     │ SQLite    │      │ - Ingest   │
     │ (rules,   │      │ - Alerts   │
     │  profiles,│      │ - Routing  │
     │  verdicts)│      │ - Status   │
     └───────────┘      └────────────┘
```

### API Endpoints (FastAPI)

```
POST   /api/documents/upload         — Upload and parse a policy PDF
GET    /api/documents/{id}/rules     — Get extracted rules for a document
POST   /api/eligibility/check        — Check eligibility against a user profile
GET    /api/eligibility/{id}/trace   — Get reasoning trace for a decision
POST   /api/documents/diff           — Compare two policy versions
GET    /api/schemes                  — List all available schemes
POST   /api/profile                  — Save a user profile
GET    /api/conflicts/{scheme_id}    — Get detected policy conflicts
```

### Data Models

```
Document:
  - id, filename, upload_date, raw_text, version

Rule:
  - id, document_id, field, operator, value, source_section, source_page, source_text, is_exception

UserProfile:
  - id, name, age, gender, income, category, state, education, occupation, ...

EligibilityResult:
  - id, profile_id, scheme_id, verdict (ELIGIBLE/NOT_ELIGIBLE/PARTIAL/INSUFFICIENT_DATA)
  - reasoning_chain: [{rule_id, field, user_value, threshold, pass/fail, source_citation}]
  - conflicts: [{rule_a, rule_b, interpretation}]
  - missing_fields: [field_names]
```

---

## 13. Key Differentiators — Our Winning Story

### What makes us different from every existing solution:

1. **AI-Powered Rule Extraction from Raw PDFs**
   - No one else does this. OpenFisca requires weeks of manual coding. MyScheme uses static databases. We parse the actual PDF and extract rules automatically.

2. **Source Traceability**
   - Every eligibility verdict cites the exact section, page, and quoted text from the source document. No hallucination. The judge can verify every claim.

3. **Neurosymbolic Architecture**
   - LLM for understanding (neural) + Deterministic engine for evaluation (symbolic). This is the academically supported best practice — avoids hallucination while leveraging AI comprehension.

4. **Conflict Resolution**
   - When two policy documents disagree on eligibility criteria, we surface both interpretations and flag the conflict. Nobody else does this.

5. **Policy Amendment Detection**
   - Diff two versions of a document and show what changed in eligibility. Nobody else does this.

6. **Graceful Handling of Incomplete Data**
   - Instead of guessing or hallucinating, we explicitly say "we cannot determine this criterion" and tell the user what information is missing. The problem statement specifically requires this.

7. **n8n Workflow Automation**
   - Document ingestion, amendment alerts, approval routing, status notifications — full lifecycle automation.

### The Pitch (30 seconds)

> "Every existing solution either manually codes rules (taking weeks) or uses black-box AI (risking hallucination). We built a neurosymbolic platform that automatically reads policy documents, extracts verifiable rules, evaluates them deterministically, and traces every decision back to the source text. It's the first system where you can upload a policy PDF and get explainable eligibility decisions in minutes, not weeks."

---

## 14. Demo Strategy

### Demo Flow (3-5 minutes)

1. **Upload** a real Indian scholarship policy PDF (e.g., NSP Post-Matric Scholarship)
2. System shows **extracted rules** in a clean table — age, income, category, domicile, education level, etc.
3. **Show the source traceability** — click any rule to see the exact section and text from the PDF it was extracted from
4. **Fill in** a user profile (or use a pre-filled sample)
5. Hit **"Check Eligibility"**
6. Result screen shows:
   - ELIGIBLE / NOT ELIGIBLE / PARTIALLY ELIGIBLE
   - For each criterion: pass/fail with the exact policy text highlighted
   - Any conflicts or assumptions flagged clearly
   - Missing fields identified (if profile is incomplete)
7. **Upload a second scheme** — show multi-scheme comparison ("You qualify for 3 out of 5 schemes")
8. **Show policy diff** — upload v1 and v2 of the same policy, highlight what changed
9. **Show n8n dashboard** — document ingestion workflow, amendment alert workflow

### What Will Impress the Java Dev Judge

- **Structured rule extraction** — not "ask the LLM if I qualify." We extract rules into JSON, then run a deterministic engine. This shows engineering rigor.
- **Clean API design** — RESTful endpoints, proper separation of concerns. Show the auto-generated FastAPI docs at /docs.
- **Error handling** — incomplete documents, conflicting policies, missing user data. Handle it all gracefully.
- **Architecture diagram** — show the system design. Backend engineers appreciate good architecture.
- **The hybrid approach** — explain the neurosymbolic pattern. A Java dev will immediately understand why pure LLM is risky and why deterministic evaluation matters.

---

## Priority Build Order (24 Hours)

### Phase 1: Core (Hours 0-8)
- [ ] Project setup, FastAPI scaffold, SQLite schema
- [ ] PDF upload + PyMuPDF4LLM parsing
- [ ] LLM rule extraction → structured JSON
- [ ] Store rules in SQLite

### Phase 2: Engine (Hours 8-14)
- [ ] User profile form (React)
- [ ] Eligibility evaluation engine (deterministic)
- [ ] Reasoning trace generation
- [ ] Results display with source citations

### Phase 3: Advanced Features (Hours 14-20)
- [ ] Conflict detection between overlapping policies
- [ ] Incomplete data handling ("insufficient information" verdicts)
- [ ] Policy diff viewer (v1 vs v2)
- [ ] Multi-scheme comparison

### Phase 4: Polish & n8n (Hours 20-24)
- [ ] n8n workflows (document ingestion, amendment alerts, approval routing)
- [ ] UI polish, loading states, error handling
- [ ] Demo preparation, sample data
- [ ] Presentation slides
