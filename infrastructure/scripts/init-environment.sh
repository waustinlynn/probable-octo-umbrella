#!/bin/bash
#
# Initialize Terraform for a specific environment
#
# Usage: ./scripts/init-environment.sh <environment>
#
# Examples:
#   ./scripts/init-environment.sh dev
#   ./scripts/init-environment.sh staging
#   ./scripts/init-environment.sh prod
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
TERRAFORM_DIR="$PROJECT_ROOT/infrastructure/terraform"

# Validate arguments
if [ -z "$1" ]; then
    echo "Usage: $(basename "$0") <environment>"
    echo ""
    echo "Available environments:"
    echo "  dev       - Development environment (small resources)"
    echo "  staging   - Staging environment (medium resources)"
    echo "  prod      - Production environment (large resources)"
    exit 1
fi

ENVIRONMENT="$1"

# Validate environment
case "$ENVIRONMENT" in
    dev|staging|prod)
        ;;
    *)
        echo "Error: Invalid environment '$ENVIRONMENT'"
        echo "Valid options: dev, staging, prod"
        exit 1
        ;;
esac

echo "Initializing Terraform for $ENVIRONMENT environment..."
echo ""

cd "$TERRAFORM_DIR"

# Check if tfvars file exists
TFVARS_FILE="environments/${ENVIRONMENT}.tfvars"
if [ ! -f "$TFVARS_FILE" ]; then
    echo "Error: Configuration file not found: $TFVARS_FILE"
    echo ""
    echo "Please create $TFVARS_FILE first."
    echo "See MULTI_ENVIRONMENT_GUIDE.md for examples."
    exit 1
fi

echo "Using configuration: $TFVARS_FILE"
echo ""

# Initialize Terraform with environment-specific state file
echo "Initializing backend with key: language-${ENVIRONMENT}.tfstate"
terraform init \
    -backend-config="resource_group_name=language-terraform-state" \
    -backend-config="storage_account_name=languageterraformstate" \
    -backend-config="container_name=terraform-state" \
    -backend-config="key=language-${ENVIRONMENT}.tfstate"

echo ""
echo "✅ Successfully initialized for $ENVIRONMENT environment"
echo ""
echo "Current state file: language-${ENVIRONMENT}.tfstate"
echo "Configuration file: $TFVARS_FILE"
echo ""
echo "Next steps:"
echo "  1. Review changes: terraform plan -var-file='$TFVARS_FILE'"
echo "  2. Apply changes: terraform apply"
echo ""
echo "To switch to a different environment, run this script again:"
echo "  ./scripts/init-environment.sh prod"
