#!/bin/sh
# Seed data for the sample redis: one key of every type, a few TTL'd keys,
# and large collections to exercise paging (>1000 members). Idempotent —
# overwrites existing keys on re-run.
set -e

redis-cli SET sample:greeting "hello from dbo sample"
redis-cli HSET sample:user:1 name alice email alice@example.com age 30
redis-cli RPUSH sample:queue alpha beta gamma
redis-cli SADD sample:tags red green blue
redis-cli ZADD sample:board 100 player1 200 player2 300 player3
redis-cli JSON.SET sample:profile $ '{"name":"bob","roles":["admin","dev"]}' 2>/dev/null || true

# Keys with TTLs (60s window)
redis-cli SET sample:ttl:short "expires in 60s"
redis-cli EXPIRE sample:ttl:short 60
redis-cli SET sample:ttl:long "expires in a day"
redis-cli EXPIRE sample:ttl:long 86400

# Large collections for paging (>1000 members each)
i=1
while [ "$i" -le 1200 ]; do
  echo "member:$i" >> /tmp/seed-list.txt
  redis-cli SADD sample:big:set "member:$i" > /dev/null
  redis-cli ZADD sample:big:zset "$i" "member:$i" > /dev/null
  i=$((i + 1))
done
redis-cli RPUSH sample:big:list $(cat /tmp/seed-list.txt) > /dev/null
rm -f /tmp/seed-list.txt

echo "seed done"
