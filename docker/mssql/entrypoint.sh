#!/bin/bash
# Starts SQL Server, waits for it, applies /seed.sql (database `shop`), then
# touches /tmp/seeded which the compose healthcheck waits on. Data is not
# persisted — the seed runs on every container start.
set -e

/opt/mssql/bin/sqlservr &
SERVER_PID=$!

SQLCMD=$(command -v sqlcmd || echo /opt/mssql-tools18/bin/sqlcmd)

for i in $(seq 1 120); do
  if "$SQLCMD" -No -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -Q "SELECT 1" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

"$SQLCMD" -No -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -i /seed.sql
touch /tmp/seeded

wait $SERVER_PID
