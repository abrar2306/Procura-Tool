"""Request, upload and extraction endpoints.

The public shape in this module is intentionally the frontend review shape.
The database uses procurement terminology, but clients should not need to know
about storage names or enum casing.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional
import os
import tempfile
import uuid

from fastapi import APIRouter, File, Header, HTTPException, Query, UploadFile
from pydantic import BaseModel, ConfigDict, Field

from backend.models.extraction import ExtractedItem
from backend.models.procurement import ProcurementCategory, RequestStatus
from backend.repositories.database import get_db
from backend.services.document_parser import extract_text_from_file
from backend.services.gemini_extractor import extract_procurement_data
from backend.services.local_store import local_store
from backend.services.normalization import normalize_item

router = APIRouter(prefix="/api/requests", tags=["Requests"])


class CreateRequestPayload(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    category: ProcurementCategory
    supplier_name: Optional[str] = None
    currency: Optional[str] = None
    quoted_total: Optional[float] = Field(default=None, ge=0)
    form_data: dict[str, Any] = Field(default_factory=dict)
    organization_id: Optional[str] = None
    created_by: Optional[str] = None


class UpdateRequestPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Optional[str] = Field(default=None, min_length=1, max_length=300)
    supplier_name: Optional[str] = None
    currency: Optional[str] = None
    quoted_total: Optional[float] = Field(default=None, ge=0)
    form_data: Optional[dict[str, Any]] = None


class BulkDeletePayload(BaseModel):
    ids: list[str] = Field(min_length=1)


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def ui_status(value: Any) -> str:
    """Support records created by the previous uppercase-status backend."""
    status = str(value or "draft").lower()
    return {"failed": "error", "review_required": "ready_for_analysis"}.get(
        status, status
    )


def db_status(value: str) -> str:
    return value.lower()


def _document_view(document: dict[str, Any]) -> dict[str, Any]:
    result = dict(document)
    result["filename"] = result.get("filename") or result.get("file_name")
    result["file_name"] = result["filename"]
    result["size"] = result.get("file_size_bytes") or result.get("size") or 0
    return result


def review_view(record: dict[str, Any]) -> dict[str, Any]:
    result = dict(record)
    result["status"] = ui_status(result.get("status"))
    result["category"] = result.get("category")
    result["form_data"] = result.get("form_data") or {}
    docs = [_document_view(d) for d in result.get("documents", [])]
    result["documents"] = [d for d in docs if int(d.get("document_version") or 1) == 1]
    result["documents_v2"] = [
        d for d in docs if int(d.get("document_version") or 1) > 1
    ]
    all_items = result.get("extracted_items") or []
    result["extracted_items"] = [i for i in all_items if int(i.get("document_version") or 1) == 1]
    result["extracted_items_v2"] = [i for i in all_items if int(i.get("document_version") or 1) > 1]
    result["extracted_data"] = result["extracted_items"]
    if not result.get("analysis") and result.get("score_results"):
        result["analysis"] = sorted(
            result["score_results"], key=lambda x: x.get("created_at", ""), reverse=True
        )[0]
    if result.get("analysis"):
        result["analysis"] = dict(result["analysis"])
        result["analysis"]["overall_procurement_score"] = result["analysis"].get(
            "overall_score"
        )
        result["analysis"].setdefault("flags", result["analysis"].get("warnings", []))
    return result


def _local_review_or_404(request_id: str) -> dict[str, Any]:
    record = local_store.requests.get(request_id)
    if not record:
        raise HTTPException(404, "Request not found")
    record = local_store.clone(record)
    record["documents"] = local_store.clone(local_store.documents[request_id])
    record["extracted_items"] = local_store.clone(local_store.items[request_id])
    return record


def _request_for_db(db: Any, request_id: str, org_id: str) -> dict[str, Any]:
    response = (
        db.table("procurement_requests")
        .select("*,documents(*),extracted_items(*),score_results(*)")
        .eq("id", request_id)
        .eq("organization_id", org_id)
        .execute()
    )
    if not response.data:
        raise HTTPException(404, "Request not found")
    return response.data[0]


def get_review_record(request_id: str, org_id: str) -> dict[str, Any]:
    db = get_db()
    if not db:
        return _local_review_or_404(request_id)
    try:
        return _request_for_db(db, request_id, org_id)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Unable to load request: {exc}") from exc


def _form_item(request_id: str, request: dict[str, Any]) -> dict[str, Any] | None:
    data = request.get("form_data") or {}
    if not any(data.values()):
        return None
    category = request.get("procurement_category") or request.get("category")
    quantity = _number(data.get("quantity"))
    total = _number(data.get("total_price"))
    duration = _number(data.get("contract_duration"))
    unit_price = (
        total / quantity if total is not None and quantity and quantity > 0 else None
    )
    return {
        "id": str(uuid.uuid4()),
        "request_id": request_id,
        "category": category,
        "raw_description": data.get("product_name")
        or data.get("project_name")
        or request.get("title"),
        "normalized_description": data.get("product_name"),
        "manufacturer": data.get("oem"),
        "product_name": data.get("product_name"),
        "sku": data.get("sku"),
        "quantity": quantity,
        "duration": duration,
        "unit_price": unit_price,
        "line_total": total,
        "currency": data.get("currency") or request.get("currency"),
        "billing_unit": "MONTH" if duration else "EACH",
        "attributes": data,
        "user_verified": True,
    }


def _number(value: Any) -> float | None:
    try:
        return float(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None


@router.post("")
async def create_request(
    payload: CreateRequestPayload,
    x_org_id: str = Header("default-org"),
    x_user_id: str = Header("user-1"),
):
    request_id = str(uuid.uuid4())
    record = {
        "id": request_id,
        "title": payload.title or f"{payload.category.value.title()} Procurement Review",
        "category": payload.category.value,
        "supplier_name": payload.supplier_name,
        "currency": payload.currency,
        "quoted_total": payload.quoted_total,
        "form_data": payload.form_data,
        "organization_id": payload.organization_id or x_org_id,
        "created_by": payload.created_by or x_user_id,
        "status": db_status(RequestStatus.DRAFT.value),
        "created_at": now(),
        "updated_at": now(),
    }
    db = get_db()
    if not db:
        local_store.requests[request_id] = local_store.clone(record)
        local_store.save()
        return review_view(_local_review_or_404(request_id))
    try:
        result = (
            db.table("procurement_requests")
            .insert(
                {
                    k: v
                    for k, v in record.items()
                    if k not in {"id", "created_at", "updated_at"}
                }
            )
            .execute()
        )
        return review_view(result.data[0])
    except Exception as exc:
        raise HTTPException(500, f"Unable to create request: {exc}") from exc


@router.get("")
async def list_requests(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    x_org_id: str = Header("default-org"),
):
    db = get_db()
    if not db:
        records = [
            r for r in local_store.requests.values() if r["organization_id"] == x_org_id
        ]
        records.sort(key=lambda r: r.get("created_at", ""), reverse=True)
        return [
            review_view(_local_review_or_404(r["id"]))
            for r in records[offset : offset + limit]
        ]
    try:
        result = (
            db.table("procurement_requests")
            .select("*,score_results(overall_score)")
            .eq("organization_id", x_org_id)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return [review_view(row) for row in result.data]
    except Exception as exc:
        raise HTTPException(500, f"Unable to list requests: {exc}") from exc


@router.get("/{request_id}")
async def get_request(request_id: str, x_org_id: str = Header("default-org")):
    return review_view(get_review_record(request_id, x_org_id))


@router.patch("/{request_id}")
async def update_request(
    request_id: str,
    payload: UpdateRequestPayload,
    x_org_id: str = Header("default-org"),
):
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        return review_view(get_review_record(request_id, x_org_id))
    updates["updated_at"] = now()
    db = get_db()
    if not db:
        record = local_store.requests.get(request_id)
        if not record or record["organization_id"] != x_org_id:
            raise HTTPException(404, "Request not found")
        record.update(updates)
        local_store.save()
        return review_view(_local_review_or_404(request_id))
    try:
        result = (
            db.table("procurement_requests")
            .update(updates)
            .eq("id", request_id)
            .eq("organization_id", x_org_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(404, "Request not found")
        return review_view(get_review_record(request_id, x_org_id))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Unable to update request: {exc}") from exc


@router.delete("/bulk")
async def bulk_delete_requests(
    payload: BulkDeletePayload, x_org_id: str = Header("default-org")
):
    db = get_db()
    if not db:
        deleted_count = 0
        for req_id in payload.ids:
            record = local_store.requests.get(req_id)
            if record and record["organization_id"] == x_org_id:
                del local_store.requests[req_id]
                local_store.documents.pop(req_id, None)
                local_store.items.pop(req_id, None)
                local_store.messages.pop(req_id, None)
                deleted_count += 1
        if deleted_count > 0:
            local_store.save()
        return {"ok": True, "deleted": deleted_count}
    
    try:
        result = (
            db.table("procurement_requests")
            .delete()
            .in_("id", payload.ids)
            .eq("organization_id", x_org_id)
            .execute()
        )
        return {"ok": True, "deleted": len(result.data)}
    except Exception as exc:
        raise HTTPException(500, f"Unable to delete requests: {exc}") from exc


@router.delete("/{request_id}")
async def delete_request(request_id: str, x_org_id: str = Header("default-org")):
    db = get_db()
    if not db:
        record = local_store.requests.get(request_id)
        if not record or record["organization_id"] != x_org_id:
            raise HTTPException(404, "Request not found")
        del local_store.requests[request_id]
        local_store.documents.pop(request_id, None)
        local_store.items.pop(request_id, None)
        local_store.messages.pop(request_id, None)
        local_store.save()
        return {"ok": True}
    try:
        result = (
            db.table("procurement_requests")
            .delete()
            .eq("id", request_id)
            .eq("organization_id", x_org_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(404, "Request not found")
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Unable to delete request: {exc}") from exc


@router.post("/{request_id}/documents")
async def upload_document(
    request_id: str,
    files: list[UploadFile] = File(...),
    x_org_id: str = Header("default-org"),
):
    request = get_review_record(request_id, x_org_id)
    db = get_db()
    version = 2 if request.get("analysis") else 1
    documents: list[dict[str, Any]] = []
    for upload in files:
        if not upload.filename:
            raise HTTPException(422, "A file name is required")
        contents = await upload.read()
        doc = {
            "id": str(uuid.uuid4()),
            "request_id": request_id,
            "file_name": upload.filename,
            "mime_type": upload.content_type,
            "file_size_bytes": len(contents),
            "document_version": version,
            "created_at": now(),
        }
        if db:
            path = f"{x_org_id}/{request_id}/{doc['id']}/{upload.filename}"
            doc.update(
                {"storage_bucket": "procurement-documents", "storage_path": path}
            )
            try:
                db.storage.from_("procurement-documents").upload(path, contents)
                stored = db.table("documents").insert(doc).execute()
                doc = stored.data[0]
            except Exception as exc:
                try:
                    db.storage.from_("procurement-documents").remove([path])
                except Exception:
                    pass
                raise HTTPException(
                    500, f"Unable to store {upload.filename}: {exc}"
                ) from exc
    else:
        doc["storage_path"] = doc["id"]
        local_store.files[doc["id"]] = contents
        local_store.documents[request_id].append(doc)
        local_store.save()
        documents.append(_document_view(doc))
    if db:
        db.table("procurement_requests").update(
            {"status": RequestStatus.UPLOADED.value}
        ).eq("id", request_id).eq("organization_id", x_org_id).execute()
    else:
        local_store.requests[request_id]["status"] = RequestStatus.UPLOADED.value
        local_store.save()
    return {"ok": True, "documents": documents}


@router.delete("/{request_id}/documents/{document_id}")
async def delete_document(
    request_id: str, 
    document_id: str, 
    x_org_id: str = Header("default-org")
):
    db = get_db()
    if db:
        # 1. Manually delete extracted items for this document to clear the data
        db.table("extracted_items").delete().eq("document_id", document_id).execute()
        
        # 2. Get storage path to delete from Supabase storage
        doc_res = db.table("documents").select("storage_bucket, storage_path").eq("id", document_id).execute()
        if doc_res.data:
            doc = doc_res.data[0]
            try:
                db.storage.from_(doc["storage_bucket"]).remove([doc["storage_path"]])
            except Exception:
                pass
                
        # 3. Delete document record (cascade will handle other constraints if any)
        db.table("documents").delete().eq("id", document_id).execute()
    else:
        docs = local_store.documents.get(request_id, [])
        local_store.documents[request_id] = [d for d in docs if d["id"] != document_id]
        if document_id in local_store.files:
            del local_store.files[document_id]
        
        items = local_store.items.get(request_id, [])
        local_store.items[request_id] = [i for i in items if i.get("document_id") != document_id]
        local_store.save()

    return {"ok": True}

def _fallback_item(
    request_id: str, document_id: str, filename: str, text: str, category: str, document_version: int = 1
) -> dict[str, Any]:
    # A usable deterministic fallback for textual documents when no AI key is
    # configured. It avoids fabricating commercial values.
    description = next(
        (line.strip() for line in text.splitlines() if line.strip()), filename
    )
    return {
        "id": str(uuid.uuid4()),
        "request_id": request_id,
        "document_id": document_id,
        "document_version": document_version,
        "category": category,
        "raw_description": description[:1000],
        "normalized_description": description[:1000],
        "attributes": {"extraction": "local_fallback"},
        "user_verified": False,
        "extraction_confidence": 0.0,
    }


@router.post("/{request_id}/extract")
async def extract_data(
    request_id: str, 
    x_org_id: str = Header("default-org"),
    x_gemini_api_key: Optional[str] = Header(None, alias="X-Gemini-Api-Key")
):
    request = get_review_record(request_id, x_org_id)
    db = get_db()
    
    docs_v2 = request.get("documents_v2", [])
    doc_version = 2 if docs_v2 else 1
    documents = docs_v2 if docs_v2 else request.get("documents", [])
    
    if not documents:
        raise HTTPException(400, "No documents found for request")
    if db:
        db.table("procurement_requests").update(
            {"status": RequestStatus.EXTRACTING.value}
        ).eq("id", request_id).execute()
    else:
        local_store.requests[request_id]["status"] = RequestStatus.EXTRACTING.value
        local_store.save()
    records: list[dict[str, Any]] = []
    for document in documents:
        temp_path = None
        try:
            if db:
                raw = db.storage.from_(document["storage_bucket"]).download(
                    document["storage_path"]
                )
            else:
                raw = local_store.files.get(document["id"])
                if raw is None:
                    continue
            with tempfile.NamedTemporaryFile(
                delete=False, suffix=os.path.splitext(document["file_name"])[1]
            ) as temp:
                temp.write(raw)
                temp_path = temp.name
            text = extract_text_from_file(document["file_name"], temp_path)
            ai_items = (
                extract_procurement_data(f"### FILE: {document['file_name']}\n{text}", custom_api_key=x_gemini_api_key)
                if text
                else []
            )
            if not ai_items:
                records.append(
                    _fallback_item(
                        request_id,
                        document["id"],
                        document["file_name"],
                        text,
                        request.get("procurement_category") or request.get("category"),
                        document_version=doc_version
                    )
                )
            for item in ai_items:
                item.request_id = request_id
                item.document_id = document["id"]
                item = normalize_item(item)
                record = item.model_dump(exclude_none=True)
                record["id"] = record.get("id") or str(uuid.uuid4())
                record["document_version"] = doc_version
                for field in ("category", "billing_unit"):
                    if getattr(record.get(field), "value", None):
                        record[field] = record[field].value
                records.append(record)
        finally:
            if temp_path and os.path.exists(temp_path):
                os.unlink(temp_path)
    if db:
        try:
            db.table("extracted_items").delete().eq("request_id", request_id).eq("document_version", doc_version).execute()
            if records:
                db.table("extracted_items").insert(records).execute()
            db.table("procurement_requests").update(
                {"status": RequestStatus.READY_FOR_ANALYSIS.value}
            ).eq("id", request_id).execute()
        except Exception as exc:
            db.table("procurement_requests").update(
                {"status": RequestStatus.FAILED.value, "analysis_error": str(exc)}
            ).eq("id", request_id).execute()
            raise HTTPException(500, f"Extraction failed: {exc}") from exc
    else:
        local_store.items[request_id] = [i for i in local_store.items.get(request_id, []) if int(i.get("document_version") or 1) != doc_version] + records
        local_store.requests[request_id][
            "status"
        ] = RequestStatus.READY_FOR_ANALYSIS.value
        local_store.save()
    return review_view(get_review_record(request_id, x_org_id))


@router.patch("/{request_id}/items/{item_id}")
async def update_item(
    request_id: str,
    item_id: str,
    updates: dict[str, Any],
    x_org_id: str = Header("default-org"),
):
    get_review_record(request_id, x_org_id)
    updates = {
        k: v for k, v in updates.items() if k not in {"id", "request_id", "created_at"}
    }
    updates["user_verified"] = True
    db = get_db()
    if not db:
        for item in local_store.items[request_id]:
            if item["id"] == item_id:
                item.update(updates)
                local_store.save()
                return item
        raise HTTPException(404, "Item not found")
    try:
        result = (
            db.table("extracted_items")
            .update(updates)
            .eq("id", item_id)
            .eq("request_id", request_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(404, "Item not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"Unable to update item: {exc}") from exc
