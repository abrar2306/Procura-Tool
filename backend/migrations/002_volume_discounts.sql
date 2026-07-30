ALTER TABLE software_pricing ADD COLUMN IF NOT EXISTS volume_tiers JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE hardware_pricing ADD COLUMN IF NOT EXISTS volume_tiers JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE resource_pricing ADD COLUMN IF NOT EXISTS volume_tiers JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE benchmark_matches ADD COLUMN IF NOT EXISTS applied_discount NUMERIC NOT NULL DEFAULT 0.0;
