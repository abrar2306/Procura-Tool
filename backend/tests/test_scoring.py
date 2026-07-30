from backend.services.scoring import (
    calculate_price_score,
    analyze_item,
    aggregate_score,
)
from backend.models.extraction import ExtractedItem, BillingUnit
from backend.models.procurement import ProcurementCategory
from backend.models.benchmark import BenchmarkMatch, MatchStatus, MatchMethod


def test_price_scoring_bands():
    low, median, high = 100, 120, 150

    # Quote <= low -> 58-60 points
    assert calculate_price_score(90, low, median, high) == 60
    assert calculate_price_score(100, low, median, high) == 58

    # Between low and median -> 50-57 points
    assert calculate_price_score(110, low, median, high) == 53.5
    assert calculate_price_score(120, low, median, high) == 50

    # Between median and high -> 35-49 points
    assert calculate_price_score(135, low, median, high) == 42
    assert calculate_price_score(150, low, median, high) == 35

    # Between high and 115% high -> 15-34 points
    assert calculate_price_score(160, low, median, high) < 35
    assert calculate_price_score(172.5, low, median, high) == 15

    # Above 115% high -> 0-14 points
    assert calculate_price_score(200, low, median, high) == 0


def test_analyze_item_completeness_and_consistency():
    item = ExtractedItem(
        category=ProcurementCategory.HARDWARE,
        raw_description="Laptop",
        quantity=10,
        unit_price=1000,
        line_total=10000,  # perfectly consistent
        currency="USD",
        billing_unit=BillingUnit.EACH,
    )

    match = BenchmarkMatch(
        match_status=MatchStatus.MATCHED,
        match_method=MatchMethod.EXACT_PART_NUMBER,
        match_confidence=90,
        benchmark_low=900,
        benchmark_median=1000,
        benchmark_high=1100,
        currency="USD",
        unit=BillingUnit.EACH,
    )

    ai = analyze_item(item, match)

    # price = calculate_price_score(1000, 900, 1000, 1100) -> 50 points
    # conf = 90% of 20 = 18 points
    # comp = 10 points (no missing fields)
    # cons = 10 points (line_total = quantity * unit_price)
    # total = 50 + 18 + 10 + 10 = 88

    assert ai.item_score == 88


def test_arithmetic_mismatch_penalty():
    item = ExtractedItem(
        category=ProcurementCategory.HARDWARE,
        raw_description="Laptop",
        quantity=10,
        unit_price=1000,
        line_total=9000,  # invalid arithmetic > 2% diff
        currency="USD",
        billing_unit=BillingUnit.EACH,
    )
    match = BenchmarkMatch(
        match_status=MatchStatus.MATCHED,
        match_method=MatchMethod.EXACT_PART_NUMBER,
        match_confidence=90,
        benchmark_low=900,
        benchmark_median=1000,
        benchmark_high=1100,
        currency="USD",
        unit=BillingUnit.EACH,
    )
    ai = analyze_item(item, match)

    # Consistency score should be 0, dropping overall score by 10 points
    assert ai.item_score == 78
    assert any("Arithmetic mismatch" in w for w in ai.warnings)
