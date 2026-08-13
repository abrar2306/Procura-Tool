import os
import json
import re
import time
import logging
from typing import Any, Dict, List, Optional

from google import genai
from google.genai import types
from pydantic import BaseModel, ValidationError

from backend.models.extraction import ExtractedItem, SourceEvidence, BillingUnit
from backend.models.procurement import ProcurementCategory

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a procurement document extraction engine.

Extract only information explicitly present in the supplied document.
Do not infer, estimate, or invent missing prices, quantities, currencies,
SKUs, experience values, contract terms, totals, or supplier information.
Return null / omit a field when it is absent or ambiguous.

Classify every commercial line item as exactly one category:
SOFTWARE, HARDWARE or RESOURCE.

Return ONLY a JSON object of the form:
{"items": [ { ...item fields... }, ... ]}

Each item is a flat object with ONLY these keys (use null if unknown):
- category: string  (one of "SOFTWARE", "HARDWARE", "RESOURCE")
- raw_description: string (exact wording from the document)
- normalized_description: string (standardized, officially-cased version of the product name, e.g., "Cisco Catalyst 9200L 48-port PoE+ Data Switch")
- manufacturer: string
- product_name: string
- sku: string
- role_name: string
- experience_years: number
- location: string
- quantity: number
- billing_unit: string (one of "MONTH","YEAR","HOUR","DAY","EACH","LICENSE","SUBSCRIPTION")
- unit_price: number
- duration: number (months)
- line_total: number
- currency: string (3-letter code, e.g. "USD")
- extraction_confidence: number between 0 and 1
- source_evidence: string (free text citing page/sheet/cell/line)

Do not calculate a procurement score.
Do not select a market benchmark.
Do not wrap the array in any other key and do not add fields not listed above.
"""


class ExtractedItemsList(BaseModel):
    items: list[ExtractedItem]


def _parse_json(text: str) -> Any:
    """Tolerate code fences / prose around the JSON payload."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("[") if cleaned.find("{") == -1 else cleaned.find("{")
        end = cleaned.rfind("}") if cleaned.rfind("[") == -1 else max(
            cleaned.rfind("}"), cleaned.rfind("]")
        )
        if start == -1 or end == -1 or end < start:
            raise ValueError("No JSON payload found in response")
        return json.loads(cleaned[start : end + 1])


def _field(obj: Any, *keys: str) -> Any:
    """Resolve a possibly nested meta-object {value, confidence, source_evidence}."""
    for key in keys:
        if not isinstance(obj, dict):
            continue
        if key in obj:
            val = obj[key]
            if isinstance(val, dict) and "value" in val:
                return val["value"]
            return val
    return None


def _source_text(obj: Any, *keys: str) -> Optional[str]:
    for key in keys:
        if isinstance(obj, dict):
            val = obj[key] if key in obj else None
            if isinstance(val, dict):
                return val.get("source_evidence") or val.get("source")
            if isinstance(val, str):
                return val
    return None


def _to_extracted_item(data: Any) -> Optional[ExtractedItem]:
    if not isinstance(data, dict):
        return None

    category = _field(data, "category", "item_type", "type")
    if category is None:
        oem = _field(data, "oem", "manufacturer") or ""
        if oem.lower() in ("microsoft", "oracle", "sap", "adobe"):
            category = "SOFTWARE"
        else:
            category = "HARDWARE"
    try:
        category_enum = ProcurementCategory(str(category).upper())
    except ValueError:
        category_enum = ProcurementCategory.HARDWARE

    quantity = _field(data, "quantity", "qty")
    unit_price = _field(data, "unit_price", "price", "unitPrice")
    line_total = _field(data, "line_total", "total", "lineTotal")

    billing = _field(data, "billing_unit", "billingUnit", "unit")
    billing_unit = None
    if billing:
        try:
            billing_unit = BillingUnit(str(billing).upper())
        except ValueError:
            billing_unit = None

    evidence = (
        _source_text(data, "source_evidence", "source")
        or f"{_source_text(data,'unit_price','price')}".strip()
        or None
    )

    item = ExtractedItem(
        category=category_enum,
        raw_description=_field(data, "raw_description", "description", "rawDescription"),
        normalized_description=_field(
            data,
            "normalized_description",
            "proposed_canonical_description",
            "canonical_name",
            "normalizedDescription",
        ),
        manufacturer=_field(data, "manufacturer", "oem"),
        product_name=_field(data, "product_name", "product", "model", "productName"),
        sku=_field(data, "sku", "part_number", "partNumber", "model_number"),
        role_name=_field(data, "role_name", "role", "roleName"),
        skills=_field(data, "skills") or None,
        experience_years=_field(data, "experience_years", "experienceYears"),
        location=_field(data, "location"),
        quantity=quantity,
        billing_unit=billing_unit,
        unit_price=unit_price,
        duration=_field(data, "duration", "contract_duration", "contractDuration"),
        line_total=line_total,
        currency=_field(data, "currency"),
        attributes={"extraction": "gemini"},
        extraction_confidence=_field(data, "extraction_confidence", "confidence"),
        source_evidence=SourceEvidence(source_text=evidence) if evidence else None,
    )
    return item


def extract_procurement_data(document_text: str, custom_api_key: Optional[str] = None) -> List[ExtractedItem]:
    api_key = custom_api_key or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.error("GEMINI_API_KEY is not set.")
        return []

    client = genai.Client(api_key=api_key)

    try:
        last_error = None
        for attempt in range(1, 4):
            try:
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=document_text,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        response_mime_type="application/json",
                        # NOTE: do NOT pass response_schema here. The Pydantic
                        # model's dict fields (e.g. attributes) produce
                        # `additionalProperties`, which the Gemini Developer API
                        # rejects. We validate/adjust manually.
                        temperature=0.0,
                    ),
                )
                payload = _parse_json(response.text)
                break
            except Exception as e:
                last_error = e
                logger.warning(
                    "Gemini extraction attempt %d failed: %s", attempt, e
                )
                if attempt < 3:
                    time.sleep(1.5 * attempt)
        else:
            raise last_error
    except Exception as e:
        logger.error(f"Gemini extraction failed after retries: {e}")
        return []

    raw_items = payload
    if isinstance(raw_items, dict):
        raw_items = raw_items.get("items") or raw_items.get("commercial_line_items") or []

    items: List[ExtractedItem] = []
    for raw in raw_items if isinstance(raw_items, list) else []:
        item = _to_extracted_item(raw)
        if item is not None:
            try:
                items.append(ExtractedItem.model_validate(item.model_dump()))
            except ValidationError:
                items.append(item)
    return items