# ============================================================
# Unified Dockerfile — single container for Render / Railway
# Combines: React frontend (nginx) + FastAPI backend
# ============================================================

# ── Stage 1: Build React frontend ──────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci || npm install
COPY frontend/ .
RUN npm run build

# ── Stage 2: Production container ──────────────────────────
FROM python:3.11-slim

# Install nginx + runtime deps
RUN apt-get update && apt-get install -y --no-install-recommends \
        nginx curl build-essential && \
    rm -rf /var/lib/apt/lists/*

# ── Python deps ──
WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Backend source ──
COPY backend/ .

# ── Frontend static files ──
COPY --from=frontend-build /build/dist /usr/share/nginx/html

# ── Nginx config template (port injected at runtime) ──
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf.template
RUN rm -f /etc/nginx/sites-enabled/default

# ── Startup script ──
COPY deploy/start.sh /start.sh
RUN chmod +x /start.sh

# ── Data directory ──
RUN mkdir -p /app/data

# ── Environment defaults ──
ENV HPCAI_DATA_DIR=/app/data \
    HPCAI_DATABASE_URL=sqlite:////app/data/hpcai.db \
    HPCAI_SANDBOX_ENABLED=true \
    HPCAI_TERMINAL_ENABLED=false \
    HPCAI_CORS_ORIGINS=* \
    PYTHONUNBUFFERED=1 \
    PORT=10000

EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/health || exit 1

CMD ["/start.sh"]
