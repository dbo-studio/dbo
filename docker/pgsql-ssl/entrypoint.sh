#!/bin/bash
# Entrypoint for the TLS sample Postgres. Certs are mounted read-only from
# ./docker/pgsql-ssl/certs; copy them to a local dir so postgres can enforce
# its private-key permission checks regardless of the host filesystem.
set -e

CERT_SRC=/certs
CERT_DIR=/var/lib/postgresql/ssl-certs

mkdir -p "$CERT_DIR"
cp "$CERT_SRC/server.crt" "$CERT_SRC/server.key" "$CERT_DIR/"
chown postgres:postgres "$CERT_DIR" "$CERT_DIR"/*
chmod 600 "$CERT_DIR/server.key"
chmod 644 "$CERT_DIR/server.crt"

exec /usr/local/bin/docker-entrypoint.sh postgres \
  -c ssl=on \
  -c ssl_cert_file="$CERT_DIR/server.crt" \
  -c ssl_key_file="$CERT_DIR/server.key"
