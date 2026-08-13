-- Migration: Add tables for web crawl results and price caching
-- Created at: 2026-08-10

CREATE TABLE IF NOT EXISTS public.price_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key TEXT UNIQUE NOT NULL,
    oem_name TEXT,
    product_name TEXT,
    part_number TEXT,
    unit_price DECIMAL,
    sources JSONB,
    cached_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_price_cache_key ON public.price_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_price_cache_expires_at ON public.price_cache(expires_at);

CREATE TABLE IF NOT EXISTS public.web_crawl_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES public.procurement_requests(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.extracted_items(id) ON DELETE CASCADE,
    source_name TEXT,
    source_url TEXT,
    oem_name TEXT,
    product_name TEXT,
    part_number TEXT,
    quantity INT,
    unit_price DECIMAL,
    currency TEXT,
    match_type TEXT,
    crawled_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_web_crawl_results_request_id ON public.web_crawl_results(request_id);
CREATE INDEX IF NOT EXISTS idx_web_crawl_results_item_id ON public.web_crawl_results(item_id);
