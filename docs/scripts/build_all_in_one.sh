#!/bin/sh
# ===========================================================================
# File: build_DBO
# Description: usage: ./build_DBO [outdir]
# ===========================================================================

# exit when any command fails
set -e

cd "$(dirname "$0")/../"
. ./scripts/build_init.sh

OUTPUT_DIR=$(mkdir_output "$1")
OUTPUT_BINARY=$OUTPUT_DIR/dbo
BACKEND_DIR=./../backend
FRONTEND_DIR=./../frontend

## check go version

GO_VERSION=`go version | { read _ _ v _; echo ${v#go}; }`
if [ "$(version "${GO_VERSION}")" -lt "$(version 1.22.0)" ];
then
   echo "${RED}Recheck failed.${NC} Require go version >= 1.22. Current version ${GO_VERSION}."; exit 1;
fi

## check node version

NODE_VERSION=`node -v | { read v; echo ${v#v}; }`
if [ "$(version ${NODE_VERSION})" -lt "$(version 20.12.2)" ];
then
   echo "${RED}Recheck failed.${NC} Require node.js version >= 20.12.2. Current version ${NODE_VERSION}."; exit 1;
fi

## check npm installed

if ! command -v npm > /dev/null
then
   echo "${RED}Recheck failed.${NC} npm is not installed."; exit 1;
fi

# Step 1 - Build the frontend release version into the backend folder
# Step 2 - Build the monolithic app by building backend release version together with the backend.
echo "Start building DBO monolithic ${VERSION}..."

echo ""
echo "Step 1 - building DBO frontend..."

rm -rf "${OUTPUT_DIR}"

BB_GIT_COMMIT_ID_FE=$(git rev-parse HEAD)
export BB_GIT_COMMIT_ID_FE

if command -v pnpm > /dev/null
then
   pnpm --dir ${FRONTEND_DIR} i && pnpm --dir ${FRONTEND_DIR} build
else
   npm --prefix ${FRONTEND_DIR} run build
fi

echo "Completed building DBO frontend."

echo ""
echo "Step 3 - Copy fronted to  backend/..."
mv ${FRONTEND_DIR}/out "${OUTPUT_DIR}/out"

echo ""
echo "Step 2 - building DBO backend..."

cd ${BACKEND_DIR} && go mod download
CGO_ENABLED=1 go build -p=8 --tags "release" -ldflags "-w" -o "${OUTPUT_BINARY}" ${BACKEND_DIR}/*.go

echo "Completed building DBO backend."

echo ""
echo "${GREEN}Completed building DBO monolithic ${VERSION} at ${OUTPUT_BINARY}.${NC}"