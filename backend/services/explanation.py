import os
import json
import logging
from typing import List
from google import genai
from google.genai import types
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class ExplanationResponse(BaseModel):
    executive_summary: str
    negotiation_actions: List[str]


SYSTEM_PROMPT = """You are an AI procurement advisor.

Explain the supplied verified analysis in concise business language.
Do not recalculate, alter, round, or contradict any supplied number.
Do not introduce external market facts.
Do not claim the benchmark is authoritative if its source is mock data.
State the primary price variance, material risks, and a practical next action.
If the status is REVIEW_REQUIRED, clearly explain which information requires
human validation.
Return a short executive summary and up to three negotiation actions.
Return only JSON that conforms to the supplied schema.
"""


def generate_explanation(analysis_data: dict) -> ExplanationResponse:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.error("GEMINI_API_KEY is not set.")
        return ExplanationResponse(
            executive_summary="Analysis complete (Explanation generation skipped due to missing API key).",
            negotiation_actions=[],
        )

    client = genai.Client(api_key=api_key)

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=json.dumps(analysis_data, default=str),
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=ExplanationResponse,
                temperature=0.0,
            ),
        )
        result_json = json.loads(response.text)
        return ExplanationResponse.model_validate(result_json)
    except Exception as e:
        logger.error(f"Explanation generation failed: {e}")
        return ExplanationResponse(
            executive_summary="Explanation generation failed.", negotiation_actions=[]
        )
