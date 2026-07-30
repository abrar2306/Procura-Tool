from backend.services.benchmark_matcher import match_benchmark
from backend.models.extraction import ExtractedItem, BillingUnit
from backend.models.procurement import ProcurementCategory
from backend.models.benchmark import MatchStatus, MatchMethod


def test_exact_sku_match():
    item = ExtractedItem(
        category=ProcurementCategory.SOFTWARE,
        sku="M365-E3",
        billing_unit=BillingUnit.MONTH,
        currency="USD",
    )
    candidates = [
        {
            "id": "1",
            "attributes": {"sku": "M365-E3", "license_metric": "MONTH"},
            "benchmark_low": 30.0,
            "benchmark_median": 33.0,
            "benchmark_high": 36.0,
            "currency": "USD",
            "unit": "MONTH",
        }
    ]

    match = match_benchmark(item, candidates)
    assert match.match_status == MatchStatus.MATCHED
    assert match.match_method == MatchMethod.EXACT_SKU
    assert match.match_confidence > 50


def test_role_alias_match():
    item = ExtractedItem(
        category=ProcurementCategory.RESOURCE, role_name="C# Engineer", currency="INR"
    )
    candidates = [
        {
            "id": "2",
            "canonical_name": ".NET Developer",
            "aliases": ["C# Engineer", "dot net dev"],
            "benchmark_low": 120000.0,
            "benchmark_median": 140000.0,
            "benchmark_high": 160000.0,
            "currency": "INR",
            "unit": "MONTH",
        }
    ]

    match = match_benchmark(item, candidates)
    assert match.match_status == MatchStatus.MATCHED
    # Our algo prioritizes role alias match as EXACT_ROLE
    assert match.match_method == MatchMethod.EXACT_ROLE


def test_no_match_fallback():
    item = ExtractedItem(
        category=ProcurementCategory.HARDWARE, sku="UNKNOWN-SKU", currency="USD"
    )
    candidates = [
        {
            "id": "3",
            "attributes": {"part_number": "KNOWN-SKU"},
            "currency": "USD",
            "benchmark_low": 100,
            "benchmark_median": 200,
            "benchmark_high": 300,
            "unit": "EACH",
        }
    ]

    match = match_benchmark(item, candidates)
    assert match.match_status == MatchStatus.NO_MATCH
