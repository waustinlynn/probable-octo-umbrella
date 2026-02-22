# Terraform on Azure - Quick Start Guide

Get up and running with Azure infrastructure deployments in 15 minutes.

## ⚡ Quick Note: Manual Workflows Only

**All GitHub Actions are triggered manually** (no automatic runs) to preserve your Azure credits until you're ready for production.

To deploy:
1. Make Terraform changes
2. Test locally with `terraform plan`
3. Push changes to GitHub
4. Go to Actions tab → "Deploy Infrastructure"
5. Click "Run workflow" and select "plan" or "apply"

This gives you full control and prevents accidental deployments.

## 1. One-Time Setup (15 minutes)

### Prerequisites
- Azure subscription with owner/contributor access
- `az` CLI installed and authenticated (`az login`)
- `terraform` 1.6+ installed
- GitHub repository access with admin permissions

### Step 1: Create Terraform State Storage (5 minutes)

Run this once to set up Azure Storage for shared state:

```bash
#!/bin/bash
set -e

STATE_RG="language-terraform-state"
STATE_STORAGE="languageterraformstate"
CONTAINER="terraform-state"
REGION="eastus"

echo "Creating state storage..."

# Create resource group
az group create --name $STATE_RG --location $REGION

# Create storage account
az storage account create \
  --name $STATE_STORAGE \
  --resource-group $STATE_RG \
  --location $REGION \
  --sku Standard_LRS \
  --https-only true

# Enable versioning
az storage account blob-service-properties update \
  --account-name $STATE_STORAGE \
  --resource-group $STATE_RG \
  --enable-versioning true

# Create blob container
az storage container create \
  --name $CONTAINER \
  --account-name $STATE_STORAGE

echo "✅ State storage ready!"
echo ""
echo "Add these to GitHub Secrets:"
echo "  AZURE_STATE_RG = $STATE_RG"
echo "  AZURE_STATE_STORAGE = $STATE_STORAGE"
echo "  AZURE_STATE_CONTAINER = $CONTAINER"
```

### Step 2: Set Up Service Principal for GitHub Actions (5 minutes)

Use OIDC (recommended - no secrets!):

```bash
#!/bin/bash
set -e

APP_NAME="github-actions-terraform"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query homeTenantId -o tsv)

echo "Creating Service Principal..."

# Create app registration
APP=$(az ad app create --display-name $APP_NAME)
CLIENT_ID=$(echo $APP | jq -r '.appId')

# Grant Contributor role
az role assignment create \
  --assignee $CLIENT_ID \
  --role "Contributor" \
  --scope "/subscriptions/$SUBSCRIPTION_ID"

# Configure OIDC
az identity federated-credentials create \
  --name "github-main" \
  --identity-name $CLIENT_ID \
  --issuer "https://token.actions.githubusercontent.com" \
  --subject "repo:YOUR_GITHUB_ORG/YOUR_REPO:ref:refs/heads/main" \
  --audiences "api://AzureADTokenExchange"

echo "✅ Service Principal created!"
echo ""
echo "Add these to GitHub Secrets:"
echo "  AZURE_CLIENT_ID = $CLIENT_ID"
echo "  AZURE_TENANT_ID = $TENANT_ID"
echo "  AZURE_SUBSCRIPTION_ID = $SUBSCRIPTION_ID"
```

### Step 3: Add GitHub Secrets

1. Go to GitHub: Settings → Secrets and variables → Actions
2. Add these 6 secrets:

```
AZURE_CLIENT_ID                # From step 2
AZURE_TENANT_ID                # From step 2
AZURE_SUBSCRIPTION_ID          # From step 2
AZURE_STATE_RG                 # From step 1
AZURE_STATE_STORAGE            # From step 1
AZURE_STATE_CONTAINER          # From step 1
```

Done! Setup is complete. ✅

## 2. Local Development (Per Change)

### First Time: Configure Local Terraform

```bash
cd infrastructure/terraform

# Copy example configuration
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
nano terraform.tfvars
# Replace YOUR_SUBSCRIPTION_ID with your actual subscription ID
# Set azure_region, resource_group_name, etc.
```

### Every Change: Plan and Push

```bash
# 1. Make changes to Terraform files
nano main.tf  # Edit infrastructure

# 2. Plan locally (read-only)
terraform validate
terraform plan -var-file="terraform.tfvars" -var="environment=dev"

# 3. Review plan output thoroughly!
# Make sure changes match your intentions

# 4. Push to GitHub (don't apply locally!)
git checkout -b infra/my-change
git add infrastructure/
git commit -m "infra(terraform): description of changes"
git push origin infra/my-change

# 5. Create PR on GitHub
# GitHub Actions automatically runs terraform plan
# Review the plan output in the PR comment

# 6. After approval, merge PR
# GitHub Actions automatically applies changes to production
```

## 3. GitHub Actions Workflow (Manual Only)

All deployments are **manual** to preserve credits. No automatic runs.

**To plan infrastructure:**
```
1. Go to Actions tab
2. Click "Deploy Infrastructure"
3. Click "Run workflow"
4. Select action: "plan"
5. Click "Run workflow"
   ↓
terraform plan runs
   ↓
View results in workflow summary
```

**To deploy infrastructure:**
```
1. After reviewing plan, go to Actions
2. Click "Deploy Infrastructure"
3. Click "Run workflow"
4. Select action: "apply"
5. Click "Run workflow"
   ↓
terraform plan (safety check)
   ↓
terraform apply (automated)
   ↓
Infrastructure deployed! ✅
```

## Common Operations

### View Current Infrastructure

```bash
cd infrastructure/terraform

# List all resources
terraform state list

# Show specific resource
terraform state show azurerm_container_app.server

# View all outputs
terraform output

# Get server FQDN
terraform output -raw server_container_app_fqdn
```

