# Procura — Deployment Guide

This guide covers deploying **Procura** (FastAPI backend + React frontend + MongoDB) to production. Pick the option that matches your infrastructure.

- [Option 1 — Docker Compose (recommended for on-prem / single VM)](#option-1--docker-compose-recommended-for-on-prem--single-vm)
- [Option 2 — Vercel (frontend) + Railway/Render (backend)](#option-2--vercel-frontend--railwayrender-backend)
- [Option 3 — Manual VM deployment (Ubuntu + Nginx + systemd)](#option-3--manual-vm-deployment-ubuntu--nginx--systemd)
- [Post-deployment checklist](#post-deployment-checklist)

---

## Prerequisites (all options)

- A domain name (e.g. `procura.yourclient.com`) with DNS control
- **MongoDB** — either self-hosted or MongoDB Atlas (free tier is fine to start)
- **Emergent LLM key** — from your Emergent profile (or an Anthropic API key if you swap the provider)
- ~1 GB RAM minimum (backend LLM calls are I/O-bound, not CPU-heavy)

---

## Option 1 — Docker Compose (recommended for on-prem / single VM)

Best for: single server, private hosting, easy backups, minimal DevOps overhead.

### 1. Create the Dockerfiles

**`backend/Dockerfile`**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# System deps for pdfplumber / lxml / openpyxl
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libxml2-dev libxslt1-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ -r requirements.txt

COPY . .

EXPOSE 8001
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]
```

> Keep `--workers 1` because `/analyze` uses `asyncio.create_task` for background LLM calls. If you scale to multiple workers, migrate to Celery/RQ (see [scaling notes](#scaling-notes)).

**`frontend/Dockerfile`**
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
RUN yarn build

# Serve stage
FROM nginx:1.27-alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**`frontend/nginx.conf`**
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri /index.html;
    }
}
```

### 2. Create `docker-compose.yml` (repo root)

```yaml
version: "3.9"

services:
  mongo:
    image: mongo:7
    restart: unless-stopped
    volumes:
      - mongo_data:/data/db
    # Do NOT expose 27017 to the public in production

  backend:
    build:
      context: ./backend
    restart: unless-stopped
    depends_on: [mongo]
    environment:
      MONGO_URL: "mongodb://mongo:27017"
      DB_NAME: "procura"
      CORS_ORIGINS: "https://procura.yourclient.com"
      EMERGENT_LLM_KEY: "${EMERGENT_LLM_KEY}"
    expose:
      - "8001"

  frontend:
    build:
      context: ./frontend
      args:
        REACT_APP_BACKEND_URL: "https://procura.yourclient.com"
    restart: unless-stopped
    depends_on: [backend]
    expose:
      - "80"

  edge:
    image: caddy:2
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on: [backend, frontend]

volumes:
  mongo_data:
  caddy_data:
  caddy_config:
```

### 3. Create `Caddyfile` (auto-HTTPS reverse proxy)

```
procura.yourclient.com {
    # API — proxy /api/* to backend, disable buffering for SSE
    handle /api/* {
        reverse_proxy backend:8001 {
            flush_interval -1
            transport http {
                read_buffer 0
                write_buffer 0
            }
        }
    }

    # Frontend
    handle {
        reverse_proxy frontend:80
    }
}
```

> `flush_interval -1` is critical — it disables Caddy's response buffering so the AI chat SSE stream reaches the browser token-by-token.

### 4. Deploy

```bash
# On the server
cp .env.example .env
# Edit .env → set EMERGENT_LLM_KEY

docker compose up -d --build
docker compose logs -f
```

Point your DNS `A` record for `procura.yourclient.com` to the server's public IP. Caddy auto-provisions Let's Encrypt certificates.

### 5. Backup

```bash
# Weekly MongoDB dump
docker compose exec -T mongo mongodump --archive --db=procura | gzip > backup-$(date +%F).gz
```

---

## Option 2 — Vercel (frontend) + Railway/Render (backend)

Best for: quick launch, no server management, small-to-medium traffic.

### Frontend on Vercel

1. Push repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **New Project** → import the repo.
3. **Root Directory**: `frontend`
4. **Framework Preset**: Create React App
5. **Environment variable**: `REACT_APP_BACKEND_URL = https://<your-backend-url>`
6. Deploy. Vercel provisions HTTPS + CDN automatically.

### Backend on Railway (or Render)

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**.
2. Select the repo, set root to `/backend`.
3. Railway auto-detects Python. In **Settings**:
   - **Build Command**: `pip install --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
4. Add environment variables:
   ```
   MONGO_URL         = <your MongoDB Atlas URI>
   DB_NAME           = procura
   CORS_ORIGINS      = https://<your-vercel-domain>
   EMERGENT_LLM_KEY  = sk-emergent-...
   ```
5. Generate a public domain in Railway → copy it → set as `REACT_APP_BACKEND_URL` in Vercel → redeploy frontend.

### MongoDB — Atlas free tier

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Network Access → allow `0.0.0.0/0` (or Railway/Render egress IPs).
3. Database Access → create a user, copy the connection string, use as `MONGO_URL`.

### ⚠️ SSE on Vercel / Serverless
If you deploy the backend on Vercel Functions (serverless), the `/chat` SSE stream will not work reliably due to 10s function timeouts. **Use Railway/Render/Fly.io/a VM for the backend** — they support long-lived HTTP connections.

---

## Option 3 — Manual VM deployment (Ubuntu + Nginx + systemd)

Best for: existing Linux infra, full control.

### 1. Server prep (Ubuntu 22.04)
```bash
sudo apt update && sudo apt install -y python3.11 python3.11-venv python3-pip \
    nginx mongodb git nodejs npm certbot python3-certbot-nginx
sudo npm install -g yarn
```

### 2. Deploy code
```bash
sudo mkdir -p /opt/procura && sudo chown $USER:$USER /opt/procura
cd /opt/procura
git clone <your-repo-url> .
```

### 3. Backend
```bash
cd /opt/procura/backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ -r requirements.txt

cat > .env <<'EOF'
MONGO_URL="mongodb://localhost:27017"
DB_NAME="procura"
CORS_ORIGINS="https://procura.yourclient.com"
EMERGENT_LLM_KEY="sk-emergent-..."
EOF
```

**`/etc/systemd/system/procura-backend.service`**
```ini
[Unit]
Description=Procura FastAPI backend
After=network.target mongodb.service

[Service]
User=www-data
WorkingDirectory=/opt/procura/backend
Environment="PATH=/opt/procura/backend/.venv/bin"
ExecStart=/opt/procura/backend/.venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 1
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo chown -R www-data:www-data /opt/procura
sudo systemctl enable --now procura-backend
```

### 4. Frontend (static build)
```bash
cd /opt/procura/frontend
echo "REACT_APP_BACKEND_URL=https://procura.yourclient.com" > .env
yarn install --frozen-lockfile
yarn build
```

### 5. Nginx

**`/etc/nginx/sites-available/procura`**
```nginx
server {
    listen 80;
    server_name procura.yourclient.com;

    # Serve React build
    root /opt/procura/frontend/build;
    index index.html;
    location / {
        try_files $uri /index.html;
    }

    # Proxy API + disable SSE buffering
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Critical for SSE chat streaming
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        chunked_transfer_encoding on;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/procura /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d procura.yourclient.com
```

### 6. Verify
```bash
curl https://procura.yourclient.com/api/
# {"service":"IT Procurement Advisory API","status":"ok"}
```

---

## Post-deployment checklist

- [ ] `/api/` returns `200` with `{status: "ok"}`
- [ ] Frontend loads at your domain over HTTPS
- [ ] Creating a review → filling form → **Run AI analysis** completes in ~30–90s
- [ ] AI chat sidebar streams tokens smoothly (not in one big chunk — this indicates proxy buffering is OFF)
- [ ] MongoDB backups are scheduled
- [ ] `.env` files are **not** committed to Git (`.gitignore`)
- [ ] `CORS_ORIGINS` restricted to your frontend domain (not `*`)
- [ ] Log rotation configured (Docker: `--log-opt max-size=50m`; systemd: journald)

---

## Scaling notes

- **Multiple backend workers**: the current `/analyze` endpoint uses `asyncio.create_task`, which is process-local. If you run more than 1 worker or scale horizontally, migrate background analysis to Celery + Redis or RQ so the task is picked up by any worker.
- **Rate limits**: consider adding `slowapi` middleware on `/analyze` and `/chat` to protect your LLM budget.
- **Object storage**: for high-volume document uploads, store originals in S3/GCS and only keep extracted text + metadata in Mongo.

---

## Troubleshooting

| Symptom                                         | Likely cause                                          |
|-------------------------------------------------|-------------------------------------------------------|
| 502 on `/api/reviews/{id}/analyze`              | Ingress/proxy timeout — backend uses async bg tasks; make sure your proxy doesn't require sync response. Frontend polls automatically. |
| Chat responses arrive all at once (not streaming) | Reverse proxy is buffering. Disable buffering (`proxy_buffering off` for Nginx, `flush_interval -1` for Caddy). |
| `Budget has been exceeded`                      | Emergent LLM key balance is 0. Top up in your Emergent profile. |
| `CORS error` in browser                         | `CORS_ORIGINS` in backend `.env` doesn't match frontend origin. |
| Upload extraction returns empty                 | Check `/backend` has `libxml2-dev` and `libxslt1-dev` installed; verify the file isn't an image-only PDF (add OCR if needed). |

---

Built with ❤️ on [Emergent](https://emergent.sh).
