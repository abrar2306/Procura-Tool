import os
from typing import List
from backend.models.extraction import ExtractedItem
from backend.models.benchmark import BenchmarkMatch, MatchStatus
from backend.models.scoring import (
    AnalyzedItem,
    Recommendation,
    ScoreBreakdown,
    ScoreComponent,
)


def _lerp(x: float, x0: float, x1: float, y0: float, y1: float) -> float:
    if x1 == x0:
        return y0
    return y0 + (x - x0) * (y1 - y0) / (x1 - x0)


def calculate_price_score(
    quote: float, low: float, median: float, high: float
) -> float:
    if quote <= low:
        # Quote <= benchmark low: 58-60 points
        if low == 0:
            return 60
        # Give 60 for 75% of low or lower, 58 at exactly low
        x0 = low * 0.75
        if quote <= x0:
            return 60.0
        return _lerp(quote, x0, low, 60.0, 58.0)
    elif quote <= median:
        # Between benchmark low and median: 50-57 points
        return _lerp(quote, low, median, 57.0, 50.0)
    elif quote <= high:
        # Between benchmark median and high: 35-49 points
        return _lerp(quote, median, high, 49.0, 35.0)
    elif quote <= high * 1.15:
        # Between high and 115% of high: 15-34 points
        return _lerp(quote, high, high * 1.15, 34.0, 15.0)
    else:
        # Above 115% of benchmark high: 0-14 points
        return max(0.0, _lerp(quote, high * 1.15, high * 1.5, 14.0, 0.0))


def analyze_item(item: ExtractedItem, match: BenchmarkMatch) -> AnalyzedItem:
    warnings = []

    # completeness
    completeness_score = 10.0
    critical_fields = [
        item.normalized_description or item.raw_description,
        item.quantity,
        item.billing_unit,
        item.unit_price,
        item.currency,
    ]
    if item.category.value == "RESOURCE" or item.category.value == "SOFTWARE":
        critical_fields.append(item.duration)

    missing_count = sum(1 for f in critical_fields if f is None)
    completeness_score -= missing_count * 2.5
    completeness_score = max(0.0, completeness_score)
    if missing_count > 0:
        warnings.append(f"Missing {missing_count} critical completeness fields.")

    # consistency
    consistency_score = 10.0
    if (
        item.quantity is not None
        and item.unit_price is not None
        and item.line_total is not None
    ):
        dur = item.duration if item.duration else 1.0
        expected = item.quantity * item.unit_price * dur
        tolerance = float(os.environ.get("ARITHMETIC_TOLERANCE_PERCENT", 2)) / 100.0
        diff = abs(expected - item.line_total)
        if expected > 0 and diff / expected > tolerance:
            consistency_score = 0.0
            warnings.append(
                f"Arithmetic mismatch: expected ~{expected}, found {item.line_total}"
            )
    elif item.line_total is None:
        consistency_score = 5.0  # partial deduction for missing total

    # price score and match confidence
    price_score = 0.0
    confidence_score = 0.0

    if match.match_status == MatchStatus.MATCHED:
        confidence_score = (match.match_confidence / 100.0) * 20.0
        if item.unit_price is not None:
            if match.currency != item.currency or match.unit != item.billing_unit:
                warnings.append(
                    "Currency or billing unit mismatch with benchmark. Manual review required."
                )
            else:
                price_score = calculate_price_score(
                    item.unit_price,
                    match.benchmark_low,
                    match.benchmark_median,
                    match.benchmark_high,
                )
                if item.unit_price < match.benchmark_low * 0.75:
                    warnings.append("LOW_PRICE_SCOPE_RISK")
    else:
        warnings.append("No reliable benchmark match.")

    # overrides
    extraction_threshold = float(
        os.environ.get("EXTRACTION_CONFIDENCE_THRESHOLD", 0.75)
    )
    if item.extraction_confidence and item.extraction_confidence < extraction_threshold:
        warnings.append("Low extraction confidence.")

    total = price_score + confidence_score + completeness_score + consistency_score

    # if major issues, flag
    if (
        match.match_status != MatchStatus.MATCHED
        or match.match_confidence < 60
        or consistency_score == 0.0
        or missing_count > 0
    ):
        # force review
        pass  # we handle final status in the aggregate score, but item-level we can just pass the score

    return AnalyzedItem(
        extracted_item=item, benchmark_match=match, item_score=total, warnings=warnings
    )


