#!/bin/sh
# ===========================================================================
# File: desktop_build
# Description: usage: ./desktop_dev
# ===========================================================================

cd "$(dirname "$0")/../"
. ./scripts/build_init.sh

# exit when any command fails
set -e

check_go
check_node
check_npm
check_typescript

echo ""
echo "Step 1 - building DBO Backend..."

build_backend
echo "${GREEN}Completed building DBO backend."

echo ""
echo "Step 2 - building DBO desktop..."
cd "${DESKTOP_DIR}"
tauri build
echo "${GREEN}Completed building DBO desktop."