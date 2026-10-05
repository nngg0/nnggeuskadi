#!/usr/bin/env bash
# Prueba la migración y las políticas RLS en un PostgreSQL DESECHABLE (nunca en producción).
# Uso: DATABASE_URL=postgres://postgres@localhost:5432/postgres ./scripts/test-db.sh
set -euo pipefail
: "${DATABASE_URL:?Define DATABASE_URL apuntando a un PostgreSQL de pruebas}"
DB="nngg_test_$$"
psql "$DATABASE_URL" -qc "create database $DB" >/dev/null
trap 'psql "$DATABASE_URL" -qc "drop database if exists $DB" >/dev/null' EXIT
TEST_URL="${DATABASE_URL%/*}/$DB"
psql "$TEST_URL" -v ON_ERROR_STOP=1 -q -f supabase/tests/00_supabase_stub.sql
for f in supabase/migrations/*.sql; do psql "$TEST_URL" -v ON_ERROR_STOP=1 -q -f "$f"; done
psql "$TEST_URL" -v ON_ERROR_STOP=1 -q -f supabase/tests/10_rls_test.sql
