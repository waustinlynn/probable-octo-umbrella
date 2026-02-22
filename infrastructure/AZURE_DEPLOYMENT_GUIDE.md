# Azure Deployment Guide

This guide covers deploying infrastructure to Azure using Terraform and GitHub Actions.

## Architecture Overview

### Azure Services Used

- **Azure Container Registry (ACR)** - Container image storage and management
- **Azure Container Apps** - Serverless containers for gRPC server
- **Azure Virtual Network (VNet)** - Network isolation and connectivity
- **Log Analytics Workspace** - Logging and monitoring
- **Azure Storage Account** - Terraform state management

### gRPC Server on Container Apps

Azure Container Apps is an ideal platform for gRPC services:

✅ **Benefits**:
- Automatic scaling based on HTTP/2 connections and CPU
- Built-in TLS termination
- TCP ingress support (required for gRPC)
- Lower cost than AKS for small-to-medium workloads
- Simplified networking with VNet integration
- Native support for gRPC protocols

## Prerequisites

### Local Setup

1. **Azure CLI**
```bash
# Install Azure CLI
# macOS
brew install azure-cli

# Windows/Linux
https://learn.microsoft.com/en-us/cli/azure/install-azure-cli

# Login and set subscription
az login
az account set --subscription <your-subscription-id>
```

2. **Terraform**
```bash
# Install Terraform 1.6+
brew install terraform  # macOS
# or download from https://www.terraform.io/downloads.html
```

3. **Verify Access**
```bash
# Verify Azure credentials
az account show

# Verify Terraform can initialize
cd infrastructure/terraform
terraform init
```

### GitHub Secrets (Required for CI/CD)

Add the following secrets to your GitHub repository settings:

**Settings → Secrets and variables → Actions**

```
AZURE_SUBSCRIPTION_ID          # Your Azure subscription ID
AZURE_TENANT_ID                # Azure Tenant ID (from az account show)
AZURE_CLIENT_ID                # Service Principal client ID
AZURE_CLIENT_SECRET            # Service Principal client secret (if not using OIDC)

AZURE_STATE_RG                 # Resource group containing state storage
AZURE_STATE_STORAGE            # Storage account name for Terraform state
AZURE_STATE_CONTAINER          # Blob container name (e.g., "terraform-state")
```

## Setting Up Azure State Management

Terraform state management is critical for production deployments. We use Azure Storage for remote state with locks to prevent concurrent modifications.

### Step 1: Create State Storage Account

```bash
#!/bin/bash
set -e

# Variables
STATE_RG="language-terraform-state"
STATE_STORAGE="languageterraformstate"  # Must be globally unique
STATE_LOCATION="eastus"
STATE_CONTAINER="terraform-state"

# Create resource group
az group create \
  --name $STATE_RG \
  --location $STATE_LOCATION

# Create storage account
az storage account create \
  --name $STATE_STORAGE \
  --resource-group $STATE_RG \
  --location $STATE_LOCATION \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot \
  --https-only true

# Create blob container
az storage container create \
  --name $STATE_CONTAINER \
  --account-name $STATE_STORAGE

# Enable versioning for state rollback
az storage account blob-service-properties update \
  --account-name $STATE_STORAGE \
  --resource-group $STATE_RG \
  --enable-versioning true

echo "State storage created:"
echo "  Resource Group: $STATE_RG"
echo "  Storage Account: $STATE_STORAGE"
echo "  Container: $STATE_CONTAINER"
echo ""
echo "Add these to GitHub Secrets:"
echo "  AZURE_STATE_RG=$STATE_RG"
echo "  AZURE_STATE_STORAGE=$STATE_STORAGE"
echo "  AZURE_STATE_CONTAINER=$STATE_CONTAINER"
```

### Step 2: Enable Terraform Backend

Uncomment the backend configuration in `infrastructure/terraform/providers.tf`:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "language-terraform-state"
    storage_account_name = "languageterraformstate"
    container_name       = "terraform-state"
    key                  = "language/terraform.tfstate"
  }
}
```

Then initialize:

```bash
cd infrastructure/terraform

# Initialize with backend configuration
terraform init \
  -backend-config="resource_group_name=language-terraform-state" \
  -backend-config="storage_account_name=languageterraformstate" \
  -backend-config="container_name=terraform-state" \
  -backend-config="key=language/terraform.tfstate"

