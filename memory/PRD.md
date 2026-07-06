# Procura — IT Procurement Advisory (v4)

## Problem Statement
Preview-only setup of the uploaded `Procurement-Advisory-Consultantv4-main.zip`. Extract, install deps, configure env, and boot for a working preview — no code changes.

## Stack
- Backend: FastAPI + Motor (MongoDB) + emergentintegrations (Claude Sonnet 4.5)
- Frontend: React 19 + CRACO + Tailwind + shadcn/ui + framer-motion
- DB: MongoDB (local via supervisor)
- Doc parsing: pdfplumber / python-docx / openpyxl

## Setup Actions Performed (2026-01)
- Extracted zip to /app (backend, frontend, templates, docs)
- Installed backend deps: pdfplumber, python-docx, openpyxl, emergentintegrations, motor
- Installed frontend deps via `yarn install`
- Configured `backend/.env` with `EMERGENT_LLM_KEY` (auto-provisioned)
- Restarted supervisor: backend + frontend both RUNNING
- Verified: `GET /api/` -> ok, `GET /api/benchmarks` returns seeded roles, UI loads (title "Procura — IT Procurement Advisory")

## Core Features (existing, working from preview)
- Guided procurement wizard (Type → Category → form/docs)
- AI extraction from PDF/DOCX/XLSX/TXT/CSV
- Resource cost benchmarking (14 roles × junior/mid/senior)
- Advisory analysis: pricing verdict, SLA review, contract risk, negotiation strategy, procurement score
- Streaming AI chat assistant (SSE)
- Custom benchmark import/export (xlsx/csv)

## Backlog
- P1: End-to-end functional testing of upload → extract → analyze → chat flow
- P2: Add auth if multi-user is desired
- P2: Persistent history search/filter on Dashboard
