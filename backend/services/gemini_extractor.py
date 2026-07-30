import os
import json
import logging
from typing import Dict, Any, List
from google import genai
from google.genai import types
from pydantic import BaseModel
from backend.models.extraction import ExtractedItem

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a procurement document extraction engine.

Extract only information explicitly present in the supplied document.
Do not infer, estimate, or invent missing prices, quantities, currencies,
SKUs, experience values, contract terms, totals, or supplier information.
Return null when a field is absent or ambiguous.

Classify every commercial line item as exactly one of:
SOFTWARE, HARDWARE, RESOURCE.

Preserve the original wording in raw_description.
Provide a proposed canonical description separately.
For every critical field, include confidence and source evidence.
Source evidence must include page number, sheet name, cell range, or the
closest available source text.

Do not calculate a procurement score.
Do not select a market benchmark.
Return only JSON that conforms to the supplied schema.
"""


class ExtractedItemsList(BaseModel):
    items: list[ExtractedItem]


def extract_procurement_data(document_text: str) -> List[ExtractedItem]:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.error("GEMINI_API_KEY is not set.")
        return []

    client = genai.Client(api_key=api_key)

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=document_text,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=ExtractedItemsList,
                temperature=0.0,
            ),
        )
        # Parse the JSON response
        result_json = json.loads(response.text)
        validated_items = ExtractedItemsList.model_validate(result_json)
        return validated_items.items
    except Exception as e:
        logger.error(f"Gemini extraction failed: {e}")
        return []
