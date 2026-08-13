import os
import json
import logging
from typing import Any
from firecrawl import FirecrawlApp
from google import genai

logger = logging.getLogger(__name__)

TARGET_SITES = [
    {"name": "ITPrice", "domain": "itprice.com"},
    {"name": "Router-Switch", "domain": "router-switch.com"},
    {"name": "CDW", "domain": "cdw.com"}
]

# Initialize Firecrawl
firecrawl_api_key = os.getenv("FIRECRAWL_API_KEY")
if not firecrawl_api_key:
    logger.warning("FIRECRAWL_API_KEY is not set.")

def _extract_price_with_gemini(query: str, search_results: list, custom_api_key: str = None) -> dict[str, Any]:
    api_key = custom_api_key or os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("No Gemini API key available for price extraction.")
        return {}

    client = genai.Client(api_key=api_key)

    snippets = []
    for r in search_results:
        snippets.append(f"Title: {getattr(r, 'title', '')}\nURL: {getattr(r, 'url', '')}\nDescription: {getattr(r, 'description', '')}")
    
    context = "\n\n".join(snippets)

    prompt = f"""
    You are a procurement pricing expert. 
    I searched for "{query}" and got these search snippets:
    
    {context}
    
    Extract the best matching product's pricing. 
    Look for a base price (MSRP/List) and a discount price (Sale/Current).
    Also, find the most standard, clean name for this product as found on the website. If the website name is already good, use it as is. Do not generate a new name from scratch, just clean it up.
    
    Return a JSON object with:
    {{
        "unit_price": 1234.56,  // float, the lowest valid price found (discounted if available)
        "currency": "USD",
        "product_name_found": "Exact raw name of the product in the search results",
        "normalized_name": "The cleanest, most standard version of the product name found"
    }}
    If no price is found, return {{}}.
    Respond with ONLY valid JSON, no markdown formatting.
    """

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:-3]
        if text.startswith("```"):
            text = text[3:-3]
        return json.loads(text.strip())
    except Exception as e:
        logger.error(f"Failed to extract price with Gemini: {e}")
        return {}

def search_hardware_pricing(part_number: str, product_name: str, custom_gemini_key: str = None) -> list[dict[str, Any]]:
    if not firecrawl_api_key:
        return []
    
    try:
        app = FirecrawlApp(api_key=firecrawl_api_key)
    except Exception as e:
        logger.error(f"Failed to initialize Firecrawl: {e}")
        return []

    query = part_number if part_number else product_name
    if not query:
        return []

    results = []

    for site in TARGET_SITES:
        site_query = f"site:{site['domain']} {query}"
        try:
            # Note: Firecrawl API may have rate limits, we should be careful.
            # search() returns a list of results in a dict or object
            search_res = app.search(site_query)
            # The search_res might be a dict with 'data' or a list of objects
            # Based on the test, it's a list of SearchResultWeb or similar, accessible via .get('data', []) or it's just a dict
            
            if hasattr(search_res, "web") and search_res.web:
                items = search_res.web
            elif isinstance(search_res, dict) and "data" in search_res:
                items = search_res["data"]
            elif hasattr(search_res, "data"):
                items = search_res.data
            else:
                items = search_res
            
            # Firecrawl search returns a 'data' array.
            items = items[:3] # take top 3
            if not items:
                continue
                
            extracted = _extract_price_with_gemini(query, items, custom_gemini_key)
            if extracted and extracted.get("unit_price"):
                # Get the first URL as the source
                first_url = getattr(items[0], 'url', '') if hasattr(items[0], 'url') else items[0].get('url', '')
                
                results.append({
                    "source_name": site["name"],
                    "source_url": first_url,
                    "unit_price": extracted.get("unit_price"),
                    "currency": extracted.get("currency", "USD"),
                    "product_name": extracted.get("product_name_found", ""),
                    "normalized_name": extracted.get("normalized_name", ""),
                    "match_type": "exact" if part_number and part_number.lower() in extracted.get("product_name_found", "").lower() else "close"
                })
        except Exception as e:
            logger.error(f"Search failed for {site['name']}: {e}")

    return results