# Verify state is in remote storage
terraform state list
```

### Deployment Locks

Azure Storage automatically handles concurrent access:
- **Lease locks** prevent multiple terraform operations simultaneously
- **Blob versioning** allows rollback to previous states
- **Access control** via Storage Account keys or Managed Identity

## Service Principal Setup (OIDC Authentication)

This project uses **Azure AD OIDC for keyless authentication**. No static secrets!

### Setup OIDC Service Principal

```bash
#!/bin/bash
set -e

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query homeTenantId -o tsv)
APP_NAME="language-github-actions"
GITHUB_REPO="YOUR_ORG/YOUR_REPO"  # Update this!

echo "Creating Service Principal with OIDC..."

# Create app registration
APP=$(az ad app create --display-name $APP_NAME)
APP_ID=$(echo $APP | jq -r '.appId')

echo "Created app: $APP_ID"

# Create service principal
az ad sp create --id $APP_ID
echo "Created service principal"

# Grant Contributor role on subscription
az role assignment create \
  --assignee $APP_ID \
  --role "Contributor" \
  --scope "/subscriptions/$SUBSCRIPTION_ID"

echo "Granted Contributor role"

# Configure OIDC for main branch
echo "Configuring OIDC for main branch..."
az identity federated-credentials create \
  --resource-group $(az account show --query id -o tsv | cut -d/ -f3) \
  --identity-name $APP_NAME \
  --name "GitHubActions-Main" \
  --issuer "https://token.actions.githubusercontent.com" \
  --subject "repo:$GITHUB_REPO:ref:refs/heads/main" \
  --audiences "api://AzureADTokenExchange" 2>/dev/null || \