def aggregate_score(
    analyzed_items: List[AnalyzedItem],
) -> tuple[float, Recommendation, ScoreBreakdown, List[str], List[str]]:
    if not analyzed_items:
        return (
            0,
            Recommendation.REVIEW_REQUIRED,
            ScoreBreakdown(),
            [],
            ["No items extracted."],
        )

    total_price = 0.0
    total_conf = 0.0
    total_comp = 0.0
    total_cons = 0.0

    all_warnings = []
    reason_codes = []

    requires_review = False

    for ai in analyzed_items:
        all_warnings.extend(ai.warnings)

        if (
            ai.benchmark_match.match_status != MatchStatus.MATCHED
            or ai.benchmark_match.match_confidence < 60
        ):
            requires_review = True
            reason_codes.append("NO_RELIABLE_BENCHMARK")

        if "Currency or billing unit mismatch" in ai.warnings:
            requires_review = True
            reason_codes.append("UNIT_MISMATCH")

        if "Missing" in "".join(ai.warnings):
            requires_review = True
            reason_codes.append("MISSING_CRITICAL_FIELD")

        if "Arithmetic mismatch" in "".join(ai.warnings):
            requires_review = True
            reason_codes.append("ARITHMETIC_FAILURE")

        if "Low extraction confidence" in ai.warnings:
            requires_review = True
            reason_codes.append("LOW_EXTRACTION_CONFIDENCE")

        if "LOW_PRICE_SCOPE_RISK" in ai.warnings:
            reason_codes.append("LOW_PRICE_SCOPE_RISK")

        # In a real system, we might volume-weight the scores by line_total.
        # For MVP, we average the scores if there are multiple items.

        # We need to re-calculate breakdown components to return a clean ScoreBreakdown.
        # This requires re-evaluating the component scores for the aggregate.
        # For simplicity, we just average the underlying components.

        # We didn't store individual components on AnalyzedItem in the model, let's derive them:
        # Wait, the prompt says: calculate score deterministic. We can recalculate or just average.

    # Recalculate average components:
    n = len(analyzed_items)
    for ai in analyzed_items:
        # We have to reverse engineer or just re-calculate
        pass

    # Better to just do it simply for MVP
    # Let's adjust AnalyzedItem to include breakdown, wait I didn't add it to the model.
    # I'll just re-evaluate here for the aggregate:

    agg_price = 0
    agg_conf = 0
    agg_comp = 0
    agg_cons = 0

    for ai in analyzed_items:
        # completeness
        critical_fields = [
            ai.extracted_item.normalized_description
            or ai.extracted_item.raw_description,
            ai.extracted_item.quantity,
            ai.extracted_item.billing_unit,
            ai.extracted_item.unit_price,
            ai.extracted_item.currency,
        ]
        if ai.extracted_item.category.value in ("RESOURCE", "SOFTWARE"):
            critical_fields.append(ai.extracted_item.duration)
        missing_count = sum(1 for f in critical_fields if f is None)
        agg_comp += max(0.0, 10.0 - (missing_count * 2.5))

        # consistency
        c_score = 10.0
        if (
            ai.extracted_item.quantity is not None
            and ai.extracted_item.unit_price is not None
            and ai.extracted_item.line_total is not None
        ):
            dur = ai.extracted_item.duration if ai.extracted_item.duration else 1.0
            expected = ai.extracted_item.quantity * ai.extracted_item.unit_price * dur
            tolerance = float(os.environ.get("ARITHMETIC_TOLERANCE_PERCENT", 2)) / 100.0
            diff = abs(expected - ai.extracted_item.line_total)
            if expected > 0 and diff / expected > tolerance:
                c_score = 0.0
        elif ai.extracted_item.line_total is None:
            c_score = 5.0
        agg_cons += c_score

        # match and price
        if ai.benchmark_match.match_status == MatchStatus.MATCHED:
            agg_conf += (ai.benchmark_match.match_confidence / 100.0) * 20.0
            if (
                ai.extracted_item.unit_price is not None
                and ai.benchmark_match.currency == ai.extracted_item.currency
                and ai.benchmark_match.unit == ai.extracted_item.billing_unit
            ):
                agg_price += calculate_price_score(
                    ai.extracted_item.unit_price,
                    ai.benchmark_match.benchmark_low,
                    ai.benchmark_match.benchmark_median,
                    ai.benchmark_match.benchmark_high,
                )

    agg_price /= n
    agg_conf /= n
    agg_comp /= n
    agg_cons /= n

    overall_score = agg_price + agg_conf + agg_comp + agg_cons
    overall_score = round(overall_score, 1)

    if requires_review:
        recommendation = Recommendation.REVIEW_REQUIRED
    else:
        if overall_score >= 85:
            recommendation = Recommendation.COMMERCIALLY_FAVORABLE
        elif overall_score >= 70:
            recommendation = Recommendation.NEGOTIATE
        elif overall_score >= 50:
            recommendation = Recommendation.REVIEW_REQUIRED
        else:
            recommendation = Recommendation.ESCALATE

    breakdown = ScoreBreakdown(
        price=ScoreComponent(score=round(agg_price, 1), maximum=60),
        benchmark_confidence=ScoreComponent(score=round(agg_conf, 1), maximum=20),
        completeness=ScoreComponent(score=round(agg_comp, 1), maximum=10),
        consistency=ScoreComponent(score=round(agg_cons, 1), maximum=10),
    )

    # deduplicate
    reason_codes = list(set(reason_codes))
    seen = set()
    unique_warnings = []
    for w in all_warnings:
        key = str(w).strip()
        if key and key not in seen:
            seen.add(key)
            unique_warnings.append(w)

    return overall_score, recommendation, breakdown, unique_warnings, reason_codes
