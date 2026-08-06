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


def _deterministic_explanation(analysis_data: dict) -> ExplanationResponse:
    """Template-based summary used when Gemini is unavailable (e.g. quota)."""
    overall = analysis_data.get("overall_score")
    recommendation = analysis_data.get("recommendation", "REVIEW_REQUIRED")
    breakdown = analysis_data.get("breakdown") or {}
    warnings = analysis_data.get("warnings") or []

    rec_line = {
        "APPROVE": "The request appears priced competitively relative to benchmarks and is suitable for approval.",
        "NEGOTIATE": "The request is broadly in line with benchmarks but contains items worth negotiating before approval.",
        "REVIEW_REQUIRED": "The request needs human review before proceeding.",
    }.get(recommendation, "The request needs human review before proceeding.")

    def ratio(section: dict) -> float:
        maximum = section.get("maximum") or 1
        return section.get("score", 0) / maximum if maximum else 0.0

    price_pct = ratio(breakdown.get("price") or {})
    conf_pct = ratio(breakdown.get("benchmark_confidence") or {})
    comp_pct = ratio(breakdown.get("completeness") or {})
    cons_pct = ratio(breakdown.get("consistency") or {})

    summary = f"Overall score {overall}/100 ({recommendation}). {rec_line} "
    bits = []
    if price_pct < 0.8:
        bits.append("quoted unit prices sit above benchmark medians, leaving negotiating room")
    if conf_pct < 0.6:
        bits.append("benchmark match confidence is limited")
    if comp_pct < 1.0:
        bits.append("some line items are missing commercial details")
    if cons_pct < 1.0:
        bits.append("arithmetic or consistency issues exist across line items")
    if bits:
        summary += "Note: " + "; ".join(bits) + "."
    if warnings:
        summary += " Flags: " + "; ".join(warnings) + "."

    actions = []
    if price_pct < 0.8:
        actions.append("Negotiate unit prices down toward the benchmark median.")
    if conf_pct < 0.6:
        actions.append("Validate or enrich benchmark data for a stronger comparison.")
    if comp_pct < 1.0:
        actions.append("Collect complete quantity, unit, and pricing details for all line items.")
    if cons_pct < 1.0:
        actions.append("Resolve arithmetic mismatches between unit price, quantity, and line totals.")
    if not actions:
        actions.append("Proceed with procurement and document the benchmark comparison.")
    return ExplanationResponse(
        executive_summary=summary, negotiation_actions=actions[:3]
    )


def generate_explanation(analysis_data: dict, custom_api_key: str = None) -> ExplanationResponse:
    api_key = custom_api_key or os.environ.get("GEMINI_API_KEY")
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
        return _deterministic_explanation(analysis_data)
