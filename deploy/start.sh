#!/bin/bash
set -e

PORT="${PORT:-10000}"
echo "==> Starting HPC AI Learning Platform on port $PORT"

# ── Configure nginx to listen on $PORT and proxy to local backend ──
sed "s/__PORT__/$PORT/g" /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# ── Ensure data directory exists ──
mkdir -p /app/data

# ── Start nginx in background ──
echo "==> Starting nginx..."
nginx

# ── Start backend ──
echo "==> Starting backend on :8000..."
cd /app/backend
exec gunicorn app.main:app \
    -k uvicorn.workers.UvicornWorker \
    -w 2 \
    -b 127.0.0.1:8000 \
    --timeout 120 \
    --access-logfile -
