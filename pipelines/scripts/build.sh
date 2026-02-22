#!/bin/bash
set -e

# Docker build script for CI/CD pipelines
# Usage: ./pipelines/scripts/build.sh [server|client|all]

TARGET="${1:-all}"
REGISTRY="${REGISTRY:-ghcr.io}"
IMAGE_NAME="${IMAGE_NAME:-language}"
TAG="${TAG:-latest}"

# Extract GitHub repo from git remote if available
if [ -z "$IMAGE_NAME" ]; then
    IMAGE_NAME=$(git config --get remote.origin.url | sed 's/.*\/\(.*\)\.git/\1/')
fi

echo "🐳 Building Docker images"
echo "================================"
echo "Registry: $REGISTRY"
echo "Image: $IMAGE_NAME"
echo "Tag: $TAG"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

build_image() {
    local name=$1
    local dockerfile=$2
    local image_name=$3

    local full_image="$REGISTRY/$IMAGE_NAME/$image_name:$TAG"

    echo -e "${YELLOW}Building $name...${NC}"
    echo "Image: $full_image"

    if docker build \
        -f "$dockerfile" \
        -t "$full_image" \
        --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
        --build-arg VCS_REF="$(git rev-parse --short HEAD)" \
        .; then
        echo -e "${GREEN}✓ $name built successfully${NC}\n"
    else
        echo -e "${RED}✗ $name build failed${NC}\n"
        return 1
    fi
}

FAILED=0

# Build Server
if [[ "$TARGET" == "server" || "$TARGET" == "all" ]]; then
    if ! build_image "Server" "infrastructure/docker/Dockerfile.server" "server"; then
        FAILED=$((FAILED + 1))
    fi
fi

# Build Client
if [[ "$TARGET" == "client" || "$TARGET" == "all" ]]; then
    if ! build_image "Client" "infrastructure/docker/Dockerfile.client" "client"; then
        FAILED=$((FAILED + 1))
    fi
fi

# Summary
echo "================================"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All images built successfully!${NC}"
    echo ""
    echo "To push images to registry:"
    if [[ "$TARGET" == "server" || "$TARGET" == "all" ]]; then
        echo "  docker push $REGISTRY/$IMAGE_NAME/server:$TAG"
    fi
    if [[ "$TARGET" == "client" || "$TARGET" == "all" ]]; then
        echo "  docker push $REGISTRY/$IMAGE_NAME/client:$TAG"
    fi
    exit 0
else
    echo -e "${RED}✗ $FAILED build(s) failed${NC}"
    exit 1
fi
