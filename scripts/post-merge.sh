#!/bin/bash
set -e

echo "=== Post-merge setup ==="

echo "Installing dependencies..."
npm install --legacy-peer-deps

echo "Pushing DB schema..."
npm run db:push -- --yes 2>/dev/null || npm run db:push

echo "=== Post-merge setup complete ==="
