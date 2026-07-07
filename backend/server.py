from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import StreamingResponse, Response
from dotenv import load_dotenv
import asyncio
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import json
import re
import logging
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

import pdfplumber
from docx import Document as DocxDocument
from openpyxl import load_workbook

from emergentintegrations.llm.chat import (
    LlmChat, UserMessage, TextDelta, StreamDone
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
LLM_PROVIDER = "anthropic"
LLM_MODEL = "claude-sonnet-4-5-20250929"

app = FastAPI(title="IT Procurement Advisory API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============================================================
# Models
# ============================================================

class ReviewCreate(BaseModel):
    procurement_type: str  # "software" | "hardware"
    category: str
    client_name: Optional[str] = None
    project_name: Optional[str] = None

class ReviewUpdate(BaseModel):
    model_config = ConfigDict(extra="allow")
    form_data: Optional[Dict[str, Any]] = None
    extracted_data: Optional[Dict[str, Any]] = None

class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ChatRequest(BaseModel):
    message: str

# ============================================================
# Benchmark seed data (resource cost / market rates per role - USD monthly)
# ============================================================
RESOURCE_BENCHMARKS = {
    "Project Manager":       {"junior": 6500,  "mid": 9500,  "senior": 13500},
    "Solution Architect":    {"junior": 8000,  "mid": 12500, "senior": 17000},
    "SAP Consultant":        {"junior": 7000,  "mid": 11000, "senior": 15500},
    "SAP Basis Consultant":  {"junior": 6500,  "mid": 10500, "senior": 14500},
    "SAP ABAP Developer":    {"junior": 5500,  "mid": 9000,  "senior": 13000},
    "Functional Consultant": {"junior": 6000,  "mid": 9500,  "senior": 13500},
    "Data Engineer":         {"junior": 6800,  "mid": 10500, "senior": 15000},
    "Cloud Architect":       {"junior": 8500,  "mid": 13000, "senior": 18000},
    "Security Consultant":   {"junior": 7500,  "mid": 11500, "senior": 16500},
    "L1 Support":            {"junior": 2800,  "mid": 3800,  "senior": 4800},
    "L2 Support":            {"junior": 4000,  "mid": 5500,  "senior": 7000},
    "L3 Support":            {"junior": 5500,  "mid": 7500,  "senior": 9500},
    "DevOps Engineer":       {"junior": 6500,  "mid": 10000, "senior": 14000},
    "Business Analyst":      {"junior": 5500,  "mid": 8500,  "senior": 12000},
}
VENDOR_MARGIN_MULTIPLIER = 1.55  # legacy — retained for benchmarks endpoint back-compat
# Fair-range margin bands used for resource-cost benchmarking (vendor price / market cost).
FAIR_MARGIN_MIN = 0.22   # 22% markup → lower bound of fair vendor price
FAIR_MARGIN_MAX = 0.35   # 35% markup → upper bound of fair vendor price
EXPENSIVE_MAX = 0.50     # up to 50% markup is still "expensive" (yellow); above is "very-expensive" (red)

# ============================================================
# Helpers
# ============================================================

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def clean_doc(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
        doc.pop("_id", None)
    return doc

def extract_text_from_bytes(filename: str, content: bytes) -> str:
    name = filename.lower()
    try:
        if name.endswith(".pdf"):
            text = []
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    t = page.extract_text() or ""
                    text.append(t)
            return "\n".join(text)
        if name.endswith(".docx"):
            doc = DocxDocument(io.BytesIO(content))
            paras = [p.text for p in doc.paragraphs]
            for tbl in doc.tables:
                for row in tbl.rows:
                    paras.append(" | ".join(c.text for c in row.cells))
            return "\n".join(paras)
        if name.endswith(".xlsx"):
            wb = load_workbook(io.BytesIO(content), data_only=True)
            lines = []
            for ws in wb.worksheets:
                lines.append(f"=== Sheet: {ws.title} ===")
                for row in ws.iter_rows(values_only=True):
                    row_txt = " | ".join("" if v is None else str(v) for v in row)
                    if row_txt.strip():
                        lines.append(row_txt)
            return "\n".join(lines)
        if name.endswith(".txt") or name.endswith(".csv"):
            return content.decode("utf-8", errors="ignore")
    except Exception as e:
        logger.error(f"Extraction failed for {filename}: {e}")
    return ""

async def llm_json_call(system_message: str, user_prompt: str, session_id: str) -> Dict[str, Any]:
    """Call LLM and parse JSON response."""
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_message,
    ).with_model(LLM_PROVIDER, LLM_MODEL)

    result_text = ""
    async for ev in chat.stream_message(UserMessage(text=user_prompt)):
        if isinstance(ev, TextDelta):
            result_text += ev.content
        elif isinstance(ev, StreamDone):
            break

    # Extract JSON from response
    match = re.search(r"\{[\s\S]*\}", result_text)
    if not match:
        logger.error(f"No JSON found in LLM response: {result_text[:500]}")
        raise HTTPException(500, "AI response did not contain valid JSON")
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode failed: {e} | text: {result_text[:500]}")
        raise HTTPException(500, "AI response JSON parse error")

# ============================================================
# ROUTES
# ============================================================

@api_router.get("/")
async def root():
    return {"service": "IT Procurement Advisory API", "status": "ok"}

@api_router.get("/benchmarks")
async def get_benchmarks():
    # Merge custom benchmarks (Mongo) over defaults so users see everything
    docs = await db.benchmarks.find({}, {"_id": 0}).to_list(500)
    custom = {d["role"]: {"junior": d.get("junior"), "mid": d.get("mid"), "senior": d.get("senior"),
                          "source": d.get("source", "custom"), "notes": d.get("notes", "")} for d in docs}
    merged = {}
    for role, vals in RESOURCE_BENCHMARKS.items():
        merged[role] = {**vals, "source": "default"}
    for role, vals in custom.items():
        merged[role] = {**merged.get(role, {}), **{k: v for k, v in vals.items() if v is not None}}

    settings = await db.settings.find_one({"key": "vendor_multiplier"}, {"_id": 0})
    multiplier = settings["value"] if settings else VENDOR_MARGIN_MULTIPLIER
    return {"roles": merged, "vendor_multiplier": multiplier}

class BenchmarkPayload(BaseModel):
    role: str
    junior: Optional[float] = None
    mid: Optional[float] = None
    senior: Optional[float] = None
    source: Optional[str] = "custom"
    notes: Optional[str] = ""

@api_router.post("/benchmarks")
async def upsert_benchmark(payload: BenchmarkPayload):
    doc = payload.model_dump()
    doc["updated_at"] = now_iso()
    await db.benchmarks.update_one({"role": payload.role}, {"$set": doc}, upsert=True)
    return {"ok": True, "role": payload.role}

@api_router.delete("/benchmarks/{role}")
async def delete_benchmark(role: str):
    await db.benchmarks.delete_one({"role": role})
    return {"ok": True}

class MultiplierPayload(BaseModel):
    value: float

@api_router.put("/benchmarks/multiplier")
async def set_multiplier(payload: MultiplierPayload):
    await db.settings.update_one(
        {"key": "vendor_multiplier"},
        {"$set": {"key": "vendor_multiplier", "value": payload.value, "updated_at": now_iso()}},
        upsert=True,
    )
    return {"ok": True, "value": payload.value}

@api_router.get("/benchmarks/template")
async def download_template():
    """Return an XLSX template pre-populated with seed roles for easy editing."""
    from openpyxl import Workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Benchmarks"
    headers = ["role", "junior", "mid", "senior", "source", "notes"]
    ws.append(headers)
    for role, vals in RESOURCE_BENCHMARKS.items():
        ws.append([role, vals["junior"], vals["mid"], vals["senior"], "internal", ""])
    # Style header row
    from openpyxl.styles import Font, PatternFill
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="0A2540")
    for col in ["A", "B", "C", "D", "E", "F"]:
        ws.column_dimensions[col].width = 22
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return Response(
        content=buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="benchmarks_template.xlsx"'},
    )

@api_router.post("/benchmarks/import")
async def import_benchmarks(file: UploadFile = File(...)):
    """Import benchmark rates from Excel (.xlsx) or CSV.
    Expected columns: role, junior, mid, senior, source (optional), notes (optional)"""
    content = await file.read()
    rows = []
    name = file.filename.lower()
    try:
        if name.endswith(".xlsx"):
            wb = load_workbook(io.BytesIO(content), data_only=True)
            ws = wb.active
            headers = [str(c.value or "").strip().lower() for c in next(ws.iter_rows(min_row=1, max_row=1))]
            for row in ws.iter_rows(min_row=2, values_only=True):
                rows.append(dict(zip(headers, row)))
        elif name.endswith(".csv"):
            import csv
            reader = csv.DictReader(io.StringIO(content.decode("utf-8", errors="ignore")))
            for r in reader:
                rows.append({k.lower(): v for k, v in r.items()})
        else:
            raise HTTPException(400, "Only .xlsx or .csv files are supported")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Failed to parse file: {e}")

    imported = 0
    for r in rows:
        role = str(r.get("role") or "").strip()
        if not role:
            continue
        def _num(v):
            try:
                return float(str(v).replace(",", "").replace("$", "")) if v not in (None, "") else None
            except Exception:
                return None
        doc = {
            "role": role,
            "junior": _num(r.get("junior")),
            "mid": _num(r.get("mid")),
            "senior": _num(r.get("senior")),
            "source": (str(r.get("source") or "custom")).strip() or "custom",
            "notes": str(r.get("notes") or "").strip(),
            "updated_at": now_iso(),
        }
        await db.benchmarks.update_one({"role": role}, {"$set": doc}, upsert=True)
        imported += 1
    return {"ok": True, "imported": imported}

# ============================================================
# Catalog benchmarks (software SKU / hardware) — historical procurement records
# ============================================================

CATALOG_SCHEMAS = {
    "software": ["oem", "product_name", "sku", "license_type", "license_metric",
                 "currency", "quantity", "total_price", "unit_price", "contract_duration",
                 "source", "date", "notes"],
    "hardware": ["oem", "product", "model_number", "part_number", "configuration",
                 "quantity", "unit_price", "warranty", "currency",
                 "source", "date", "notes"],
}

def _catalog_coll(kind: str):
    if kind not in CATALOG_SCHEMAS:
        raise HTTPException(400, "kind must be 'software' or 'hardware'")
    return db[f"catalog_{kind}"]

@api_router.get("/catalog/{kind}")
async def list_catalog(kind: str):
    coll = _catalog_coll(kind)
    docs = await coll.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return {"kind": kind, "columns": CATALOG_SCHEMAS[kind], "rows": docs}

@api_router.post("/catalog/{kind}")
async def add_catalog_row(kind: str, payload: Dict[str, Any]):
    coll = _catalog_coll(kind)
    row = {"id": str(uuid.uuid4()), "kind": kind, "created_at": now_iso()}
    for k in CATALOG_SCHEMAS[kind]:
        row[k] = payload.get(k)
    await coll.insert_one(row.copy())
    row.pop("_id", None)
    return row

@api_router.delete("/catalog/{kind}/{row_id}")
async def delete_catalog_row(kind: str, row_id: str):
    coll = _catalog_coll(kind)
    await coll.delete_one({"id": row_id})
    return {"ok": True}

@api_router.get("/catalog/{kind}/template")
async def catalog_template(kind: str):
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill
    if kind not in CATALOG_SCHEMAS:
        raise HTTPException(400, "Invalid kind")
    wb = Workbook()
    ws = wb.active
    ws.title = f"{kind.title()} Benchmarks"
    ws.append(CATALOG_SCHEMAS[kind])
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="0A2540")
    for col_idx in range(1, len(CATALOG_SCHEMAS[kind]) + 1):
        ws.column_dimensions[chr(64 + col_idx)].width = 20
    if kind == "software":
        ws.append(["Microsoft", "Microsoft 365 E3", "M365-E3", "Subscription", "Per Named User",
                   "USD", 100, 43200, 36, 12, "internal-2025", "2025-01", "Renewal"])
    else:
        ws.append(["Dell", "PowerEdge R760", "R760-XL", "PWR-R760-01", "2x Xeon Gold, 256GB RAM",
                   10, 12500, "3Y NBD", "USD", "internal-2025", "2025-01", ""])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return Response(
        content=buf.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{kind}_benchmarks_template.xlsx"'},
    )