az ad app federated-credential create \
  --id $APP_ID \
  --parameters @- <<EOF
{
  "name": "GitHubActions-Main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:$GITHUB_REPO:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}
EOF

echo "Configured OIDC"
echo ""
echo "✅ OIDC Setup Complete!"
echo ""
echo "Add these to GitHub Secrets (Settings → Secrets and variables → Actions):"
echo ""
echo "  AZURE_CLIENT_ID=$APP_ID"
echo "  AZURE_TENANT_ID=$TENANT_ID"
echo "  AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID"
echo "  AZURE_STATE_RG=language-terraform-state"
echo "  AZURE_STATE_STORAGE=languageterraformstate"
echo "  AZURE_STATE_CONTAINER=terraform-state"
```

### Why OIDC Only?

✅ **Security Benefits:**
- No static secrets to leak or rotate
- Tokens valid for ~1 hour only
- Automatic expiration
- Audit trail shows which workflow ran

✅ **Operational Benefits:**
- Zero secret rotation overhead
- No credential compromise risk
- Can restrict to specific branches
- GitHub manages token generation

✅ **Best Practice:**
- Industry standard for CI/CD
- Recommended by Microsoft
- Required by security policies in many enterprises

## Local Terraform Workflow

### Plan Infrastructure Changes

```bash
cd infrastructure/terraform

# Format check
terraform fmt -recursive

# Initialize backend
terraform init

# Validate configuration
terraform validate

# Plan changes (safe, read-only)
terraform plan \
  -var-file="terraform.tfvars" \
  -var="environment=dev" \
  -out=tfplan
```

### Review Plan Output

```bash
# View plan in human-readable format
terraform show tfplan

# Get specific resource details
terraform show tfplan | grep -A 5 "azurerm_container_app.server"
```

### Apply Infrastructure Changes

```bash
# Apply pre-generated plan
terraform apply tfplan

# Or apply with interactive approval
terraform apply \
  -var-file="terraform.tfvars" \
  -var="environment=dev"

# View outputs
terraform output
terraform output server_container_app_fqdn
```

## GitHub Actions Deployment

### Workflow Triggers

The deployment workflow (`deploy.yml`) is triggered by:

1. **Push to main** with infrastructure changes
   - Plans infrastructure
   - Requires manual approval
   - Applies changes to production

2. **Pull Request to main**
   - Plans infrastructure
   - Comments plan details on PR
   - No automatic apply

3. **Manual trigger** (workflow_dispatch)
   - Runs destroy plan for decommissioning

### Deployment Process

#### For Pull Requests

1. Developer pushes changes to feature branch
2. GitHub Actions runs `terraform plan`
3. Plan output commented on PR
4. Reviewers can see proposed changes
5. Changes are **not applied** until PR is merged

#### For Main Branch Merges

1. PR is merged to main
2. `terraform plan` runs again
3. **Requires manual approval** in GitHub environment
4. After approval, `terraform apply` executes
5. Outputs exported for downstream steps

### Viewing Deployment Status

```bash
# View workflow runs
gh run list --workflow deploy.yml

# View specific run details
gh run view <run-id> --log

# Monitor logs live
gh run watch <run-id>
```

## Container Registry Management

### Building and Pushing Images

The build workflow automatically:
1. Builds server and client Docker images
2. Pushes to Azure Container Registry
3. Tags with git commit SHA and version

### Manual Image Push (Local)

```bash
# Get ACR credentials
az acr login --name languageregistry

# Tag local image
docker tag myserver:latest languageregistry.azurecr.io/server:latest

# Push to ACR
docker push languageregistry.azurecr.io/server:latest

# List repositories
az acr repository list --name languageregistry

# List image tags
az acr repository show-tags --name languageregistry --repository server
```

### Using Images in Container Apps

```bash
# Update Container App with new image
az containerapp update \
  --resource-group language-rg \
  --name language-server \
  --image languageregistry.azurecr.io/server:new-tag
```

## Monitoring and Troubleshooting

### View Container App Logs

```bash
# Stream real-time logs
az containerapp logs show \
  --resource-group language-rg \
  --name language-server \
  --follow

# View recent logs
az containerapp logs show \
  --resource-group language-rg \
  --name language-server \
  --tail 50
```

### Test gRPC Server Connectivity

```bash
# Get server FQDN
FQDN=$(terraform output -raw server_container_app_fqdn)

# Test connection (requires gRPC client tools)
grpcurl -plaintext $FQDN list

# Or use curl for health checks
curl -i https://$FQDN/health
```

### Common Issues

#### Terraform Lock Timeout

**Problem**: "Error acquiring the state lock"

**Solution**:
```bash
# Force unlock (careful!)
terraform force-unlock <lock-id>

# Check current locks in Azure
az storage blob list \
  --account-name languageterraformstate \
  --container-name terraform-state \
  --query "[].name"
```

#### Image Pull Errors

**Problem**: Container App fails to start with image pull error

**Solution**:
```bash
# Verify image exists in ACR
az acr repository show-tags --name languageregistry --repository server

# Check ACR credentials
az acr credential show --name languageregistry

# Update container app with correct image
terraform apply -target=azurerm_container_app.server
```

#### State Mismatch

**Problem**: Local state differs from remote state

**Solution**:
```bash
# Pull latest remote state
terraform refresh

# Compare states
terraform state pull | jq . > remote-state.json
terraform state push remote-state.json  # only if confident
```

## Scaling and Performance

### Horizontal Scaling

```bash
# Update replicas in terraform.tfvars
server_replicas = 5

# Apply changes
terraform apply

# Or via Azure CLI
az containerapp revision copy \
  --resource-group language-rg \
  --name language-server \
  --min-replicas 5
```

### Vertical Scaling

```bash
# Update CPU/memory in terraform.tfvars
server_cpu    = "1.0"
server_memory = "2.0"

# Apply changes
terraform apply
```

### Monitor Auto-Scaling

```bash
# Check replica count
az containerapp show \
  --resource-group language-rg \
  --name language-server \
  --query "template.scale"

# View metrics in Azure Portal
# Resource → Metrics → CPU % / Memory % / Replica Count
```

## Cost Optimization

Azure Container Apps pricing is based on:
- **vCPU-seconds**: Amount of CPU time consumed
- **Memory**: Amount of memory allocated
- **Requests**: HTTP requests processed (first 2M free)

### Cost-Saving Tips

1. Right-size CPU/memory allocations
2. Use appropriate min/max replicas
3. Delete unused resources regularly
4. Use dev environment for testing
5. Monitor resource utilization

```bash
# View resource consumption
az containerapp metrics show \
  --resource-group language-rg \
  --name language-server \
  --metric cpu-usage

# Estimate monthly costs
# 2 replicas × 0.5 vCPU × 730 hours × $0.051 = ~$37/month
```

## Security Best Practices

1. **Image Scanning**
   ```bash
   az acr scan --name languageregistry --repository server
   ```

2. **Network Security**
   - Container Apps in VNet (isolated)
   - Firewall rules on ACR
   - Network Security Groups

3. **Secrets Management**
   - Store in Azure Key Vault
   - Reference in Container Apps
   - Rotate regularly

4. **Access Control**
   - Use RBAC roles
   - Least privilege principle
   - Audit logging enabled

5. **Compliance**
   - Enable encryption at rest
   - Use managed identities
   - Regular backups

## Related Documentation

- [Azure Container Apps Documentation](https://docs.microsoft.com/en-us/azure/container-apps/)
- [Terraform Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [gRPC Performance Best Practices](https://grpc.io/docs/guides/performance-best-practices/)
- See `infrastructure/README.md` for general infrastructure overview
