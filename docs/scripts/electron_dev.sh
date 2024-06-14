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
echo "Step 2 - start DBO electron..."
if command -v pnpm >/dev/null; then
    # pnpm --dir "${FRONTEND_DIR}" i && 
    # pnpm --dir "${FRONTEND_DIR}" run dev &

    pnpm --dir "${DESKTOP_DIR}" i &&
    pnpm --dir "${DESKTOP_DIR}" run dev &

    wait
else
    npm --dir "${FRONTEND_DIR}" i && pnpm -dir "${FRONTEND_DIR}" run electron-dev
    npm --dir "${FRONTEND_DIR}" i &&
    npm --dir "${DESKTOP_DIR}" i &&
    npm --dir "${FRONTEND_DIR}" run dev &
    NPM_FRONTEND_PID=$!
    pnpm --dir "${DESKTOP_DIR}" run dev &
    PNPM_DESKTOP_PID=$!

    wait $PNPM_FRONTEND_PID
    wait $PNPM_DESKTOP_PID
fi
