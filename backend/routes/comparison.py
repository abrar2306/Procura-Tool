import math
from fastapi import APIRouter, Header, HTTPException
from typing import Any

from backend.repositories.database import get_db
from backend.services.local_store import local_store
from backend.routes.requests import get_review_record

router = APIRouter(prefix='/api/requests', tags=['Comparison'])


def _get_val(item, key, default=0.0):
    val = item.get(key)
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _normalize(desc: str) -> str:
    return (desc or "").lower().strip()


@router.post("/{request_id}/compare")
async def compare_request(request_id: str, x_org_id: str = Header("default-org")):
    # 1. Load review record
    try:
        record = get_review_record(request_id, x_org_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Unable to load request: {exc}")

    # 2. Get v1 and v2 items
    all_items = record.get("extracted_items", [])
    v1_items = [i for i in all_items if int(i.get("document_version") or 1) == 1]
    v2_items = [i for i in all_items if int(i.get("document_version") or 1) > 1]

    # 3. Match items
    unmatched_v2 = v2_items[:]
    matched = []
    removed = []

    for v1_item in v1_items:
        v1_desc = _normalize(v1_item.get("normalized_description") or v1_item.get("raw_description"))
        
        match = None
        # Exact match
        for i, v2_item in enumerate(unmatched_v2):
            v2_desc = _normalize(v2_item.get("normalized_description") or v2_item.get("raw_description"))
            if v1_desc == v2_desc and v1_desc:
                match = unmatched_v2.pop(i)
                break
        
        if not match:
            # Fuzzy match
            for i, v2_item in enumerate(unmatched_v2):
                v2_desc = _normalize(v2_item.get("normalized_description") or v2_item.get("raw_description"))
                if v1_desc and v2_desc and (v1_desc in v2_desc or v2_desc in v1_desc):
                    match = unmatched_v2.pop(i)
                    break
                    
        if match:
            matched.append((v1_item, match))
        else:
            removed.append(v1_item)
            
    added = unmatched_v2

    # 4. Compute comparison result
    result = {
        "matched_items": [],
        "added_in_v2": [],
        "removed_from_v1": [],
        "summary": {
            "v1_total": 0.0,
            "v2_total": 0.0,
            "delta": 0.0,
            "delta_pct": 0.0,
            "items_decreased": 0,
            "items_increased": 0,
            "items_added": len(added),
            "items_removed": len(removed),
            "items_unchanged": 0
        }
    }

    summary = result["summary"]

    for v1_item, v2_item in matched:
        desc = v1_item.get("normalized_description") or v1_item.get("raw_description") or ""
        v1_qty = _get_val(v1_item, "quantity")
        v1_price = _get_val(v1_item, "unit_price")
        v1_total = _get_val(v1_item, "line_total")
        
        v2_qty = _get_val(v2_item, "quantity")
        v2_price = _get_val(v2_item, "unit_price")
        v2_total = _get_val(v2_item, "line_total")
        
        delta = v2_total - v1_total
        delta_pct = (delta / v1_total * 100.0) if v1_total else 0.0
        
        if delta < -0.01:
            status = "decreased"
            summary["items_decreased"] += 1
        elif delta > 0.01:
            status = "increased"
            summary["items_increased"] += 1
        elif abs(v1_qty - v2_qty) > 0.01 or abs(v1_price - v2_price) > 0.01:
            status = "modified"
            summary["items_unchanged"] += 1
        else:
            status = "unchanged"
            summary["items_unchanged"] += 1
            
        result["matched_items"].append({
            "description": desc,
            "v1_quantity": v1_qty,
            "v1_unit_price": v1_price,
            "v1_total": v1_total,
            "v2_quantity": v2_qty,
            "v2_unit_price": v2_price,
            "v2_total": v2_total,
            "delta_total": delta,
            "delta_pct": delta_pct,
            "status": status
        })
        summary["v1_total"] += v1_total
        summary["v2_total"] += v2_total

    for v2_item in added:
        desc = v2_item.get("normalized_description") or v2_item.get("raw_description") or ""
        qty = _get_val(v2_item, "quantity")
        price = _get_val(v2_item, "unit_price")
        total = _get_val(v2_item, "line_total")
        result["added_in_v2"].append({
            "description": desc,
            "quantity": qty,
            "unit_price": price,
            "total": total
        })
        summary["v2_total"] += total

    for v1_item in removed:
        desc = v1_item.get("normalized_description") or v1_item.get("raw_description") or ""
        qty = _get_val(v1_item, "quantity")
        price = _get_val(v1_item, "unit_price")
        total = _get_val(v1_item, "line_total")
        result["removed_from_v1"].append({
            "description": desc,
            "quantity": qty,
            "unit_price": price,
            "total": total
        })
        summary["v1_total"] += total
        
    summary["delta"] = summary["v2_total"] - summary["v1_total"]
    summary["delta_pct"] = (summary["delta"] / summary["v1_total"] * 100.0) if summary["v1_total"] else 0.0

    # 5. Persist to DB
    db = get_db()
    if db:
        try:
            db.table("proposal_comparisons").upsert(
                {
                    "request_id": request_id,
                    "base_document_version": 1,
                    "comparison_document_version": 2,
                    "comparison": result
                },
                on_conflict="request_id,base_document_version,comparison_document_version"
            ).execute()
        except Exception as exc:
            pass 

    # 6. Store on local_store
    if request_id in local_store.requests:
        local_store.requests[request_id]["comparison"] = result
        local_store.save()

    # 7. Return comparison
    return result
