#!/bin/sh
# ===========================================================================
# File: build_init.sh
# Description: common variables & functions for the build scripts.
# ===========================================================================

set -e

# Global variables
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Invoke from project root
VERSION=$(cat ./scripts/VERSION)
BACKEND_DIR=./../backend
FRONTEND_DIR=./../frontend
DESKTOP_DIR=./../desktop

## check go version
check_go() {
    GO_VERSION=$(go version | {
        read _ _ v _
        echo ${v#go}
    })
    if [ "$(version "${GO_VERSION}")" -lt "$(version 1.22.0)" ]; then
        echo "${RED}Recheck failed.${NC} Require go version >= 1.22. Current version ${GO_VERSION}."
        exit 1
    fi
}

## check node version
check_node() {
    NODE_VERSION=$(node -v | {
        read v
        echo ${v#v}
    })
    if [ "$(version ${NODE_VERSION})" -lt "$(version 20.12.2)" ]; then
        echo "${RED}Recheck failed.${NC} Require node.js version >= 20.12.2. Current version ${NODE_VERSION}."
        exit 1
    fi
}

## check npm installed
check_npm() {
    if ! command -v npm >/dev/null; then
        echo "${RED}Recheck failed.${NC} npm is not installed."
        exit 1
    fi
}

## check typescript installed
check_typescript() {
    if ! command -v tsc >/dev/null; then
        echo "${RED}Recheck failed.${NC} typescript is not installed."
        exit 1
    fi
}


# Version function used for version string comparison
version() { echo "$@" | awk -F. '{ printf("%d%03d%03d%03d\n", $1,$2,$3,$4); }'; }

# Ensure output directory existed
mkdir_output() {
    if [ -z "$1" ]; then
        mkdir -p ./../build
        mkdir -p ./../build/out
        OUTPUT_DIR=$(cd ./../build >/dev/null && pwd)
    else
        OUTPUT_DIR="$1"
    fi
    echo "$OUTPUT_DIR"
}

#echo ""
#echo "Load environments"
#eval "$(
#  cat ./../.env | awk '!/^\s*#/' | awk '!/^\s*$/' | while IFS='' read -r line; do
#    key=$(echo "$line" | cut -d '=' -f 1)
#    value=$(echo "$line" | cut -d '=' -f 2-)
#    echo "export $key=\"$value\""
#  done
#)"
