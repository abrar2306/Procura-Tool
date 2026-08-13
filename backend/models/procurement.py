from enum import Enum
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field, field_validator
from datetime import datetime


class ProcurementCategory(str, Enum):
    SOFTWARE = "SOFTWARE"
    HARDWARE = "HARDWARE"
    RESOURCE = "RESOURCE"


class RequestStatus(str, Enum):
    DRAFT = "draft"
    UPLOADED = "uploaded"
    EXTRACTING = "extracting"
    REVIEW_REQUIRED = "review_required"
    READY_FOR_ANALYSIS = "ready_for_analysis"
    ANALYZING = "analyzing"
    ANALYZED = "analyzed"
    FAILED = "error"


class ProcurementRequest(BaseModel):
    id: str
    created_by: str
    organization_id: str
    title: str
    category: ProcurementCategory
    supplier_name: Optional[str] = None
    currency: Optional[str] = None
    quoted_total: Optional[float] = None
    status: RequestStatus = RequestStatus.DRAFT
    created_at: datetime
    updated_at: datetime

    @field_validator("currency")
    @classmethod
    def validate_currency(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if len(v) != 3 or not v.isupper() or not v.isalpha():
                raise ValueError("Currency must use a three-letter uppercase code.")
        return v

    @field_validator("quoted_total")
    @classmethod
    def validate_total(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("quoted_total cannot be negative.")
        return v


class UploadedDocument(BaseModel):
    id: str
    request_id: str
    file_name: str
    mime_type: str
    storage_bucket: str
    storage_path: str
    checksum: str
    processing_status: str
    created_at: datetime