@api_router.post("/catalog/{kind}/import")
async def import_catalog(kind: str, file: UploadFile = File(...)):
    if kind not in CATALOG_SCHEMAS:
        raise HTTPException(400, "Invalid kind")
    coll = _catalog_coll(kind)
    content = await file.read()
    rows = []
    name = file.filename.lower()
    try:
        if name.endswith(".xlsx"):
            wb = load_workbook(io.BytesIO(content), data_only=True)
            ws = wb.active
            headers = [str(c.value or "").strip().lower() for c in next(ws.iter_rows(min_row=1, max_row=1))]
            for row in ws.iter_rows(min_row=2, values_only=True):
                rows.append(dict(zip(headers, row)))
        elif name.endswith(".csv"):
            import csv
            reader = csv.DictReader(io.StringIO(content.decode("utf-8", errors="ignore")))
            for r in reader:
                rows.append({k.lower(): v for k, v in r.items()})
        else:
            raise HTTPException(400, "Only .xlsx or .csv supported")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Failed to parse file: {e}")

    imported = 0
    for r in rows:
        if not any((v not in (None, "") for v in r.values())):
            continue
        doc = {"id": str(uuid.uuid4()), "kind": kind, "created_at": now_iso()}
        for k in CATALOG_SCHEMAS[kind]:
            doc[k] = r.get(k)
        await coll.insert_one(doc)
        imported += 1
    return {"ok": True, "imported": imported}

