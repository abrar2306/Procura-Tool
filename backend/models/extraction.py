from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from enum import Enum
from .procurement import ProcurementCategory


class BillingUnit(str, Enum):
    MONTH = "MONTH"
    YEAR = "YEAR"
    HOUR = "HOUR"
    DAY = "DAY"
    EACH = "EACH"
    LICENSE = "LICENSE"
    SUBSCRIPTION = "SUBSCRIPTION"


class SourceEvidence(BaseModel):
    document_id: Optional[str] = None
    page: Optional[int] = None
    sheet: Optional[str] = None
    source_text: Optional[str] = None


class ExtractedItem(BaseModel):
    id: Optional[str] = None
    request_id: Optional[str] = None
    document_id: Optional[str] = None
    document_version: int = 1
    category: ProcurementCategory

    raw_description: Optional[str] = None
    normalized_description: Optional[str] = None

    manufacturer: Optional[str] = None
    product_name: Optional[str] = None
    sku: Optional[str] = None

    role_name: Optional[str] = None
    skills: Optional[List[str]] = Field(default_factory=list)
    experience_years: Optional[float] = None
    location: Optional[str] = None

    quantity: Optional[float] = None
    billing_unit: Optional[BillingUnit] = None
    unit_price: Optional[float] = None
    duration: Optional[float] = None
    line_total: Optional[float] = None
    currency: Optional[str] = None

    attributes: Optional[Dict[str, Any]] = Field(default_factory=dict)

    extraction_confidence: Optional[float] = None
    classification_confidence: Optional[float] = None
    source_evidence: Optional[SourceEvidence] = None

    user_verified: bool = False
    created_at: Optional[datetime] = None

    @field_validator("quantity", "unit_price", "duration")
    @classmethod
    def validate_non_negative(cls, v: Optional[float], info) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError(f"{info.field_name} cannot be negative.")
        return v

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if len(v) != 3 or not v.isupper() or not v.isalpha():
                raise ValueError("Currency must use a three-letter uppercase code.")
        return v
