# Procura — AI-Powered IT Procurement Advisory Platform

Procura replicates the workflow of an experienced IT Procurement Consultant. It automates commercial benchmarking, SLA review, contract risk analysis, and produces consulting-grade procurement recommendations — powered by Claude Sonnet 4.5.

![Procura](https://img.shields.io/badge/stack-FastAPI%20%2B%20React%20%2B%20MongoDB-0A2540) ![AI](https://img.shields.io/badge/AI-Claude%20Sonnet%204.5-0066FF)

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
| AI        | Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) via `emergentintegrations` |
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
- Node.js ≥ 18, Yarn ≥ 1.22
- Python ≥ 3.10
- MongoDB (local or Atlas connection string)

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
MONGO_URL="mongodb://localhost:27017"
DB_NAME="procura"
CORS_ORIGINS="*"
EMERGENT_LLM_KEY="sk-emergent-xxxxxxxxxxxx"
EOF

# Run
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

### Backend (`/backend/.env`)
| Key                 | Purpose                                           |
|---------------------|---------------------------------------------------|
| `MONGO_URL`         | MongoDB connection string                         |
| `DB_NAME`           | MongoDB database name                             |
| `CORS_ORIGINS`      | Comma-separated allowed origins (or `*`)          |
| `EMERGENT_LLM_KEY`  | Emergent Universal LLM key (Claude/OpenAI/Gemini) |

### Frontend (`/frontend/.env`)
| Key                     | Purpose                                       |
|-------------------------|-----------------------------------------------|
| `REACT_APP_BACKEND_URL` | Backend base URL (must be reachable by browser) |

> If not using Emergent, swap `EMERGENT_LLM_KEY` for your own Anthropic API key and adjust the `LlmChat` call in `server.py` to use the Anthropic SDK directly. Model name: `claude-sonnet-4-5-20250929`.

---

## 🌐 API Reference

All routes are prefixed with `/api`.

| Method | Path                                    | Description                                            |
|--------|-----------------------------------------|--------------------------------------------------------|
| GET    | `/api/`                                 | Health check                                           |
| GET    | `/api/benchmarks`                       | Seeded resource cost benchmarks                        |
| POST   | `/api/reviews`                          | Create a new procurement review                        |
| GET    | `/api/reviews`                          | List all reviews                                       |
| GET    | `/api/reviews/{id}`                     | Get a review with analysis + documents                 |
| PATCH  | `/api/reviews/{id}`                     | Update `form_data` or `extracted_data`                 |
| DELETE | `/api/reviews/{id}`                     | Delete a review                                        |
| POST   | `/api/reviews/{id}/upload`              | Upload docs (multipart) + AI extraction                |
| POST   | `/api/reviews/{id}/analyze`             | Trigger AI analysis (async — poll `GET /reviews/{id}`) |
| POST   | `/api/reviews/{id}/chat`                | Chat with AI assistant (SSE stream)                    |
| GET    | `/api/reviews/{id}/chat`                | Get chat history                                       |

### Analysis flow
Because Claude analysis takes 30–90 seconds, `POST /analyze` returns immediately with `status: "analyzing"`. The frontend polls `GET /reviews/{id}` every 4 seconds until `status` becomes `"analyzed"` or `"error"`.

### Chat flow
`POST /reviews/{id}/chat` returns `text/event-stream` with `data: {"delta": "..."}` chunks, terminating with `data: {"done": true}`. History is auto-persisted.

---

## 🧠 Resource Benchmark Data

Seeded in `backend/server.py` (`RESOURCE_BENCHMARKS`). 14 roles × 3 experience levels (junior/mid/senior) with monthly USD rates.

**Vendor margin multiplier**: `1.55` (i.e., a fair vendor bill rate is ~155% of raw cost, covering overhead + margin).

Tune these values in `server.py` to match your organization's internal benchmarks.

---

## 🎨 Design System

- **Palette**: slate-based neutrals with a navy (#0A2540) primary and electric blue (#0066FF) accent
- **Typography**: Satoshi (headings) · Manrope (body) · JetBrains Mono (numeric data)
- **Layout**: sidebar + workspace, dense data tables, progressive disclosure
- **Icons**: `@phosphor-icons/react` (duotone/regular)

---

## 🛡️ Deployment Notes

- Ensure your reverse proxy / ingress does **not** buffer SSE responses (backend sets `X-Accel-Buffering: no`).
- The `/analyze` endpoint uses `asyncio.create_task` — safe on a single-worker Uvicorn; if you run multiple workers or use serverless, migrate to a proper background queue (Celery / Redis / etc.).
- Set `CORS_ORIGINS` to your frontend origin(s) in production.
- MongoDB indexes: create an index on `reviews.id` for faster lookups.

---

## 📝 License

Proprietary — internal use only. Ask the maintainer before redistribution.

---

## 🙋 Support

For questions or feature requests, open an issue in the repository or contact the maintainer.

Built with ❤️ on [Emergent](https://emergent.sh).