async def find_similar_catalog(kind: str, target: Dict[str, Any], limit: int = 10):
    """Find similar historical procurements. Fuzzy match on OEM + product name."""
    if kind not in CATALOG_SCHEMAS:
        return []
    coll = _catalog_coll(kind)
    oem = str(target.get("oem") or "").strip().lower()
    prod_key = "product_name" if kind == "software" else "product"
    prod = str(target.get(prod_key) or "").strip().lower()
    query = {}
    if oem:
        query["oem"] = {"$regex": re.escape(oem), "$options": "i"}
    if prod:
        query[prod_key] = {"$regex": re.escape(prod.split()[0]) if prod else "", "$options": "i"}
    if not query:
        return []
    docs = await coll.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return docs


# ---- Reviews CRUD ----

@api_router.post("/reviews")
async def create_review(payload: ReviewCreate):
    review = {
        "id": str(uuid.uuid4()),
        "procurement_type": payload.procurement_type,
        "category": payload.category,
        "client_name": payload.client_name or "",
        "project_name": payload.project_name or "",
        "status": "draft",
        "form_data": {},
        "extracted_data": {},
        "documents": [],
        "analysis": None,
        "chat_history": [],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.reviews.insert_one(review.copy())
    review.pop("_id", None)
    return review

@api_router.get("/reviews")
async def list_reviews():
    reviews = await db.reviews.find({}, {"_id": 0, "chat_history": 0}).sort("created_at", -1).to_list(500)
    return reviews

@api_router.get("/reviews/{review_id}")
async def get_review(review_id: str):
    r = await db.reviews.find_one({"id": review_id}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Review not found")
    return r

@api_router.patch("/reviews/{review_id}")
async def update_review(review_id: str, payload: ReviewUpdate):
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    updates["updated_at"] = now_iso()
    result = await db.reviews.update_one({"id": review_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(404, "Review not found")
    r = await db.reviews.find_one({"id": review_id}, {"_id": 0})
    return r

@api_router.delete("/reviews/{review_id}")
async def delete_review(review_id: str):
    result = await db.reviews.delete_one({"id": review_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Review not found")
    return {"ok": True}

# ---- Document upload + extraction ----

@api_router.post("/reviews/{review_id}/upload")
async def upload_document(review_id: str, files: List[UploadFile] = File(...)):
    r = await db.reviews.find_one({"id": review_id})
    if not r:
        raise HTTPException(404, "Review not found")

    documents = r.get("documents", [])
    combined_text_parts = []

    for f in files:
        content = await f.read()
        text = extract_text_from_bytes(f.filename, content)
        doc_entry = {
            "id": str(uuid.uuid4()),
            "filename": f.filename,
            "size": len(content),
            "text_length": len(text),
            "text_preview": text[:800],
            "uploaded_at": now_iso(),
        }
        documents.append(doc_entry)
        combined_text_parts.append(f"### FILE: {f.filename}\n{text}")

    combined_text = "\n\n".join(combined_text_parts)
    # cap for LLM input
    capped_text = combined_text[:60000]

    # Use LLM to extract structured procurement info
    system = (
        "You are an expert IT Procurement Consultant. Extract structured procurement information "
        "from the provided documents (SOW, MSA, SLA, proposals, pricing sheets). "
        "Return STRICT JSON ONLY, no prose, no markdown fences."
    )
    schema_hint = {
        "commercial": {
            "vendor_name": "", "service_name": "", "billing_model": "",
            "hourly_rate": "", "monthly_cost": "", "fixed_cost": "",
            "contract_duration": "", "total_value": "", "currency": ""
        },
        "resources": [
            {"role": "", "count": 1, "experience_level": "junior|mid|senior",
             "location": "", "hourly_rate": "", "monthly_rate": ""}
        ],
        "contract": {
            "payment_terms": "", "warranty": "", "penalty_clauses": "",
            "termination_clauses": "", "price_escalation": "", "auto_renewal": "",
            "liability": "", "service_credits": ""
        },
        "sla": {
            "availability": "", "response_time": "", "resolution_time": "",
            "severity_matrix": "", "escalation_matrix": "", "support_hours": "",
            "exclusions": ""
        },
        "hardware": {
            "oem": "", "product": "", "model_number": "", "part_number": "",
            "configuration": "", "quantity": "", "warranty": "", "support_level": "",
            "delivery_timeline": "", "unit_price": "", "total_price": ""
        }
    }
    prompt = (
        f"PROCUREMENT CATEGORY: {r.get('category')}\nTYPE: {r.get('procurement_type')}\n\n"
        f"DOCUMENTS:\n{capped_text}\n\n"
        f"Extract into this JSON schema (fill only fields with evidence, leave others empty):\n"
        f"{json.dumps(schema_hint, indent=2)}\n\n"
        f"Return JSON only."
    )

    try:
        extracted = await llm_json_call(system, prompt, session_id=f"extract-{review_id}")
    except Exception as e:
        logger.error(f"Extraction LLM failed: {e}")
        extracted = {"commercial": {}, "resources": [], "contract": {}, "sla": {}, "hardware": {}}

    await db.reviews.update_one(
        {"id": review_id},
        {"$set": {
            "documents": documents,
            "extracted_data": extracted,
            "updated_at": now_iso(),
        }}
    )
    r = await db.reviews.find_one({"id": review_id}, {"_id": 0})
    return r

# ---- Analysis (Advisory Report generation) ----

async def compute_resource_benchmark(resources: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Compute market-based benchmark for each resource role.
    Preference order: (1) custom benchmark from Mongo, (2) seeded RESOURCE_BENCHMARKS, (3) generic default.
    Fair vendor price is a RANGE = market_cost × (1 + FAIR_MARGIN_MIN) to market_cost × (1 + FAIR_MARGIN_MAX).
    """
    # Load custom benchmarks (multiplier setting kept for back-compat but not used in fair-range calc)
    custom_docs = await db.benchmarks.find({}, {"_id": 0}).to_list(500)
    custom_map = {d["role"].lower(): d for d in custom_docs}

    results = []
    for res in resources:
        role = (res.get("role") or "").strip()
        level = (res.get("experience_level") or "mid").lower()
        if level not in ("junior", "mid", "senior"):
            level = "mid"

        # 1. Look in custom Mongo benchmarks first (exact then fuzzy)
        custom = custom_map.get(role.lower())
        if not custom:
            for k, v in custom_map.items():
                if k in role.lower() or role.lower() in k:
                    custom = v
                    break

        market_cost = None
        source = "unavailable"
        matched = None

        if custom and custom.get(level) is not None:
            market_cost = custom[level]
            source = custom.get("source") or "custom"
            matched = custom["role"]
        else:
            # 2. Fallback to seeded defaults (exact then fuzzy)
            seed_match = None
            for k in RESOURCE_BENCHMARKS.keys():
                if k.lower() == role.lower():
                    seed_match = k
                    break
            if not seed_match:
                for k in RESOURCE_BENCHMARKS.keys():
                    if k.lower() in role.lower() or role.lower() in k.lower():
                        seed_match = k
                        break
            if seed_match:
                market_cost = RESOURCE_BENCHMARKS[seed_match][level]
                source = "default"
                matched = seed_match
            else:
                # 3. Generic default of last resort
                market_cost = 9500
                source = "generic-fallback"
                matched = "generic"

        # Fair vendor price RANGE (22–35% margin on top of raw market cost)
        fair_min = round(market_cost * (1 + FAIR_MARGIN_MIN))
        fair_max = round(market_cost * (1 + FAIR_MARGIN_MAX))
        expensive_ceiling = round(market_cost * (1 + EXPENSIVE_MAX))

        # parse vendor monthly rate
        raw_vendor = res.get("monthly_rate") or res.get("hourly_rate") or ""
        vendor_num = 0
        try:
            digits = re.sub(r"[^\d.]", "", str(raw_vendor))
            vendor_num = float(digits) if digits else 0
        except Exception:
            vendor_num = 0
        if res.get("hourly_rate") and not res.get("monthly_rate"):
            vendor_num = vendor_num * 160

        margin_pct = 0
        rating = "unknown"
        if vendor_num > 0:
            margin_pct = round(((vendor_num - market_cost) / market_cost) * 100, 1)
            if vendor_num < fair_min:
                rating = "excellent"
            elif vendor_num <= fair_max:
                rating = "fair"
            elif vendor_num <= expensive_ceiling:
                rating = "expensive"
            else:
                rating = "very-expensive"

        results.append({
            "role": role or matched or "Unknown",
            "matched_role": matched,
            "experience_level": level,
            "count": res.get("count", 1),
            "market_cost_monthly": market_cost,
            "fair_vendor_min": fair_min,
            "fair_vendor_max": fair_max,
            "expensive_ceiling": expensive_ceiling,
            "vendor_quoted_monthly": vendor_num,
            "margin_pct": margin_pct,
            "competitiveness": rating,
            "benchmark_source": source,
        })
    return results

async def _run_analysis_bg(review_id: str):
    """Background analysis task — runs LLM call and persists result."""
    r = await db.reviews.find_one({"id": review_id}, {"_id": 0})
    if not r:
        return

    category = r.get("category", "")
    ptype = r.get("procurement_type", "")
    form_data = r.get("form_data", {}) or {}
    extracted = r.get("extracted_data", {}) or {}

    # Auto-compute unit price from total price / quantity (authoritative server-side calc)
    try:
        qty = float(form_data.get("quantity") or 0)
        total = float(form_data.get("total_price") or 0)
        if qty > 0 and total > 0:
            form_data["unit_price_computed"] = round(total / qty, 2)
    except (ValueError, TypeError):
        pass

    resources = extracted.get("resources", []) or form_data.get("resources", []) or []
    resource_benchmark = await compute_resource_benchmark(resources) if resources else []

    # Historical procurement lookups from client's own uploaded catalog
    similar_procurements = []
    catalog_kind = None
    if ptype == "software" and category == "license_sku":
        catalog_kind = "software"
        target = {"oem": form_data.get("oem"), "product_name": form_data.get("product_name")}
        similar_procurements = await find_similar_catalog("software", target, limit=10)
    elif ptype == "hardware" and category == "hardware_product":
        catalog_kind = "hardware"
        target = {"oem": form_data.get("oem"), "product": form_data.get("product_name")}
        similar_procurements = await find_similar_catalog("hardware", target, limit=10)

    system = (
        "You are a senior IT Procurement Consultant with 20 years of experience advising CIOs and "
        "sourcing teams. Produce a consulting-grade procurement advisory analysis. "
        "Return STRICT JSON ONLY."
    )

    context_block = {
        "procurement_type": ptype,
        "category": category,
        "form_data": form_data,
        "extracted_data": extracted,
        "resource_benchmark": resource_benchmark,
        "historical_similar_procurements": similar_procurements,
        "historical_source_note": (
            f"The 'historical_similar_procurements' array contains {len(similar_procurements)} actual past "
            f"{catalog_kind} procurement records from the client's internal benchmark library. "
            "Use these as the PRIMARY benchmark for pricing_assessment and historical_benchmark sections. "
            "Cite specific rows (by oem/product/date) in your rationale."
            if similar_procurements else
            "No matching historical procurements were found in the client's catalog. Fall back to general market knowledge "
            "and clearly flag in historical_benchmark that this is a general-market estimate, not client-specific data."
        ),
    }

    schema = {
        "executive_summary": "2-3 paragraph executive summary",
        "commercial_summary": "Concise commercial overview",
        "pricing_assessment": {
            "verdict": "competitive|fair|expensive|very-expensive",
            "rationale": "explanation",
            "estimated_savings_opportunity_pct": 0
        },
        "historical_benchmark": "How this compares to similar procurements in the market",
        "sla_review": {
            "overall_rating": "strong|adequate|weak",
            "findings": [
                {"area": "Availability", "commitment": "", "benchmark": "", "assessment": "strong|adequate|weak", "recommendation": ""}
            ]
        },
        "contract_risk": [
            {"clause": "", "risk_level": "high|medium|low", "description": "", "recommendation": ""}
        ],
        "cost_optimization": ["opportunity 1", "opportunity 2"],
        "negotiation_strategy": ["point 1", "point 2", "point 3"],
        "overall_procurement_score": 0,
        "final_recommendation": "accept|accept-with-negotiation|reject",
        "recommendation_summary": "1-2 sentences"
    }

    prompt = (
        f"PROCUREMENT CONTEXT:\n{json.dumps(context_block, indent=2, default=str)}\n\n"
        f"Produce the analysis strictly in this JSON schema:\n{json.dumps(schema, indent=2)}\n\n"
        f"overall_procurement_score is 0-100. Return JSON only, no markdown."
    )

    try:
        analysis = await llm_json_call(system, prompt, session_id=f"analyze-{review_id}")
        analysis["resource_benchmark"] = resource_benchmark
        analysis["generated_at"] = now_iso()
        await db.reviews.update_one(
            {"id": review_id},
            {"$set": {"analysis": analysis, "status": "analyzed", "analysis_error": None, "updated_at": now_iso()}}
        )
    except Exception as e:
        logger.error(f"Analysis LLM failed: {e}")
        await db.reviews.update_one(
            {"id": review_id},
            {"$set": {"status": "error", "analysis_error": str(e), "updated_at": now_iso()}}
        )

@api_router.post("/reviews/{review_id}/analyze")
async def analyze_review(review_id: str):
    r = await db.reviews.find_one({"id": review_id}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Review not found")

    await db.reviews.update_one(
        {"id": review_id},
        {"$set": {"status": "analyzing", "analysis_error": None, "updated_at": now_iso()}}
    )
    # Fire-and-forget background analysis (survives client disconnect)
    asyncio.create_task(_run_analysis_bg(review_id))

    r = await db.reviews.find_one({"id": review_id}, {"_id": 0})
    return r

# ---- AI Chat Assistant (streaming) ----

@api_router.get("/reviews/{review_id}/chat")
async def get_chat_history(review_id: str):
    r = await db.reviews.find_one({"id": review_id}, {"_id": 0, "chat_history": 1})
    if not r:
        raise HTTPException(404, "Review not found")
    return {"history": r.get("chat_history", [])}

@api_router.post("/reviews/{review_id}/chat")
async def chat_with_assistant(review_id: str, payload: ChatRequest):
    r = await db.reviews.find_one({"id": review_id}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Review not found")

    history = r.get("chat_history", [])
    user_msg = {"role": "user", "content": payload.message, "timestamp": now_iso()}
    history.append(user_msg)

    system = (
        "You are an experienced IT Procurement Advisor. Answer questions about the current "
        "procurement using the provided context (documents, extracted data, analysis). "
        "Be concise, structured (use bullets when useful), and consulting-grade. "
        "If asked to summarize, recommend, or compare, be decisive with reasoning."
    )

    # Compose context: analysis + extracted + form_data
    context = {
        "procurement_type": r.get("procurement_type"),
        "category": r.get("category"),
        "form_data": r.get("form_data"),
        "extracted_data": r.get("extracted_data"),
        "analysis": r.get("analysis"),
    }
    context_str = json.dumps(context, indent=2, default=str)[:20000]

    # Recent chat history (last 6 turns) for continuity
    prior = history[-8:-1]
    prior_str = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in prior)

    prompt = (
        f"PROCUREMENT CONTEXT:\n{context_str}\n\n"
        f"PRIOR CONVERSATION:\n{prior_str}\n\n"
        f"USER QUESTION: {payload.message}"
    )

    async def stream_gen():
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"chat-{review_id}",
            system_message=system,
        ).with_model(LLM_PROVIDER, LLM_MODEL)

        collected = ""
        try:
            async for ev in chat.stream_message(UserMessage(text=prompt)):
                if isinstance(ev, TextDelta):
                    collected += ev.content
                    yield f"data: {json.dumps({'delta': ev.content})}\n\n"
                elif isinstance(ev, StreamDone):
                    break
        except Exception as e:
            logger.error(f"Chat stream error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

        # persist
        history.append({"role": "assistant", "content": collected, "timestamp": now_iso()})
        await db.reviews.update_one(
            {"id": review_id},
            {"$set": {"chat_history": history, "updated_at": now_iso()}}
        )
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(
        stream_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

# ============================================================
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