### Check Server Status

```bash
# Get container app details
az containerapp show \
  --resource-group language-rg \
  --name language-server \
  --output table

# View server logs
az containerapp logs show \
  --resource-group language-rg \
  --name language-server \
  --tail 50 \
  --follow
```

### Make Infrastructure Changes

1. **Edit terraform files:**
   ```bash
   nano infrastructure/terraform/main.tf
   # Change CPU from 0.5 to 1.0, add more replicas, etc.
   ```

2. **Plan locally:**
   ```bash
   terraform plan -var-file="terraform.tfvars" \
     -var="environment=prod"
   ```

3. **Review plan output carefully**
   - Verify all changes match your intentions
   - Check for unintended deletions
   - Look for cost implications

4. **Commit and push changes:**
   ```bash
   git add infrastructure/
   git commit -m "infra(terraform): increase CPU to 1.0 core"
   git push origin infra/increase-cpu
   ```

5. **Manually trigger GitHub Actions plan (optional):**
   - Go to Actions tab → Deploy Infrastructure
   - Click "Run workflow" → Select "plan"
   - Review results

6. **Manually trigger GitHub Actions apply:**
   - Go to Actions tab → Deploy Infrastructure
   - Click "Run workflow" → Select "apply"
   - Watch deployment in logs

### Rollback to Previous State

If something goes wrong:

```bash
# Find previous state version in Azure Storage
az storage blob version list \
  --account-name languageterraformstate \
  --container-name terraform-state \
  --name language-main.tfstate

# Restore specific version
az storage blob copy start \
  --account-name languageterraformstate \
  --container-name terraform-state \
  --source-uri "https://...?versionid=OLD_VERSION_ID" \
  --destination-blob language-main.tfstate

# Verify: terraform state list
```

## Troubleshooting

### Terraform Can't Find State

**Error:** "Error: Terraform command not found"

**Solution:**
```bash
# Ensure Terraform initialized
cd infrastructure/terraform
terraform init
```

### GitHub Actions Fails

**Error:** "Error acquiring the state lock"

**Solution:** Check Azure Storage is accessible:
```bash
# Verify secrets are set
echo $AZURE_CLIENT_ID
echo $AZURE_SUBSCRIPTION_ID

# Verify storage account exists
az storage account show --name languageterraformstate

# Try logging in manually
az login --use-device-code
```

### Secrets Not Working

**Error:** "Error: Invalid client credentials"

**Solution:**
1. Verify GitHub Secrets are set (Settings → Secrets)
2. Check secret names match exactly
3. Verify Service Principal has Contributor role:
   ```bash
   az role assignment list --assignee YOUR_CLIENT_ID
   ```

### State Out of Sync

**Error:** "Resource exists but not in state"

**Solution:**
```bash
# Import resource into state
terraform import azurerm_container_app.server \
  /subscriptions/xxx/resourceGroups/language-rg/providers/Microsoft.App/containerApps/language-server

# Verify
terraform state show azurerm_container_app.server
```

## Documentation

For detailed information, see:

| Document | Topic |
|----------|-------|
| [infrastructure/AZURE_DEPLOYMENT_GUIDE.md](./infrastructure/AZURE_DEPLOYMENT_GUIDE.md) | Complete Azure setup, scaling, cost optimization |
| [infrastructure/STATE_MANAGEMENT.md](./infrastructure/STATE_MANAGEMENT.md) | State storage, locking, versioning, rollback |
| [.github/DEPLOYMENT_GUIDE.md](./.github/DEPLOYMENT_GUIDE.md) | GitHub Actions workflow, approvals, secrets |
| [.github/PERMISSIONS_GUIDE.md](./.github/PERMISSIONS_GUIDE.md) | Authentication, RBAC, security model |

## Quick Reference

### Terraform Commands

```bash
cd infrastructure/terraform

terraform init              # Initialize (do once)
terraform fmt -check       # Check formatting
terraform validate         # Check syntax
terraform plan             # Preview changes
terraform apply            # Apply changes (DON'T use locally!)
terraform state list       # List resources
terraform output           # Show outputs
terraform show tfplan      # Inspect saved plan
```

### Azure CLI Commands

```bash
az login                           # Authenticate
az account set -s <sub-id>         # Switch subscription
az containerapp logs show ...       # View server logs
az resource list -g language-rg    # List resources
```

### GitHub Commands

```bash
gh run list --workflow deploy.yml           # View deployments
gh run view <run-id> --log                  # View logs
gh pr create --body "description"           # Create PR
gh run watch                                # Watch live
```

## Next Steps

1. ✅ Complete setup (state storage + service principal)
2. ✅ Configure local terraform.tfvars
3. ✅ Run `terraform plan` locally to preview infrastructure
4. ✅ Commit and push changes
5. ✅ Manually trigger GitHub Actions plan (optional)
   - Actions tab → Deploy Infrastructure → Run workflow → select "plan"
6. ✅ Review plan output carefully
7. ✅ Manually trigger GitHub Actions apply
   - Actions tab → Deploy Infrastructure → Run workflow → select "apply"

## Need Help?

- Deployment issues: See [.github/DEPLOYMENT_GUIDE.md](./.github/DEPLOYMENT_GUIDE.md)
- Azure/Terraform: See [infrastructure/AZURE_DEPLOYMENT_GUIDE.md](./infrastructure/AZURE_DEPLOYMENT_GUIDE.md)
- State/locking: See [infrastructure/STATE_MANAGEMENT.md](./infrastructure/STATE_MANAGEMENT.md)
- Permissions/secrets: See [.github/PERMISSIONS_GUIDE.md](./.github/PERMISSIONS_GUIDE.md)
