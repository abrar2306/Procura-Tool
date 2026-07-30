-- Procura database schema (fresh Supabase installations)
--
-- Apply this file once to a new project.  Existing projects must apply the
-- incremental migrations in this directory instead, beginning with
-- 001_product_contract.sql.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- A request is the durable unit shown as a "review" in the web application.
CREATE TABLE procurement_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    title TEXT NOT NULL,
    -- Matching category used by the deterministic matching/scoring engine.
    category TEXT NOT NULL CHECK (category IN ('SOFTWARE', 'HARDWARE', 'RESOURCE')),
    -- UI workflow selection and category; retain these independently from the
    -- matching category above (for example software/services maps to RESOURCE).
    procurement_type TEXT NOT NULL DEFAULT 'software'
        CHECK (procurement_type IN ('software', 'hardware')),
    review_category TEXT,
    supplier_name TEXT,
    currency TEXT CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
    quoted_total NUMERIC CHECK (quoted_total IS NULL OR quoted_total >= 0),
    form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Latest complete report, optimised for the detail screen.  score_results
    -- retains each scored run as the immutable history.
    analysis JSONB,
    analysis_error TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft', 'uploaded', 'extracting', 'review_required',
        'ready_for_analysis', 'analyzing', 'analyzed', 'error'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX procurement_requests_org_created_idx
    ON procurement_requests (organization_id, created_at DESC);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES procurement_requests(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    mime_type TEXT,
    file_size_bytes BIGINT CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
    storage_bucket TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    checksum TEXT,
    processing_status TEXT NOT NULL DEFAULT 'uploaded',
    -- Version 1 is the original proposal; 2+ are revised vendor proposals.
    document_version SMALLINT NOT NULL DEFAULT 1 CHECK (document_version >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (storage_bucket, storage_path)
);
CREATE INDEX documents_request_version_idx ON documents (request_id, document_version, created_at);

CREATE TABLE extracted_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES procurement_requests(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    document_version SMALLINT NOT NULL DEFAULT 1 CHECK (document_version >= 1),
    category TEXT NOT NULL CHECK (category IN ('SOFTWARE', 'HARDWARE', 'RESOURCE')),
    raw_description TEXT,
    normalized_description TEXT,
    manufacturer TEXT,
    product_name TEXT,
    sku TEXT,
    role_name TEXT,
    skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    experience_years NUMERIC CHECK (experience_years IS NULL OR experience_years >= 0),
    location TEXT,
    quantity NUMERIC CHECK (quantity IS NULL OR quantity >= 0),
    billing_unit TEXT,
    unit_price NUMERIC CHECK (unit_price IS NULL OR unit_price >= 0),
    duration NUMERIC CHECK (duration IS NULL OR duration >= 0),
    line_total NUMERIC CHECK (line_total IS NULL OR line_total >= 0),
    currency TEXT CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    extraction_confidence NUMERIC,
    classification_confidence NUMERIC,
    source_evidence JSONB,
    user_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX extracted_items_request_version_idx ON extracted_items (request_id, document_version);

-- Historical catalog records.  The three existing tables are deliberately
-- retained because the matching service selects one by procurement category.
CREATE TABLE software_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id TEXT NOT NULL DEFAULT 'default-org',
    canonical_name TEXT NOT NULL,
    aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    unit TEXT,
    benchmark_low NUMERIC NOT NULL,
    benchmark_median NUMERIC NOT NULL,
    benchmark_high NUMERIC NOT NULL,
    region TEXT NOT NULL DEFAULT 'Global',
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    source_name TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'catalog' CHECK (source_type IN ('seed', 'catalog', 'custom')),
    confidence NUMERIC,
    volume_tiers JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_software_range CHECK (benchmark_low <= benchmark_median AND benchmark_median <= benchmark_high),
    CONSTRAINT software_pricing_identity UNIQUE (organization_id, canonical_name, currency, region)
);

CREATE TABLE hardware_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id TEXT NOT NULL DEFAULT 'default-org',
    canonical_name TEXT NOT NULL,
    aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    unit TEXT,
    benchmark_low NUMERIC NOT NULL,
    benchmark_median NUMERIC NOT NULL,
    benchmark_high NUMERIC NOT NULL,
    region TEXT NOT NULL DEFAULT 'Global',
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    source_name TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'catalog' CHECK (source_type IN ('seed', 'catalog', 'custom')),
    confidence NUMERIC,
    volume_tiers JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_hardware_range CHECK (benchmark_low <= benchmark_median AND benchmark_median <= benchmark_high),
    CONSTRAINT hardware_pricing_identity UNIQUE (organization_id, canonical_name, currency, region)
);

