import os
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import List, Dict, Any

from backend.repositories.database import get_db
from backend.services.benchmark_matcher import match_benchmark
from backend.services.scoring import analyze_item, aggregate_score
from backend.services.explanation import generate_explanation
from backend.models.extraction import ExtractedItem
from backend.models.procurement import ProcurementCategory, RequestStatus

router = APIRouter(prefix="/api/requests", tags=["Analysis"])


@router.post("/{request_id}/analyze")
async def run_analysis(request_id: str, x_org_id: str = Header("default-org")):
    db = get_db()
    if not db:
        return {"ok": True, "message": "Mock analysis done"}

    # Verify authorization
    try:
        req_check = (
            db.table("procurement_requests")
            .select("id")
            .eq("id", request_id)
            .eq("organization_id", x_org_id)
            .execute()
        )
        if not req_check.data:
            raise HTTPException(404, "Request not found or access denied")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, "Database error during authorization check")

    try:
        db.table("procurement_requests").update(
            {"status": RequestStatus.ANALYZING.value}
        ).eq("id", request_id).execute()
    except Exception as e:
        raise HTTPException(500, "Failed to update status")

    try:
        # Get request
        req_res = (
            db.table("procurement_requests").select("*").eq("id", request_id).execute()
        )
        if not req_res.data:
            db.table("procurement_requests").update(
                {"status": RequestStatus.FAILED.value}
            ).eq("id", request_id).execute()
            raise HTTPException(404, "Request not found")
        req = req_res.data[0]

        # Get items
        items_res = (
            db.table("extracted_items")
            .select("*")
            .eq("request_id", request_id)
            .execute()
        )
        if not items_res.data:
            db.table("procurement_requests").update(
                {"status": RequestStatus.FAILED.value}
            ).eq("id", request_id).execute()
            raise HTTPException(400, "No items to analyze")

        analyzed_items = []
        match_records_to_insert = []

        # For each item, fetch benchmarks and match
        for item_dict in items_res.data:
            item = ExtractedItem(**item_dict)

            table_map = {
                ProcurementCategory.SOFTWARE: "software_pricing",
                ProcurementCategory.HARDWARE: "hardware_pricing",
                ProcurementCategory.RESOURCE: "resource_pricing",
            }
            table_name = table_map.get(item.category)
            if not table_name:
                continue

            query = db.table(table_name).select("*")

            # Push filtering to the database to prevent catastrophic fetching
            if item.currency:
                query = query.eq("currency", item.currency)

            # If we have SKU or normalized description, we can try to filter further,
            # but to ensure we don't crash, we'll at least limit the records.
            # Using limit to prevent full table load if currency filter isn't restrictive enough.
            query = query.limit(500)

            benchmarks_res = query.execute()
            candidates = benchmarks_res.data or []

            # Now we do the heavy matching locally on a limited candidate set
            match = match_benchmark(item, candidates)

            # Prepare match record for bulk insertion
            match_record = match.model_dump(exclude_none=True)
            if "match_status" in match_record:
                match_record["match_status"] = match_record["match_status"].value
            if "match_method" in match_record:
                match_record["match_method"] = match_record["match_method"].value
            if "unit" in match_record:
                match_record["unit"] = match_record["unit"].value
            match_record["item_id"] = item.id
            match_records_to_insert.append(match_record)

            ai = analyze_item(item, match)
            analyzed_items.append(ai)

        # Bulk Insert match records
        if match_records_to_insert:
            db.table("benchmark_matches").insert(match_records_to_insert).execute()

        # Aggregate score
        overall, recommendation, breakdown, warnings, reason_codes = aggregate_score(
            analyzed_items
        )

        # Generate Explanation
        analysis_data_for_prompt = {
            "overall_score": overall,
            "recommendation": recommendation.value,
            "breakdown": breakdown.model_dump(),
            "warnings": warnings,
            "reason_codes": reason_codes,
        }
        explanation = generate_explanation(analysis_data_for_prompt)

        # Save score result
        score_version = os.environ.get("SCORE_VERSION", "mvp-v1")
        score_record = {
            "request_id": request_id,
            "overall_score": overall,
            "recommendation": recommendation.value,
            "score_version": score_version,
            "summary": explanation.executive_summary,
            "score_breakdown": breakdown.model_dump(),
        }
        db.table("score_results").insert(score_record).execute()

        db.table("procurement_requests").update(
            {"status": RequestStatus.ANALYZED.value}
        ).eq("id", request_id).execute()

        return {"ok": True}

    except Exception as e:
        # Rollback status to failed if analysis crashes
        try:
            db.table("procurement_requests").update(
                {"status": RequestStatus.FAILED.value}
            ).eq("id", request_id).execute()
        except:
            pass
        raise HTTPException(500, f"Analysis failed: {str(e)}")


@router.get("/{request_id}/analysis")
async def get_analysis(request_id: str, x_org_id: str = Header("default-org")):
    db = get_db()
    if not db:
        raise HTTPException(500, "DB not configured")

    try:
        # Verify access
        req_check = (
            db.table("procurement_requests")
            .select("id")
            .eq("id", request_id)
            .eq("organization_id", x_org_id)
            .execute()
        )
        if not req_check.data:
            raise HTTPException(404, "Request not found or access denied")

        score_res = (
            db.table("score_results")
            .select("*")
            .eq("request_id", request_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if not score_res.data:
            raise HTTPException(404, "Analysis not found")

        return score_res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))
