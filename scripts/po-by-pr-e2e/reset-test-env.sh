#!/bin/bash
# Rebuild the TEST copy (sms_seals_test) from the live database and restart the test backend on port 4100.
# The live database (sms_seals) is only read by pg_dump. The test backend never points at the live database.
set -e
PG="/c/Program Files/PostgreSQL/18/bin"
export PGPASSWORD=postgres
HERE="$(cd "$(dirname "$0")" && pwd)"; LOG="$TEMP/sms-test-restore.log"

# stop the test backend if it is running
for pid in $(netstat -ano | grep ":4100 " | grep LISTENING | awk '{print $5}' | sort -u); do
  taskkill //PID "$pid" //F > /dev/null 2>&1 || true
done
sleep 3

"$PG/psql" -q -h localhost -p 5434 -U postgres -d postgres -c "DROP DATABASE IF EXISTS sms_seals_test WITH (FORCE)" -c "CREATE DATABASE sms_seals_test"
"$PG/pg_dump" -h localhost -p 5434 -U postgres -d sms_seals --no-owner | "$PG/psql" -q -h localhost -p 5434 -U postgres -d sms_seals_test > "$LOG" 2>&1
echo "copy restored: $(grep -c ERROR "$LOG") errors"

powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File "$(cygpath -w "$HERE/start-test-backend.ps1")" > /dev/null 2>&1 &
for i in $(seq 1 60); do
  out=$(curl -s -m 3 http://localhost:4100/api/health || true)
  [ -n "$out" ] && break
  sleep 3
done
echo "test backend: $out"
