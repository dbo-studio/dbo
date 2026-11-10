#!/bin/sh
# Starts redis in the background, waits until it answers, loads /seed.sh
# (every key type, TTLs, >1000-member collections), then stays in the
# foreground on the server process.
set -e

redis-server --save '' --appendonly no &
REDIS_PID=$!

until redis-cli ping 2>/dev/null | grep -q PONG; do
  sleep 0.2
done

sh /seed.sh

wait $REDIS_PID
