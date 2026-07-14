#!/bin/bash
# ============================================================
# CLIPPING FACTORY — First-time setup script
# Run: chmod +x scripts/setup.sh && ./scripts/setup.sh
# ============================================================

set -e

echo "=== Clipping Factory Setup ==="

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "Error: Docker not found. Install Docker first."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || command -v docker >/dev/null 2>&1 || { echo "Error: Docker Compose not found."; exit 1; }

# Copy env file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✓ Created .env from template — EDIT IT before starting!"
    echo "  Required: ANTHROPIC_API_KEY, CLIPPING_EMAIL, CLIPPING_PASSWORD"
else
    echo "✓ .env already exists"
fi

# Build and start services
echo ""
echo "Starting infrastructure services..."
docker compose up -d postgres redis minio

echo ""
echo "Waiting for database to be ready..."
sleep 5

echo ""
echo "Running database migrations..."
docker compose run --rm api alembic upgrade head

echo ""
echo "Installing Playwright browsers..."
docker compose run --rm api playwright install chromium --with-deps

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Start the full stack:    docker compose up"
echo "Admin dashboard:         http://localhost:3000"
echo "API docs:                http://localhost:8000/docs"
echo "MinIO console:           http://localhost:9001  (admin/minioadmin)"
echo "Grafana:                 http://localhost:3001  (admin/admin)"
echo ""
echo "Default admin:  admin / change-me-admin-password (set in .env)"
