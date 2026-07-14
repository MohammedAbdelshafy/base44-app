#!/bin/bash
# Run Alembic migrations inside Docker
set -e
echo "Running database migrations..."
docker compose run --rm api alembic upgrade head
echo "Migrations complete."
