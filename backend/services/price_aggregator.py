import os
import uuid
import logging
from typing import Any, Optional
from datetime import datetime, timezone, timedelta

from backend.models.extraction import ExtractedItem
from backend.services.hardware_price_crawler import search_hardware_pricing

logger = logging.getLogger(__name__)

def normalize_to_unit_price(total_price: float, quantity: int) -> float:
    """Always compare at unit-price level."""
    qty = quantity if quantity and quantity > 0 else 1
    return total_price / qty

def _get_cache_key(item: ExtractedItem) -> str:
    pn = item.sku or ""
    pn = pn.strip().lower()
    name = item.normalized_description or item.raw_description or ""
    name = name.strip().lower()
    return f"{pn}::{name}"

def check_cache(db, cache_key: str) -> Optional[dict]:
    if not db:
        return None
    try:
        res = db.table("price_cache").select("*").eq("cache_key", cache_key).gt("expires_at", datetime.now(timezone.utc).isoformat()).execute()
        if res.data:
            return res.data[0]
    except Exception as e:
        logger.warning(f"Cache check failed: {e}")
    return None

def save_cache(db, cache_key: str, item: ExtractedItem, unit_price: float, sources: list):
    if not db:
        return
    try:
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=48)
        record = {
            "cache_key": cache_key,
            "oem_name": item.manufacturer,
            "product_name": item.normalized_description or item.raw_description,
            "normalized_name": sources[0].get("normalized_name") if sources and sources[0].get("normalized_name") else item.normalized_description,
            "part_number": item.sku,
            "unit_price": float(unit_price) if unit_price is not None else None,
            "sources": sources,
            "cached_at": now.isoformat(),
            "expires_at": expires_at.isoformat()
        }
        
        existing = db.table("price_cache").select("id").eq("cache_key", cache_key).execute()
        if existing.data:
            db.table("price_cache").update(record).eq("cache_key", cache_key).execute()
        else:
            db.table("price_cache").insert(record).execute()
    except Exception as e:
        logger.warning(f"Cache save failed: {e}")

def save_crawl_results(db, request_id: str, item_id: str, sources: list):
    if not db or not sources:
        return
    try:
        records = []
        for s in sources:
            records.append({
                "request_id": request_id,
                "item_id": item_id,
                "source_name": s.get("source_name"),
                "source_url": s.get("source_url"),
                "product_name": s.get("product_name"),
                "normalized_name": s.get("normalized_name"),
                "unit_price": float(s.get("unit_price")) if s.get("unit_price") else None,
                "currency": s.get("currency"),
                "match_type": s.get("match_type")
            })
        db.table("web_crawl_results").insert(records).execute()
    except Exception as e:
        logger.warning(f"Failed to save crawl results: {e}")

def get_market_price(db, item: ExtractedItem, request_id: str, deep_search: bool = False, custom_gemini_key: str = None) -> dict:
    if item.category != "HARDWARE":
        return {} 

    if not item.sku and not (item.normalized_description or item.raw_description):
        return {"match_status": "NO_MATCH", "sources": []}

    cache_key = _get_cache_key(item)
    
    if not deep_search:
        cached = check_cache(db, cache_key)
        if cached:
            return {
                "unit_price": cached.get("unit_price"),
                "currency": "USD",
                "match_status": "EXACT" if item.sku else "CLOSE",
                "sources": cached.get("sources", [])
            }

    sources = search_hardware_pricing(
        part_number=item.sku, 
        product_name=item.normalized_description or item.raw_description,
        custom_gemini_key=custom_gemini_key
    )

    if not sources:
        return {"match_status": "NO_MATCH", "sources": []}

    valid_prices = [s["unit_price"] for s in sources if s.get("unit_price") is not None]
    if not valid_prices:
        return {"match_status": "NO_MATCH", "sources": sources}

    avg_price = sum(valid_prices) / len(valid_prices)
    
    save_cache(db, cache_key, item, avg_price, sources)
    
    if item.id:
        save_crawl_results(db, request_id, item.id, sources)

    return {
        "unit_price": avg_price,
        "currency": "USD",
        "match_status": "EXACT" if item.sku else "CLOSE",
        "sources": sources
    }
