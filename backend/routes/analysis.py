import os
from fastapi import APIRouter, HTTPException, Header
from typing import Dict, Any

from backend.repositories.database import get_db
from backend.services.benchmark_matcher import match_benchmark
from backend.services.scoring import analyze_item, aggregate_score
from backend.services.explanation import generate_explanation
from backend.services.local_store import local_store
from backend.models.extraction import ExtractedItem
from backend.models.procurement import ProcurementCategory, RequestStatus

router = APIRouter(prefix="/api/requests", tags=["Analysis"])

TABLE_MAP = {
    ProcurementCategory.SOFTWARE: "software_pricing",
    ProcurementCategory.HARDWARE: "hardware_pricing",
    ProcurementCategory.RESOURCE: "resource_pricing",
}

KIND_MAP = {
    ProcurementCategory.SOFTWARE: "software",
    ProcurementCategory.HARDWARE: "hardware",
    ProcurementCategory.RESOURCE: "resource",
}


def _match_record(match, item_id: str) -> dict:
    record = match.model_dump(exclude_none=True)
    if "match_status" in record:
        record["match_status"] = record["match_status"].value
    if "match_method" in record:
        record["match_method"] = record["match_method"].value
    if "unit" in record:
        record["unit"] = record["unit"].value
    record["item_id"] = item_id
    return record


def _build_score_record(request_id: str, analyzed_items, match_records, custom_api_key: str = None) -> dict:
    overall, recommendation, breakdown, warnings, reason_codes = aggregate_score(
        analyzed_items
    )
    explanation = generate_explanation(
        {
            "overall_score": overall,
            "recommendation": recommendation.value,
            "breakdown": breakdown.model_dump(),
            "warnings": warnings,
            "reason_codes": reason_codes,
        },
        custom_api_key=custom_api_key
    )
    score_version = os.environ.get("SCORE_VERSION", "mvp-v1")
    return {
        "request_id": request_id,
        "overall_score": overall,
        "recommendation": recommendation.value,
        "score_version": score_version,
        "summary": explanation.executive_summary,
        "negotiation_actions": explanation.negotiation_actions,
        "warnings": warnings,
        "reason_codes": reason_codes,
        "score_breakdown": breakdown.model_dump(),
    }


def _persist_result(db, request_id: str, score_record: dict, match_records) -> None:
    if db:
        db.table("benchmark_matches").insert(match_records).execute()
        db.table("score_results").insert(score_record).execute()
        db.table("procurement_requests").update(
            {"status": RequestStatus.ANALYZED.value}
        ).eq("id", request_id).execute()
    else:
        local_store.matches[request_id] = match_records
        local_store.score_results[request_id].append(score_record)
        record = local_store.requests[request_id]
        record["status"] = RequestStatus.ANALYZED.value
        record["analysis"] = score_record
        local_store.save()


def _analyze_in_memory(request_id: str, x_org_id: str, custom_api_key: str = None) -> None:
    record = local_store.requests.get(request_id)
    if not record or record["organization_id"] != x_org_id:
        raise HTTPException(404, "Request not found or access denied")

    items = [i for i in local_store.items[request_id] if int(i.get("document_version") or 1) == 1]
    if not items:
        raise HTTPException(400, "No items to analyze")

    record["status"] = RequestStatus.ANALYZING.value

    analyzed_items = []
    match_records = []
    for item_dict in items:
        item = ExtractedItem(**item_dict)
        kind = KIND_MAP.get(item.category)
        if not kind:
            continue
        candidates = local_store.catalog[kind]
        if item.currency:
            candidates = [
                c
                for c in candidates
                if not c.get("currency") or c["currency"] == item.currency
            ]
        match = match_benchmark(item, candidates)
        match_records.append(_match_record(match, item.id or ""))
        analyzed_items.append(analyze_item(item, match))

    if not analyzed_items:
        raise HTTPException(400, "No analyzable items")

    score_record = _build_score_record(request_id, analyzed_items, match_records, custom_api_key=custom_api_key)
    _persist_result(None, request_id, score_record, match_records)


@router.post("/{request_id}/analyze")
async def run_analysis(
    request_id: str, 
    x_org_id: str = Header("default-org"),
    x_gemini_api_key: str = Header(None, alias="X-Gemini-Api-Key")
):
    db = get_db()
    if not db:
        try:
            _analyze_in_memory(request_id, x_org_id, custom_api_key=x_gemini_api_key)
        except HTTPException:
            raise
        except Exception as e:
            if request_id in local_store.requests:
                local_store.requests[request_id]["status"] = RequestStatus.FAILED.value
                local_store.save()
            raise HTTPException(500, f"Analysis failed: {str(e)}")
        return {"ok": True}

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
        req_res = (
            db.table("procurement_requests").select("*").eq("id", request_id).execute()
        )
        if not req_res.data:
            db.table("procurement_requests").update(
                {"status": RequestStatus.FAILED.value}
            ).eq("id", request_id).execute()
            raise HTTPException(404, "Request not found")

        items_res = (
            db.table("extracted_items")
            .select("*")
            .eq("request_id", request_id)
            .eq("document_version", 1)
            .execute()
        )
        if not items_res.data:
            raise HTTPException(400, "No extracted items found. Please extract documents or fill in the form first.")

        analyzed_items = []
        match_records = []

        for item_dict in items_res.data:
            item = ExtractedItem(**item_dict)
            table_name = TABLE_MAP.get(item.category)
            if not table_name:
                continue

            query = db.table(table_name).select("*")
            if item.currency:
                query = query.eq("currency", item.currency)
            query = query.limit(500)

            benchmarks_res = query.execute()
            candidates = benchmarks_res.data or []

            match = match_benchmark(item, candidates)
            match_records.append(_match_record(match, item.id or ""))
            analyzed_items.append(analyze_item(item, match))

        if not analyzed_items:
            raise HTTPException(400, "No analyzable items")

        score_record = _build_score_record(request_id, analyzed_items, match_records, custom_api_key=x_gemini_api_key)
        _persist_result(db, request_id, score_record, match_records)

        return {"ok": True}

    except Exception as e:
        try:
            db.table("procurement_requests").update(
                {"status": RequestStatus.FAILED.value}
            ).eq("id", request_id).execute()
        except Exception:
            pass
        raise HTTPException(500, f"Analysis failed: {str(e)}")


@router.get("/{request_id}/analysis")
async def get_analysis(request_id: str, x_org_id: str = Header("default-org")):
    db = get_db()
    if not db:
        record = local_store.requests.get(request_id)
        if not record or record["organization_id"] != x_org_id:
            raise HTTPException(404, "Request not found or access denied")
        scores = local_store.score_results.get(request_id, [])
        if not scores:
            raise HTTPException(404, "Analysis not found")
        return scores[-1]

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