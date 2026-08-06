import os
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from backend.models.extraction import ExtractedItem
from backend.models.benchmark import (
    BenchmarkMatch,
    MatchStatus,
    MatchMethod,
    ProcurementCategory,
)
from backend.services.normalization import normalize_string

logger = logging.getLogger(__name__)

# Note: In a real environment, you'd pass the Supabase client or DB session here.
# For demonstration in MVP, we rely on the DB layer directly or inject records.
# We'll build the matching logic as a pure function that takes the extracted item
# and the list of available benchmark records for that category.


def evaluate_software_match(
    item: ExtractedItem, candidate: Dict[str, Any]
) -> tuple[int, MatchMethod, List[str]]:
    score = 0
    method = MatchMethod.NONE
    differences = []

    cand_sku = normalize_string(candidate.get("attributes", {}).get("sku") or "")
    item_sku = normalize_string(item.sku or "")
    if cand_sku and item_sku and cand_sku == item_sku:
        score += 50
        method = MatchMethod.EXACT_SKU

    cand_name = normalize_string(candidate.get("canonical_name"))
    item_name = normalize_string(item.normalized_description or item.raw_description)
    if (
        cand_name
        and item_name
        and (
            cand_name == item_name
            or item_name in [normalize_string(a) for a in candidate.get("aliases", [])]
        )
    ):
        score += 20
        if method == MatchMethod.NONE:
            method = MatchMethod.APPROVED_ALIAS

    cand_pub = normalize_string(candidate.get("attributes", {}).get("publisher") or "")
    item_mfg = normalize_string(item.manufacturer or "")
    if cand_pub and item_mfg and cand_pub == item_mfg:
        score += 10

    cand_metric = normalize_string(
        candidate.get("attributes", {}).get("license_metric") or ""
    )
    item_metric = normalize_string(item.billing_unit.value if item.billing_unit else "")
    if cand_metric and item_metric and cand_metric == item_metric:
        score += 10
    elif cand_metric or item_metric:
        differences.append(
            f"Metric mismatch: Request({item_metric}), Benchmark({cand_metric})"
        )

    # We could add contract term and quantity band here

    if score >= 90:
        if method == MatchMethod.NONE:
            method = MatchMethod.EXACT_SKU  # High score implies exact match
    elif score >= 75:
        if method == MatchMethod.NONE:
            method = MatchMethod.APPROVED_ALIAS
    elif score >= 60:
        if method == MatchMethod.NONE:
            method = MatchMethod.CATEGORY_ATTRIBUTES
    else:
        method = MatchMethod.NONE

    return min(score, 100), method, differences


def evaluate_hardware_match(
    item: ExtractedItem, candidate: Dict[str, Any]
) -> tuple[int, MatchMethod, List[str]]:
    score = 0
    method = MatchMethod.NONE
    differences = []

    cand_part = normalize_string(
        candidate.get("attributes", {}).get("part_number") or ""
    )
    item_part = normalize_string(item.sku or "")
    if cand_part and item_part and cand_part == item_part:
        score += 50
        method = MatchMethod.EXACT_PART_NUMBER

    cand_mfg = normalize_string(
        candidate.get("attributes", {}).get("manufacturer") or ""
    )
    item_mfg = normalize_string(item.manufacturer or "")
    if cand_mfg and item_mfg and cand_mfg == item_mfg:
        score += 10

    cand_model = normalize_string(candidate.get("canonical_name"))
    item_model = normalize_string(item.product_name or item.normalized_description)
    if (
        cand_model
        and item_model
        and (
            cand_model == item_model
            or item_model in [normalize_string(a) for a in candidate.get("aliases", [])]
        )
    ):
        score += 50
        if method == MatchMethod.NONE:
            method = MatchMethod.APPROVED_ALIAS

    if score >= 90:
        if method == MatchMethod.NONE:
            method = MatchMethod.EXACT_PART_NUMBER
    elif score >= 75:
        if method == MatchMethod.NONE:
            method = MatchMethod.APPROVED_ALIAS
    elif score >= 60:
        if method == MatchMethod.NONE:
            method = MatchMethod.CATEGORY_ATTRIBUTES
    else:
        method = MatchMethod.NONE

    return min(score, 100), method, differences


