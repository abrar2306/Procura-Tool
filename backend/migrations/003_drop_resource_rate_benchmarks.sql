-- Migration: Drop orphaned resource_rate_benchmarks table
-- This table was an early naming iteration before resource_pricing was standardized.
-- It has zero references in the application code.

DROP TRIGGER IF EXISTS resource_rate_benchmarks_set_updated_at ON resource_rate_benchmarks;
DROP TABLE IF EXISTS resource_rate_benchmarks CASCADE;
