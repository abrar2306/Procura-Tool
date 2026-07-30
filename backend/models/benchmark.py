from typing import Optional, List, Any
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
from .procurement import ProcurementCategory
from .extraction import BillingUnit


class VolumeTier(BaseModel):
    min_quantity: float
    max_quantity: Optional[float] = None
    discount_percentage: float


class MatchStatus(str, Enum):
    MATCHED = "MATCHED"
    MANUAL_REVIEW = "MANUAL_REVIEW"
    NO_MATCH = "NO_MATCH"


class MatchMethod(str, Enum):
    EXACT_SKU = "EXACT_SKU"
    EXACT_PART_NUMBER = "EXACT_PART_NUMBER"
    EXACT_ROLE = "EXACT_ROLE"
    EXACT_NORMALIZED_NAME = "EXACT_NORMALIZED_NAME"
    APPROVED_ALIAS = "APPROVED_ALIAS"
    CATEGORY_ATTRIBUTES = "CATEGORY_ATTRIBUTES"
    FUZZY = "FUZZY"
    NONE = "NONE"


class BenchmarkCandidate(BaseModel):
    id: str
    category: ProcurementCategory
    canonical_name: str
    aliases: List[str] = Field(default_factory=list)
    attributes: dict = Field(default_factory=dict)
    currency: str
    unit: Optional[BillingUnit] = None

    benchmark_low: float
    benchmark_median: float
    benchmark_high: float
    volume_tiers: List[VolumeTier] = Field(default_factory=list)

    region: Optional[str] = None
    effective_from: Optional[datetime] = None
    effective_to: Optional[datetime] = None
    source_name: str
    confidence: float
    created_at: datetime


class BenchmarkMatch(BaseModel):
    match_status: MatchStatus
    match_method: MatchMethod
    match_confidence: float

    benchmark_record_id: Optional[str] = None
    benchmark_low: Optional[float] = None
    benchmark_median: Optional[float] = None
    benchmark_high: Optional[float] = None
    currency: Optional[str] = None
    unit: Optional[BillingUnit] = None
    differences: List[str] = Field(default_factory=list)
    applied_discount: float = 0.0
