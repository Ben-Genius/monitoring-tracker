#!/usr/bin/env bash
# Applies every migration to an EMPTY Postgres database, then runs the SQL
# tests in supabase/tests/*_test.sql. Used by CI; also runnable locally.
#
#   DATABASE_URL=postgres://postgres@127.0.0.1:5432/postgres scripts/test-db.sh
#
# Never point this at a real Supabase project: it creates stand-in auth and
# storage schemas and writes test rows.
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL to an empty Postgres database}"
cd "$(dirname "$0")/.."

psql_run() { psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -X "$@"; }

echo "→ Supabase stand-in"
psql_run -f supabase/tests/supabase_stub.sql

for f in supabase/migrations/*.sql; do
  echo "→ $(basename "$f")"
  psql_run -f "$f"
done

status=0
for t in supabase/tests/*_test.sql; do
  echo "→ TEST $(basename "$t")"
  psql_run -f "$t" || status=1
done
exit $status
