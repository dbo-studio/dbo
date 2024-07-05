#!/bin/sh
# ===========================================================================
# File: desktop_dev
# Description: usage: ./desktop_dev
# ===========================================================================

cd "$(dirname "$0")/../"
. ./scripts/build_init.sh

# exit when any command fails
set -e

check_go
check_node
check_npm

echo ""
echo "Step 1 - building DBO Backend..."

cd "${BACKEND_DIR}" && go mod download
build_backend
echo "${GREEN}Completed building DBO backend."

echo ""
echo "Step 2 - start DBO desktop..."

cd "${DESKTOP_DIR}"
tauri dev