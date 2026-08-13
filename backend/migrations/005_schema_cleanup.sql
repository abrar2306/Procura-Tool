-- 005_schema_cleanup.sql
-- 1. Add normalized_name to web_crawl_results
ALTER TABLE public.web_crawl_results 
ADD COLUMN IF NOT EXISTS normalized_name TEXT;

-- 2. Add normalized_name to price_cache
ALTER TABLE public.price_cache 
ADD COLUMN IF NOT EXISTS normalized_name TEXT;

-- 3. Drop legacy baseline / catalog tables
DROP TABLE IF EXISTS public.software_pricing CASCADE;
DROP TABLE IF EXISTS public.hardware_pricing CASCADE;
DROP TABLE IF EXISTS public.resource_pricing CASCADE;
DROP TABLE IF EXISTS public.resource_rate_benchmarks CASCADE;

-- 4. Enable RLS on new tables
ALTER TABLE public.price_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_crawl_results ENABLE ROW LEVEL SECURITY;
