#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
until node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT 1')
  .then(() => { pool.end(); process.exit(0); })
  .catch(() => { pool.end(); process.exit(1); });
" 2>/dev/null; do
  printf '.'
  sleep 1
done
echo " ready."

echo "Running database migrations..."
node server_dist/migrate.js

echo "Starting server on port ${PORT:-5000}..."
exec node server_dist/index.js
