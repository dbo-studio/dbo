#!/bin/sh
# ===========================================================================
# File: build_bytebase
# Description: usage: ./build_bytebase [outdir]
# ===========================================================================

# exit when any command fails
set -e

cd "$(dirname "$0")/../"
. ./scripts/build_init.sh

OUTPUT_DIR=$(mkdir_output "$1")
OUTPUT_BINARY=$OUTPUT_DIR/dbo

GO_VERSION=`go version | { read _ _ v _; echo ${v#go}; }`
if [ "$(version ${GO_VERSION})" -lt "$(version 1.22.0)" ];
then
   echo "${RED}Precheck failed.${NC} Require go version >= 1.22. Current version ${GO_VERSION}."; exit 1;
fi

NODE_VERSION=`node -v | { read v; echo ${v#v}; }`
if [ "$(version ${NODE_VERSION})" -lt "$(version 20.12.2)" ];
then
   echo "${RED}Precheck failed.${NC} Require node.js version >= 20.12.2. Current version ${NODE_VERSION}."; exit 1;
fi

if ! command -v npm > /dev/null
then
   echo "${RED}Precheck failed.${NC} npm is not installed."; exit 1;
fi

# Step 1 - Build the frontend release version into the backend/api/server/dist folder
# Step 2 - Build the monolithic app by building backend release version together with the backend/api/server/dist.
echo "Start building Bytebase monolithic ${VERSION}..."

echo ""
echo "Step 1 - building Bytebase frontend..."

rm -rf ./backend/api/server/dist

BB_GIT_COMMIT_ID_FE=$(git rev-parse HEAD)
export BB_GIT_COMMIT_ID_FE

#if command -v pnpm > /dev/null
#then
#   pnpm --dir ./../frontend i && pnpm --dir ./../frontend build
#else
#   npm --prefix ./frontend run build
#fi

echo "Completed building Bytebase frontend."

echo ""
echo "Step 3 - Copy fronted to  backend/api/server/dist..."
cp -R ./../frontend/out ./../backend/api/server/dist

echo ""
echo "Step 2 - building Bytebase backend..."

cd ./../backend && go mod download
CGO_ENABLED=1 go build -p=8 --tags "release,embed_frontend" -ldflags "-w" -o "${OUTPUT_BINARY}" ./../backend/*.go

echo "Completed building Bytebase backend."

echo ""
echo "${GREEN}Completed building Bytebase monolithic ${VERSION} at ${OUTPUT_BINARY}.${NC}"