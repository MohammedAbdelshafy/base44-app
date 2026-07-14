#!/bin/bash
# Run the test suite
set -e
echo "Running tests..."
cd backend
pip install -q aiosqlite  # SQLite async driver for tests
pytest tests/ -v --tb=short --cov=app --cov-report=term-missing
