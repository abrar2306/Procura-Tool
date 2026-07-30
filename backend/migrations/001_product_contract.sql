-- Upgrade the initial MVP schema to the current Procura product contract.
-- Safe to apply once to a populated Supabase database.  Run this migration
-- before deploying the API that uses lowercase statuses and revisioned docs.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

ALTER TABLE procurement_requests
    ADD COLUMN IF NOT EXISTS procurement_type TEXT,
    ADD COLUMN IF NOT EXISTS review_category TEXT,
    ADD COLUMN IF NOT EXISTS form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS analysis JSONB,
    ADD COLUMN IF NOT EXISTS analysis_error TEXT;

-- New APIs use the UI's lower-case states.  Preserve every prior state while
-- mapping the legacy FAILED value to the client-visible error state.
UPDATE procurement_requests
SET status = CASE status
    WHEN 'FAILED' THEN 'error'
    WHEN 'DRAFT' THEN 'draft'
    WHEN 'UPLOADED' THEN 'uploaded'
    WHEN 'EXTRACTING' THEN 'extracting'
    WHEN 'REVIEW_REQUIRED' THEN 'review_required'
    WHEN 'READY_FOR_ANALYSIS' THEN 'ready_for_analysis'
    WHEN 'ANALYZING' THEN 'analyzing'
    WHEN 'ANALYZED' THEN 'analyzed'
    ELSE LOWER(status)
END;

UPDATE procurement_requests
SET procurement_type = CASE
    WHEN category = 'HARDWARE' THEN 'hardware'
    ELSE 'software'
END
WHERE procurement_type IS NULL;

ALTER TABLE procurement_requests
    ALTER COLUMN procurement_type SET DEFAULT 'software',
    ALTER COLUMN procurement_type SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'procurement_requests_status_check'
    ) THEN
        ALTER TABLE procurement_requests
            ADD CONSTRAINT procurement_requests_status_check CHECK (status IN (
                'draft', 'uploaded', 'extracting', 'review_required',
                'ready_for_analysis', 'analyzing', 'analyzed', 'error'
            ));
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'procurement_requests_procurement_type_check'
    ) THEN
        ALTER TABLE procurement_requests
            ADD CONSTRAINT procurement_requests_procurement_type_check
            CHECK (procurement_type IN ('software', 'hardware'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS procurement_requests_org_created_idx
    ON procurement_requests (organization_id, created_at DESC);

ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
    ADD COLUMN IF NOT EXISTS document_version SMALLINT NOT NULL DEFAULT 1;
ALTER TABLE extracted_items
    ADD COLUMN IF NOT EXISTS document_version SMALLINT NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS documents_request_version_idx
    ON documents (request_id, document_version, created_at);
CREATE INDEX IF NOT EXISTS extracted_items_request_version_idx
    ON extracted_items (request_id, document_version);

-- Keep pricing source records tenant-scoped while preserving the original
-- category tables that the matching service already queries.
ALTER TABLE software_pricing
    ADD COLUMN IF NOT EXISTS organization_id TEXT NOT NULL DEFAULT 'default-org',
    ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'catalog';
ALTER TABLE hardware_pricing
    ADD COLUMN IF NOT EXISTS organization_id TEXT NOT NULL DEFAULT 'default-org',
    ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'catalog';
ALTER TABLE resource_pricing
    ADD COLUMN IF NOT EXISTS organization_id TEXT NOT NULL DEFAULT 'default-org',
    ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'catalog';

-- An index (rather than a new table) supports catalog list/delete for the
-- software and hardware tabs without changing the matching model.
CREATE INDEX IF NOT EXISTS software_pricing_org_name_idx
    ON software_pricing (organization_id, canonical_name);
CREATE INDEX IF NOT EXISTS hardware_pricing_org_name_idx
    ON hardware_pricing (organization_id, canonical_name);
CREATE INDEX IF NOT EXISTS resource_pricing_org_name_idx
    ON resource_pricing (organization_id, canonical_name);

CREATE TABLE IF NOT EXISTS resource_rate_benchmarks (
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

CREATE TABLE IF NOT EXISTS organization_settings (
    organization_id TEXT PRIMARY KEY,
    vendor_multiplier NUMERIC NOT NULL DEFAULT 1.55 CHECK (vendor_multiplier > 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO organization_settings (organization_id)
VALUES ('default-org')
ON CONFLICT (organization_id) DO NOTHING;

ALTER TABLE benchmark_matches
    ADD COLUMN IF NOT EXISTS analysis_run_id UUID NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE score_results
    ADD COLUMN IF NOT EXISTS analysis_run_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    ADD COLUMN IF NOT EXISTS analysis_payload JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES procurement_requests(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
    content TEXT NOT NULL,
    model TEXT,
    context JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS chat_messages_request_created_idx
    ON chat_messages (request_id, created_at);

CREATE TABLE IF NOT EXISTS proposal_comparisons (
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

DROP TRIGGER IF EXISTS procurement_requests_set_updated_at ON procurement_requests;
CREATE TRIGGER procurement_requests_set_updated_at
    BEFORE UPDATE ON procurement_requests
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS resource_rate_benchmarks_set_updated_at ON resource_rate_benchmarks;
CREATE TRIGGER resource_rate_benchmarks_set_updated_at
    BEFORE UPDATE ON resource_rate_benchmarks
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS organization_settings_set_updated_at ON organization_settings;
CREATE TRIGGER organization_settings_set_updated_at
    BEFORE UPDATE ON organization_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE resource_rate_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_comparisons ENABLE ROW LEVEL SECURITY;
