import uuid
from fastapi import APIRouter, HTTPException, Header
from backend.repositories.database import get_db
from backend.services.local_store import local_store

router = APIRouter(prefix="/api/catalog", tags=["Catalog"])

TABLE_MAP = {
    "software": "software_pricing",
    "hardware": "hardware_pricing",
    "resource": "resource_pricing",
}


def _valid_kind(kind: str) -> str:
    key = kind.lower()
    if key not in TABLE_MAP:
        raise HTTPException(400, "Invalid catalog kind")
    return key


@router.get("/{kind}")
async def list_catalog(kind: str, x_org_id: str = Header("default-org")):
    key = _valid_kind(kind)
    db = get_db()
    if not db:
        return [
            r for r in local_store.catalog[key] if r.get("organization_id") == x_org_id
        ]
    table_name = TABLE_MAP[key]
    try:
        res = db.table(table_name).select("*").eq("organization_id", x_org_id).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(500, f"Error fetching catalog: {str(e)}")


@router.post("/{kind}")
async def add_catalog_row(
    kind: str, payload: dict, x_org_id: str = Header("default-org")
):
    key = _valid_kind(kind)
    db = get_db()

    record = {**payload, "organization_id": x_org_id}
    if "id" not in record:
        record["id"] = str(uuid.uuid4())

    if not db:
        local_store.catalog[key].append(record)
        local_store.save()
        return record

    table_name = TABLE_MAP[key]
    try:
        res = db.table(table_name).insert(record).execute()
        if res.data:
            return res.data[0]
        return record
    except Exception as e:
        raise HTTPException(500, f"Error adding catalog row: {str(e)}")


@router.delete("/{kind}/{row_id}")
async def delete_catalog_row(
    kind: str, row_id: str, x_org_id: str = Header("default-org")
):
    key = _valid_kind(kind)
    db = get_db()
    if not db:
        local_store.catalog[key] = [
            r
            for r in local_store.catalog[key]
            if r.get("id") != row_id or r.get("organization_id") != x_org_id
        ]
        local_store.save()
        return {"ok": True}

    table_name = TABLE_MAP[key]
    try:
        db.table(table_name).delete().eq("id", row_id).eq(
            "organization_id", x_org_id
        ).execute()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(500, f"Error deleting catalog row: {str(e)}")