# Procura — AI-Powered IT Procurement Advisory Platform

Procura replicates the workflow of an experienced IT Procurement Consultant. It automates commercial benchmarking, SLA review, contract risk analysis, and produces consulting-grade procurement recommendations.

![Procura](https://img.shields.io/badge/stack-FastAPI%20%2B%20React%20%2B%20MongoDB-0A2540) ![AI](https://img.shields.io/badge/AI-Powered-0066FF)

---

## ✨ Features

- **Guided procurement wizard** — Type → Category → Input (form or documents)
- **Structured commercial form** for License / SKU / SaaS / Hardware Product procurements
- **Document upload + AI extraction** (PDF, DOCX, XLSX, TXT, CSV) for SOW, MSA, SLA, proposals, pricing sheets
- **Editable extracted data** — commercial, resources, contract, SLA
- **Resource cost benchmarking** — 14 seeded IT roles (PM, Solution Architect, SAP Consultant, Cloud Architect, L1/L2/L3 Support, Data Engineer, etc.) × 3 experience levels
- **Consulting-grade advisory report** — executive summary, pricing assessment, historical benchmark, SLA review, contract risk, cost optimization, negotiation strategy, procurement score (0–100), final recommendation
- **AI Procurement Assistant** — context-aware streaming chat grounded in your documents and analysis
- **Modern enterprise UI** — Swiss & high-contrast design (Satoshi + Manrope + JetBrains Mono)

---

## 🧱 Tech Stack

| Layer     | Technology                                                                 |
|-----------|----------------------------------------------------------------------------|
| Frontend  | React 19, Tailwind CSS, shadcn/ui, @phosphor-icons/react, sonner, framer-motion |
| Backend   | FastAPI, Uvicorn, Motor (async MongoDB), Pydantic                          |
| Database  | MongoDB                                                                    |
| AI        | Generative AI — document extraction, benchmark matching, explanation (`google-genai` SDK) |
| Doc Parse | pdfplumber, python-docx, openpyxl                                          |

---

## 📁 Project Structure

```
/app
├── backend/
│   ├── server.py              # FastAPI app: routes, LLM, extraction, benchmark
│   ├── requirements.txt
│   └── .env                   # MONGO_URL, DB_NAME, EMERGENT_LLM_KEY, CORS_ORIGINS
└── frontend/
    ├── src/
    │   ├── App.js
    │   ├── index.css          # Tailwind + custom fonts + animations
    │   ├── lib/
    │   │   ├── api.js         # Axios client + SSE chat stream
    │   │   └── categories.js  # Procurement types & categories catalog
    │   ├── components/
    │   │   ├── Layout.jsx
    │   │   ├── UploadZone.jsx
    │   │   ├── LicenseSkuForm.jsx
    │   │   ├── ExtractedDataEditor.jsx
    │   │   ├── AnalysisReport.jsx
    │   │   ├── ChatSidebar.jsx
    │   │   └── FormBits.jsx
    │   └── pages/
    │       ├── Dashboard.jsx
    │       ├── NewReview.jsx
    │       └── ReviewDetail.jsx
    ├── package.json
    └── .env                   # REACT_APP_BACKEND_URL
```

---

## 🚀 Local Setup

### Prerequisites
- Node.js ≥ 18, Yarn ≥ 1.22 (or npm)
- Python ≥ 3.10
- A Supabase project (or backend falls back to an in-memory store)
- A generative AI API key (see Environment Variables)

### 1. Clone
```bash
git clone <your-repo-url>
cd <repo>
```

### 2. Backend
```bash
cd backend
pip install -r requirements.txt

# Create .env
cat > .env <<'EOF'
SUPABASE_URL="https://<your-project>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
GEMINI_API_KEY="<your-api-key>"
CORS_ORIGINS="*"
EOF

# Run from the repo ROOT (not backend/), so `server` and `backend.*` resolve.
cd ..
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### 3. Frontend
```bash
cd frontend
yarn install

# Create .env
cat > .env <<'EOF'
REACT_APP_BACKEND_URL=http://localhost:8001
EOF

yarn start
```

The app will be available at **http://localhost:3000**.

---

## 🔑 Environment Variables

### Backend (`backend/.env`)
| Key                      | Purpose                                                  |
|--------------------------|----------------------------------------------------------|
| `SUPABASE_URL`           | Supabase project URL                                     |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server-side only)          |
| `SUPABASE_ANON_KEY`      | Supabase anon key (optional)                             |
| `SUPABASE_STORAGE_BUCKET`| Storage bucket name for document uploads (default `procurement-documents`) |
| `GEMINI_API_KEY`         | API key for AI extraction + explanation                  |
| `CORS_ORIGINS`           | Comma-separated allowed origins (or `*` for local dev)   |

### Frontend (`frontend/.env`)
| Key                     | Purpose                                       |
|-------------------------|-----------------------------------------------|
| `REACT_APP_BACKEND_URL` | Backend base URL (must be reachable by browser) |

> MongoDB is no longer used — the backend persists to **Supabase**. AI calls use the configured generative model. Apply the SQL in `backend/migrations/schema.sql` and create the Storage bucket on first Supabase setup; the app also falls back to an in-memory store when no Supabase credentials are set.

---

## 🌐 API Reference

All routes are prefixed with `/api`.

| Method | Path                                    | Description                                            |
|--------|-----------------------------------------|--------------------------------------------------------|
| GET    | `/api/`                                 | Health check                                           |
| GET    | `/api/requests`                         | List procurement requests                              |
| POST   | `/api/requests`                         | Create a procurement request                           |
| GET    | `/api/requests/{id}`                    | Get a request with documents + extracted items         |
| PATCH  | `/api/requests/{id}`                    | Update request metadata / `form_data`                  |
| DELETE | `/api/requests/{id}`                    | Delete a request                                       |
| POST   | `/api/requests/{id}/documents`          | Upload documents (multipart, stored in Supabase Storage) |
| POST   | `/api/requests/{id}/extract`            | Run AI extraction over uploaded documents                |
| PATCH  | `/api/requests/{id}/items/{item_id}`    | Edit an extracted item                                 |
| POST   | `/api/requests/{id}/analyze`            | Run benchmark matching + scoring + explanation         |
| GET    | `/api/requests/{id}/analysis`           | Get the latest score result                            |
| GET    | `/api/catalog/{kind}`                   | List benchmark catalog rows (software/hardware/resource) |
| POST   | `/api/catalog/{kind}`                   | Add a catalog row                                      |
| DELETE | `/api/catalog/{kind}/{row_id}`          | Delete a catalog row                                   |

> **Not yet implemented in the backend** (frontend calls exist, but the routes return 404):
> `POST/GET /api/requests/{id}/chat` (AI chat), `POST /api/reviews/{id}/compare` (proposal comparison),
> `/api/benchmarks*` (resource-rate tab), and `/api/catalog/{kind}/import` (Excel import).

### Request/status model
Statuses flow: `draft` → `uploaded` → `extracting` → `ready_for_analysis` → `analyzing` → `analyzed` (or `failed`). The `GET /api/requests/{id}` response exposes `status`, `documents`, `documents_v2`, `extracted_items`, and `analysis`.

### Analysis flow
`POST /analyze` is synchronous and returns `{"ok": true}`; re-fetch `GET /api/requests/{id}` (or `/analysis`) to read the score result.

---

## 🧠 Resource Benchmark Data

Benchmark catalog rows live in Supabase tables (`resource_pricing`, `software_pricing`, `hardware_pricing`) and are managed via the **Benchmarks** page in the UI (or `backend/seed/seed_benchmarks.py`).

- **Matching** is deterministic and rule-based (`backend/services/benchmark_matcher.py`): exact SKU / part number / role, alias, and attribute scoring.
- **Scoring** (`backend/services/scoring.py`) blends price position, benchmark-match confidence, completeness, and arithmetic consistency into a 0–100 procurement score.
- **Vendor margin multiplier** `1.55` (fair vendor bill rate ≈ 155% of raw cost) is a UI-level setting.

---

## 🎨 Design System

- **Palette**: slate-based neutrals with a navy (#0A2540) primary and electric blue (#0066FF) accent
- **Typography**: Satoshi (headings) · Manrope (body) · JetBrains Mono (numeric data)
- **Layout**: sidebar + workspace, dense data tables, progressive disclosure
- **Icons**: `@phosphor-icons/react` (duotone/regular)

---

## 🛡️ Deployment Notes

- **Do not use multiple Uvicorn workers** without a background task queue — analysis runs synchronously inside the request. Scale with Celery/RQ if needed.
- Set `CORS_ORIGINS` to your frontend origin(s) in production (see `render.yaml` for the Render wiring).
- Apply `backend/migrations/schema.sql` to the Supabase project and create the `procurement-documents` Storage bucket.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only; never expose it in the browser bundle.

---

## 📝 License

Proprietary — internal use only. Ask the maintainer before redistribution.

---

## 🙋 Support

For questions or feature requests, open an issue in the repository or contact the maintainer.

Built with ❤️ on [Emergent](https://emergent.sh).
