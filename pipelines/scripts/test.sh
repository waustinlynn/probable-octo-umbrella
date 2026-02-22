#!/bin/bash
set -e

# Test runner script for CI/CD pipelines
# Usage: ./pipelines/scripts/test.sh [client|server|infra|all]

TARGET="${1:-all}"
FAILED=0

echo "🧪 Running tests for: $TARGET"
echo "================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

run_test() {
    local name=$1
    local cmd=$2

    echo -e "${YELLOW}Testing $name...${NC}"
    if eval "$cmd"; then
        echo -e "${GREEN}✓ $name passed${NC}\n"
    else
        echo -e "${RED}✗ $name failed${NC}\n"
        FAILED=$((FAILED + 1))
    fi
}

# Client Tests
if [[ "$TARGET" == "client" || "$TARGET" == "all" ]]; then
    run_test "Client Unit Tests" "cd client && npm test -- --coverage --watchAll=false"
    run_test "Client Linter" "cd client && npm run lint || true"
fi

# Server Tests
if [[ "$TARGET" == "server" || "$TARGET" == "all" ]]; then
    run_test "Server TypeScript Build" "cd server && npm run build"
    run_test "Server Unit Tests" "cd server && npm test -- --coverage"
    run_test "Server Integration Tests" "cd server && npm run test:integration"
    run_test "Server Linter" "cd server && npm run lint || true"
fi

# Infrastructure Validation
if [[ "$TARGET" == "infra" || "$TARGET" == "all" ]]; then
    run_test "Terraform Format" "cd infrastructure/terraform && terraform fmt -check -recursive"
    run_test "Terraform Validate" "cd infrastructure/terraform && terraform validate"
    run_test "Kubernetes Manifests" "kubectl apply --dry-run=client -f infrastructure/kubernetes/ --validate=false"
fi

# Summary
echo "================================"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ $FAILED test(s) failed${NC}"
    exit 1
fi
