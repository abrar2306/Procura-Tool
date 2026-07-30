import os
import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from backend.repositories.database import get_db

router = APIRouter(prefix="/api/catalog", tags=["Catalog"])


@router.get("/{kind}")
async def list_catalog(kind: str, x_org_id: str = Header("default-org")):
    db = get_db()
    if not db:
        return []

    table_map = {
        "software": "software_pricing",
        "hardware": "hardware_pricing",
        "resource": "resource_pricing",
    }
    table_name = table_map.get(kind.lower())
    if not table_name:
        raise HTTPException(400, "Invalid catalog kind")

    try:
        res = db.table(table_name).select("*").eq("organization_id", x_org_id).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(500, f"Error fetching catalog: {str(e)}")


@router.post("/{kind}")
async def add_catalog_row(
    kind: str, payload: dict, x_org_id: str = Header("default-org")
):
    db = get_db()
    if not db:
        return {"id": str(uuid.uuid4()), **payload}

    table_map = {
        "software": "software_pricing",
        "hardware": "hardware_pricing",
        "resource": "resource_pricing",
    }
    table_name = table_map.get(kind.lower())
    if not table_name:
        raise HTTPException(400, "Invalid catalog kind")

    try:
        record = {**payload, "organization_id": x_org_id}
        if "id" not in record:
            record["id"] = str(uuid.uuid4())

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
    db = get_db()
    if not db:
        return {"ok": True}

    table_map = {
        "software": "software_pricing",
        "hardware": "hardware_pricing",
        "resource": "resource_pricing",
    }
    table_name = table_map.get(kind.lower())
    if not table_name:
        raise HTTPException(400, "Invalid catalog kind")

    try:
        db.table(table_name).delete().eq("id", row_id).eq(
            "organization_id", x_org_id
        ).execute()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(500, f"Error deleting catalog row: {str(e)}")
