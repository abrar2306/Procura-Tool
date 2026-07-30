from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field
from enum import Enum
from .extraction import ExtractedItem
from .benchmark import BenchmarkMatch


class Recommendation(str, Enum):
    COMMERCIALLY_FAVORABLE = "COMMERCIALLY_FAVORABLE"
    NEGOTIATE = "NEGOTIATE"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    ESCALATE = "ESCALATE"


class ScoreComponent(BaseModel):
    score: float
    maximum: float


class ScoreBreakdown(BaseModel):
    price: ScoreComponent = Field(
        default_factory=lambda: ScoreComponent(score=0, maximum=60)
    )
    benchmark_confidence: ScoreComponent = Field(
        default_factory=lambda: ScoreComponent(score=0, maximum=20)
    )
    completeness: ScoreComponent = Field(
        default_factory=lambda: ScoreComponent(score=0, maximum=10)
    )
    consistency: ScoreComponent = Field(
        default_factory=lambda: ScoreComponent(score=0, maximum=10)
    )


class AnalyzedItem(BaseModel):
    extracted_item: ExtractedItem
    benchmark_match: BenchmarkMatch
    item_score: float
    warnings: List[str] = Field(default_factory=list)


class AnalysisResponse(BaseModel):
    request_id: str
    overall_score: float
    recommendation: Recommendation
    score_version: str
    summary: str
    score_breakdown: ScoreBreakdown
    items: List[AnalyzedItem] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    reason_codes: List[str] = Field(default_factory=list)