def evaluate_resource_match(
    item: ExtractedItem, candidate: Dict[str, Any]
) -> tuple[int, MatchMethod, List[str]]:
    score = 0
    method = MatchMethod.NONE
    differences = []

    cand_role = normalize_string(candidate.get("canonical_name"))
    item_role = normalize_string(
        item.normalized_description or item.role_name or item.raw_description
    )
    if (
        cand_role
        and item_role
        and (
            cand_role == item_role
            or item_role in [normalize_string(a) for a in candidate.get("aliases", [])]
        )
    ):
        score += 40
        method = MatchMethod.EXACT_ROLE

    cand_exp = normalize_string(
        candidate.get("attributes", {}).get("experience_band") or ""
    )
    # In a real app we'd map numerical experience_years to the band. For MVP, we check.
    if item.experience_years:
        if cand_exp == "4-6 years" and 4 <= item.experience_years <= 6:
            score += 20
        elif cand_exp == "2-4 years" and 2 <= item.experience_years <= 4:
            score += 20
        else:
            differences.append(
                f"Experience mismatch: Request({item.experience_years}y), Benchmark({cand_exp})"
            )

    cand_loc = normalize_string(candidate.get("attributes", {}).get("location") or "")
    item_loc = normalize_string(item.location or "")
    if cand_loc and item_loc and cand_loc == item_loc:
        score += 15
    elif cand_loc or item_loc:
        differences.append(
            f"Location mismatch: Request({item_loc}), Benchmark({cand_loc})"
        )

    cand_unit = normalize_string(candidate.get("unit") or "")
    item_unit = normalize_string(item.billing_unit.value if item.billing_unit else "")
    if cand_unit and item_unit and cand_unit == item_unit:
        score += 10
    elif cand_unit or item_unit:
        differences.append(
            f"Billing unit mismatch: Request({item_unit}), Benchmark({cand_unit})"
        )

    if score >= 90:
        if method == MatchMethod.NONE:
            method = MatchMethod.EXACT_ROLE
    elif score >= 75:
        if method == MatchMethod.NONE:
            method = MatchMethod.APPROVED_ALIAS
    elif score >= 60:
        if method == MatchMethod.NONE:
            method = MatchMethod.CATEGORY_ATTRIBUTES
    else:
        method = MatchMethod.NONE

    return min(score, 100), method, differences


def match_benchmark(
    item: ExtractedItem, candidates: List[Dict[str, Any]]
) -> BenchmarkMatch:
    best_score = -1
    best_candidate = None
    best_method = MatchMethod.NONE
    best_differences = []

    for cand in candidates:
        if (
            cand.get("currency")
            and item.currency
            and cand.get("currency") != item.currency
        ):
            # Hard constraint: currency must match for MVP (no dynamic conversion)
            continue

        if item.category == ProcurementCategory.SOFTWARE:
            score, method, diffs = evaluate_software_match(item, cand)
        elif item.category == ProcurementCategory.HARDWARE:
            score, method, diffs = evaluate_hardware_match(item, cand)
        else:
            score, method, diffs = evaluate_resource_match(item, cand)

        if score > best_score:
            best_score = score
            best_candidate = cand
            best_method = method
            best_differences = diffs

    match_confidence = best_score if best_score >= 0 else 0

    threshold = float(os.environ.get("MATCH_CONFIDENCE_THRESHOLD", 60))

    if not best_candidate or match_confidence < threshold:
        return BenchmarkMatch(
            match_status=(
                MatchStatus.MANUAL_REVIEW if best_candidate else MatchStatus.NO_MATCH
            ),
            match_method=best_method,
            match_confidence=match_confidence,
            differences=best_differences,
        )

    benchmark_low = best_candidate.get("benchmark_low")
    benchmark_median = best_candidate.get("benchmark_median")
    benchmark_high = best_candidate.get("benchmark_high")
    applied_discount = 0.0

    if item.quantity is not None and best_candidate.get("volume_tiers"):
        for tier in best_candidate.get("volume_tiers"):
            # tier might be a dict if coming from DB, or VolumeTier object if parsed
            min_q = (
                tier.get("min_quantity", 0)
                if isinstance(tier, dict)
                else tier.min_quantity
            )
            max_q = (
                tier.get("max_quantity")
                if isinstance(tier, dict)
                else tier.max_quantity
            )
            disc = (
                tier.get("discount_percentage", 0)
                if isinstance(tier, dict)
                else tier.discount_percentage
            )

            if item.quantity >= min_q and (max_q is None or item.quantity <= max_q):
                applied_discount = disc
                discount_multiplier = 1.0 - (disc / 100.0)
                benchmark_low *= discount_multiplier
                benchmark_median *= discount_multiplier
                benchmark_high *= discount_multiplier
                break

    return BenchmarkMatch(
        match_status=MatchStatus.MATCHED,
        match_method=best_method,
        match_confidence=match_confidence,
        benchmark_record_id=best_candidate.get("id"),
        benchmark_low=benchmark_low,
        benchmark_median=benchmark_median,
        benchmark_high=benchmark_high,
        currency=best_candidate.get("currency"),
        unit=best_candidate.get("unit"),
        applied_discount=applied_discount,
        differences=best_differences,
    )
