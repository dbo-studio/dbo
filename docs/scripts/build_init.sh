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

get_platform_name() {
   # Get the architecture
    ARCH=$(uname -m)

    # Map the architecture to desired format
    case "$ARCH" in
        x86_64) ARCH="x86_64" ;;
        i386) ARCH="i386" ;;
        armv7l) ARCH="arm" ;;
        aarch64) ARCH="aarch64" ;;
        arm64) ARCH="aarch64" ;; # Add support for arm64 architecture
        *) echo "Unsupported architecture: $ARCH"; return 1 ;;
    esac

    # Get the operating system
    OS=$(uname -s)

    # Map the OS to desired format
    case "$OS" in
        Darwin) OS="apple-darwin" ;;
        Linux) OS="unknown-linux-gnu" ;;
        CYGWIN*|MINGW32*|MSYS*|MINGW*) OS="windows" ;;
        *) echo "Unsupported OS: $OS"; return 1 ;;
    esac

    # Construct the platform-specific name
    PLATFORM_NAME="${ARCH}-${OS}"

    # Return the platform-specific name
    echo "$PLATFORM_NAME"
}

build_backend(){
    cd "${BACKEND_DIR}" && go mod download
    CGO_ENABLED=1 go build -p=8 --tags "release" -ldflags "-w" -o "${DESKTOP_DIR}/assets/dbo-$(get_platform_name)" "${BACKEND_DIR}"/*.go
}