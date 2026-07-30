import pytest
from backend.models.procurement import ProcurementCategory, ProcurementRequest
from backend.models.extraction import ExtractedItem, BillingUnit
from pydantic import ValidationError
from datetime import datetime


def test_software_payload():
    item = ExtractedItem(
        category=ProcurementCategory.SOFTWARE,
        raw_description="Microsoft 365 E3",
        product_name="Microsoft 365 E3",
        manufacturer="Microsoft",
        sku="M365-E3",
        quantity=100,
        billing_unit=BillingUnit.MONTH,
        unit_price=36.0,
        duration=12,
        line_total=43200.0,
        currency="USD",
        extraction_confidence=0.95,
    )
    assert item.category == ProcurementCategory.SOFTWARE
    assert item.line_total == 43200.0


def test_hardware_payload():
    item = ExtractedItem(
        category=ProcurementCategory.HARDWARE,
        raw_description="Dell Latitude 5450",
        product_name="Latitude 5450",
        manufacturer="Dell",
        quantity=50,
        unit_price=1200.0,
        line_total=60000.0,
        currency="USD",
        extraction_confidence=0.98,
    )
    assert item.category == ProcurementCategory.HARDWARE
    assert item.unit_price == 1200.0


def test_resource_payload():
    item = ExtractedItem(
        category=ProcurementCategory.RESOURCE,
        raw_description="Senior C# and ASP.NET Core Engineer",
        role_name=".NET Developer",
        skills=["C#", "ASP.NET Core"],
        experience_years=5,
        location="Pune",
        quantity=2,
        billing_unit=BillingUnit.MONTH,
        unit_price=145000,
        duration=12,
        line_total=3480000,
        currency="INR",
        extraction_confidence=0.94,
        source_evidence={
            "page": 4,
            "source_text": "2 Senior .NET Developers at INR 1,45,000 per month",
        },
    )
    assert item.category == ProcurementCategory.RESOURCE
    assert item.currency == "INR"


def test_invalid_numeric_values():
    with pytest.raises(ValidationError):
        ExtractedItem(
            category=ProcurementCategory.SOFTWARE, quantity=-5  # Negative quantity
        )


def test_invalid_currency():
    with pytest.raises(ValidationError):
        ExtractedItem(
            category=ProcurementCategory.SOFTWARE, currency="usd"  # Lowercase
        )
    with pytest.raises(ValidationError):
        ExtractedItem(category=ProcurementCategory.SOFTWARE, currency="US")  # Length 2