CREATE TABLE resource_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id TEXT NOT NULL DEFAULT 'default-org',
    canonical_name TEXT NOT NULL,
    aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
    attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    unit TEXT,
    benchmark_low NUMERIC NOT NULL,
    benchmark_median NUMERIC NOT NULL,
    benchmark_high NUMERIC NOT NULL,
    region TEXT NOT NULL DEFAULT 'Global',
    effective_from TIMESTAMPTZ,
    effective_to TIMESTAMPTZ,
    source_name TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'catalog' CHECK (source_type IN ('seed', 'catalog', 'custom')),
    confidence NUMERIC,
    volume_tiers JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_resource_range CHECK (benchmark_low <= benchmark_median AND benchmark_median <= benchmark_high),
    CONSTRAINT resource_pricing_identity UNIQUE (organization_id, canonical_name, currency, region)
);
CREATE INDEX resource_pricing_org_name_idx ON resource_pricing (organization_id, canonical_name);

-- Editable resource-rate grid and its per-organisation margin factor.
CREATE TABLE resource_rate_benchmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id TEXT NOT NULL,
    role TEXT NOT NULL,
    junior NUMERIC CHECK (junior IS NULL OR junior >= 0),
    mid NUMERIC CHECK (mid IS NULL OR mid >= 0),
    senior NUMERIC CHECK (senior IS NULL OR senior >= 0),
    currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$'),
    notes TEXT,
    source TEXT NOT NULL DEFAULT 'custom',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT resource_rate_role_identity UNIQUE (organization_id, role)
);

CREATE TABLE organization_settings (
    organization_id TEXT PRIMARY KEY,
    vendor_multiplier NUMERIC NOT NULL DEFAULT 1.55 CHECK (vendor_multiplier > 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE benchmark_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES extracted_items(id) ON DELETE CASCADE,
    analysis_run_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    match_status TEXT NOT NULL,
    match_method TEXT NOT NULL,
    match_confidence NUMERIC,
    benchmark_record_id UUID,
    benchmark_low NUMERIC,
    benchmark_median NUMERIC,
    benchmark_high NUMERIC,
    currency TEXT,
    unit TEXT,
    applied_discount NUMERIC NOT NULL DEFAULT 0.0,
    differences JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX benchmark_matches_item_created_idx ON benchmark_matches (item_id, created_at DESC);

CREATE TABLE score_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES procurement_requests(id) ON DELETE CASCADE,
    analysis_run_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    overall_score NUMERIC,
    recommendation TEXT NOT NULL,
    score_version TEXT NOT NULL,
    summary TEXT,
    score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    analysis_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX score_results_request_created_idx ON score_results (request_id, created_at DESC);

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES procurement_requests(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
    content TEXT NOT NULL,
    model TEXT,
    context JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX chat_messages_request_created_idx ON chat_messages (request_id, created_at);

CREATE TABLE proposal_comparisons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES procurement_requests(id) ON DELETE CASCADE,
    base_document_version SMALLINT NOT NULL DEFAULT 1 CHECK (base_document_version >= 1),
    comparison_document_version SMALLINT NOT NULL CHECK (comparison_document_version > base_document_version),
    comparison JSONB NOT NULL,
    model TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT proposal_comparison_version_identity
        UNIQUE (request_id, base_document_version, comparison_document_version)
);

CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES procurement_requests(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER procurement_requests_set_updated_at
    BEFORE UPDATE ON procurement_requests
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER resource_rate_benchmarks_set_updated_at
    BEFORE UPDATE ON resource_rate_benchmarks
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER organization_settings_set_updated_at
    BEFORE UPDATE ON organization_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- The API uses the Supabase service-role key.  RLS remains enabled to protect
-- against accidental use of an anon key; configure explicit user policies when
-- replacing the service-role backend with end-user Supabase access.
ALTER TABLE procurement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE software_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE hardware_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_rate_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
