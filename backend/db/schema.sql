CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    scheme_name TEXT NOT NULL,
    version TEXT,
    raw_text TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    page_count INTEGER,
    upload_timestamp TEXT NOT NULL,
    extraction_confidence REAL
);

CREATE TABLE IF NOT EXISTS rules (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id),
    field TEXT NOT NULL,
    field_label TEXT,
    operator TEXT NOT NULL,
    value TEXT NOT NULL,
    value_type TEXT NOT NULL,
    is_mandatory INTEGER DEFAULT 1,
    is_exception INTEGER DEFAULT 0,
    exception_to TEXT,
    source_section TEXT,
    source_page INTEGER,
    source_text TEXT NOT NULL,
    confidence REAL DEFAULT 1.0,
    notes TEXT,
    amendment_reference TEXT,
    external_dependency TEXT
);

CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    profile_id TEXT REFERENCES profiles(id),
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evidence_records (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES sessions(id),
    rule_id TEXT REFERENCES rules(id),
    field TEXT,
    verdict TEXT NOT NULL,
    confidence TEXT NOT NULL,
    authority TEXT NOT NULL,
    user_value TEXT,
    source_document TEXT,
    source_page INTEGER,
    source_section TEXT,
    source_text TEXT,
    limitations TEXT,
    timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scheme_catalog (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    level TEXT,
    state TEXT,
    ministry TEXT,
    category TEXT,
    tags TEXT,
    description TEXT,
    eligibility_text TEXT,
    exclusions_text TEXT,
    benefits TEXT,
    documents_required TEXT,
    application_url TEXT,
    source_url TEXT,
    has_structured_rules INTEGER DEFAULT 0,
    document_id TEXT REFERENCES documents(id),
    source_repo TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS citizen_documents (
    id TEXT PRIMARY KEY,
    doc_type TEXT NOT NULL,
    filename TEXT NOT NULL,
    raw_text TEXT,
    extracted_fields TEXT NOT NULL DEFAULT '{}',
    upload_timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS evidence_bundles (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES sessions(id),
    scheme_id TEXT,
    profile_id TEXT REFERENCES profiles(id),
    overall_verdict TEXT NOT NULL,
    matched_criteria TEXT,
    disqualifying_criteria TEXT,
    missing_information TEXT,
    summary TEXT,
    conflicts TEXT,
    unknowns TEXT,
    timestamp TEXT NOT NULL
);
