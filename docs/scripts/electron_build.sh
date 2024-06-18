#!/bin/sh
# ===========================================================================
# File: electron_dev
# Description: usage: ./electron_dev
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
CGO_ENABLED=1 go build -p=8 --tags "release" -ldflags "-w" -o "${DESKTOP_DIR}/dbo" "${BACKEND_DIR}"/*.go
echo "${GREEN}Completed building DBO backend."

echo ""
echo "Step 2 - building DBO frontend..."
if command -v pnpm >/dev/null; then
   pnpm --dir ${FRONTEND_DIR} i && pnpm --dir ${FRONTEND_DIR} build
else
   npm --prefix ${FRONTEND_DIR} i && npm --prefix ${FRONTEND_DIR} run build
fi

# echo ""
# echo "Step 2 - start DBO electron..."

# npm --prefix "${FRONTEND_DIR}" i && 
# npm --prefix "${FRONTEND_DIR}" run dev &&

# npm --prefix "${DESKTOP_DIR}" i &&
# npm --prefix "${DESKTOP_DIR}" run dev &&

# wait
