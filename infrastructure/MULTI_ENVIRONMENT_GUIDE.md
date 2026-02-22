# Multi-Environment Deployment Guide

Deploy separate infrastructure for dev, staging, and production environments with isolated state files and configurations.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    Azure Subscription                        │
├──────────────┬──────────────────┬──────────────────────────┤
│              │                  │                          │
│   Dev Env    │   Staging Env    │   Production Env        │
│              │                  │                          │
│ language-dev │ language-staging │ language-prod           │
│              │                  │                          │
│ - Resource   │ - Resource       │ - Resource              │
│   Group      │   Group          │   Group                 │
│ - Container  │ - Container      │ - Container             │
│   Apps       │   Apps           │   Apps (2+ replicas)    │
│ - ACR        │ - ACR            │ - ACR                   │
│ - VNet       │ - VNet           │ - VNet                  │
└──────────────┴──────────────────┴──────────────────────────┘
```

## State File Organization

Each environment has its own state file in Azure Storage:

```
Azure Storage Account: languageterraformstate
│
├── Container: terraform-state
│   ├── Blob: language-dev.tfstate       (dev environment)
│   ├── Blob: language-staging.tfstate   (staging environment)
│   └── Blob: language-prod.tfstate      (production environment)
│
└── Diagnostic Logs
    └── Audit trail for all state changes
```

### State File Isolation Benefits

✅ **Independent scaling** - Each environment can have different replica counts
✅ **Cost control** - Dev can be small, prod can be large
✅ **Blast radius** - Dev changes don't affect prod
✅ **Team access** - Can grant different permissions per environment
✅ **Rollback isolation** - Roll back one environment without affecting others
✅ **Testing** - Test infrastructure changes safely in dev/staging first

## Configuration Files

### Terraform Variables Files

Create environment-specific tfvars files:

```
infrastructure/terraform/
├── terraform.tfvars.example         # Template
├── environments/
│   ├── dev.tfvars                  # Dev environment
│   ├── staging.tfvars              # Staging environment
│   └── prod.tfvars                 # Production environment
├── main.tf
├── variables.tf
├── outputs.tf
└── providers.tf
```

### Example: dev.tfvars

```hcl
# Dev Environment Configuration
azure_subscription_id = "00000000-0000-0000-0000-000000000000"
azure_region          = "eastus"
environment           = "dev"

# Resource names
resource_group_name      = "language-dev-rg"
container_registry_name  = "languagedevregistry"

# Server configuration (small for dev)
server_image  = "languagedevregistry.azurecr.io/server:latest"
server_cpu    = "0.25"        # Smaller in dev
server_memory = "0.5"         # Smaller in dev
server_replicas = 1           # Single replica ok in dev

# Tagging
tags = {
  Environment = "dev"
  Team        = "backend"
  ManagedBy   = "Terraform"
}
```

### Example: staging.tfvars

```hcl
# Staging Environment Configuration
azure_subscription_id = "00000000-0000-0000-0000-000000000000"
azure_region          = "eastus"
environment           = "staging"

# Resource names
resource_group_name      = "language-staging-rg"
container_registry_name  = "languagestagingregistry"

# Server configuration (medium)
server_image  = "languagestagingregistry.azurecr.io/server:latest"
server_cpu    = "0.5"
server_memory = "1.0"
server_replicas = 2       # HA ready

# Tagging
tags = {
  Environment = "staging"
  Team        = "backend"
  ManagedBy   = "Terraform"
}
```

### Example: prod.tfvars

```hcl
# Production Environment Configuration
azure_subscription_id = "00000000-0000-0000-0000-000000000000"
azure_region          = "eastus"
environment           = "prod"

# Resource names
resource_group_name      = "language-prod-rg"
container_registry_name  = "languageprodregistry"

# Server configuration (large)
server_image  = "languageprodregistry.azurecr.io/server:latest"
server_cpu    = "1.0"          # More CPU for prod
server_memory = "2.0"          # More memory for prod
server_replicas = 3            # High availability

# Tagging
tags = {
  Environment = "production"
  Team        = "backend"
  ManagedBy   = "Terraform"
  CostCenter  = "Engineering"
}
```

## Deployment Workflow per Environment

### Dev Deployment

**Trigger:**
```bash
gh workflow run deploy.yml -f action=plan -f environment=dev
gh workflow run deploy.yml -f action=apply -f environment=dev
```

**Or manually:**
1. Actions → Deploy Infrastructure
2. Run workflow
3. Select environment: "dev"
4. Select action: "plan" or "apply"

**Features:**
- Uses `environments/dev.tfvars`
- State file: `language-dev.tfstate`
- Faster iterations
- Can have breaking changes
- Low resource allocation

### Staging Deployment

**Trigger:**
```bash
gh workflow run deploy.yml -f action=plan -f environment=staging
gh workflow run deploy.yml -f action=apply -f environment=staging
```

**Features:**
- Uses `environments/staging.tfvars`
- State file: `language-staging.tfstate`
- Near-production setup
- HA testing ground
- Medium resource allocation
- Manual approval recommended

### Production Deployment

**Trigger:**
```bash
gh workflow run deploy.yml -f action=plan -f environment=prod
gh workflow run deploy.yml -f action=apply -f environment=prod
```

**Features:**
- Uses `environments/prod.tfvars`
- State file: `language-prod.tfstate`
- Highest resource allocation
- Manual approval **required**
- Requires multiple reviewers
- Fully audited
- Backup/recovery procedures active

## Backend Configuration

The `key` parameter in the backend configuration **differentiates between state files**:

```
language-dev.tfstate       ← key=language-dev.tfstate
language-staging.tfstate   ← key=language-staging.tfstate
language-prod.tfstate      ← key=language-prod.tfstate
```

**Important:** Backend configuration cannot use variables directly (Terraform limitation). Instead, use `terraform init -backend-config` flags:

```bash
# For dev environment
terraform init \
  -backend-config="key=language-dev.tfstate"

# For staging environment
terraform init \
  -backend-config="key=language-staging.tfstate"

# For production environment
terraform init \
  -backend-config="key=language-prod.tfstate"
```

The GitHub Actions workflow automatically sets the correct key based on your environment selection. See [BACKEND_CONFIGURATION.md](./BACKEND_CONFIGURATION.md) for detailed explanation.

## Setting Up Environments

### Step 1: Create Terraform Variables Files

```bash
cd infrastructure/terraform/environments

# Create dev environment
cat > dev.tfvars <<EOF
azure_subscription_id = "YOUR_SUBSCRIPTION_ID"
azure_region          = "eastus"
environment           = "dev"
resource_group_name   = "language-dev-rg"
container_registry_name = "languagedevregistry"
server_image          = "languagedevregistry.azurecr.io/server:latest"
server_cpu            = "0.25"
server_memory         = "0.5"
server_replicas       = 1
tags = {
  Environment = "dev"
}
EOF

# Similarly for staging and prod
```

### Step 2: Create Separate State Files

Add each environment to Azure backend configuration:

```bash
# Dev state
az storage blob create \
  --account-name languageterraformstate \
  --container-name terraform-state \
  --name language-dev.tfstate \
  --type PageBlob

# Staging state
az storage blob create \
  --account-name languageterraformstate \
  --container-name terraform-state \
  --name language-staging.tfstate \
  --type PageBlob

# Prod state
az storage blob create \
  --account-name languageterraformstate \
  --container-name terraform-state \
  --name language-prod.tfstate \
  --type PageBlob
```

### Step 3: Update GitHub Actions Workflow

The workflow automatically handles environment selection:

```yaml
on:
  workflow_dispatch:
    inputs:
      action:
        description: 'Action'
        required: true
        type: choice
        options: [plan, apply, destroy-plan]
      environment:
        description: 'Environment'
        required: true
        default: 'dev'
        type: choice
        options: [dev, staging, prod]
```

## Local Development per Environment

### Plan Dev Environment

```bash
cd infrastructure/terraform

# Initialize with dev state
# The 'key' parameter selects which state file to use
terraform init \
  -backend-config="resource_group_name=language-terraform-state" \
  -backend-config="storage_account_name=languageterraformstate" \
  -backend-config="container_name=terraform-state" \
  -backend-config="key=language-dev.tfstate"

# Plan dev changes
terraform plan \
  -var-file="environments/dev.tfvars" \
  -out=tfplan-dev
```

### Switch to Production Environment

**Important:** Always re-initialize when switching environments!

```bash
cd infrastructure/terraform

# Initialize with prod state
# This switches to a different state file (language-prod.tfstate)
terraform init \
  -backend-config="resource_group_name=language-terraform-state" \
  -backend-config="storage_account_name=languageterraformstate" \
  -backend-config="container_name=terraform-state" \
  -backend-config="key=language-prod.tfstate"

# Plan prod changes
terraform plan \
  -var-file="environments/prod.tfvars" \
  -out=tfplan-prod
```

**Why re-initialize is needed:**
- Backend config is set at init time
- The `key` parameter selects which blob (state file) to use
- Switching environments requires switching state files
- Without re-init, Terraform uses wrong state file

### Apply to Specific Environment

```bash
# Apply to dev only
terraform apply tfplan-dev

# Apply to prod only
terraform apply tfplan-prod
```

## Environment Promotion Workflow

Recommended workflow for testing and promotion:

```
1. Make changes in dev
   ├─ terraform plan -var-file="environments/dev.tfvars"
   ├─ Test infrastructure in dev
   └─ Verify application works

2. Promote to staging
   ├─ Copy tested terraform configs
   ├─ Apply to staging environment
   ├─ Run load tests
   └─ Verify monitoring/alerts

3. Promote to production
   ├─ Final review of all changes
   ├─ Manual approval required
   ├─ Apply to production
   └─ Monitor closely post-deployment
```

### Example: Promoting CPU Change

```bash
# 1. Test in dev
cd infrastructure/terraform
terraform apply \
  -var-file="environments/dev.tfvars" \
  -auto-approve

# Verify dev performance
az containerapp show -g language-dev-rg -n language-server

# 2. Roll out to staging
terraform apply \
  -var-file="environments/staging.tfvars" \
  -auto-approve

# Load test staging
ab -n 10000 https://language-server-staging.xxx/health

# 3. Deploy to production (manual)
terraform apply \
  -var-file="environments/prod.tfvars"
  # Review plan, then manually approve
```

## Access Control per Environment

### Configure GitHub Environments

For production safety, require approval:

**Settings → Environments → production**

1. **Deployment branches:** Only main
2. **Required reviewers:** Select team members
3. **Restrict:** To specific deployment branches

This ensures:
- ✅ Only main branch can deploy to prod
- ✅ Manual approval required
- ✅ Specific people must approve
- ✅ Audit trail of approvals

### RBAC in Azure

Grant different permissions per environment:

```bash
# Dev: Developers have full access
az role assignment create \
  --assignee developers@company.com \
  --role "Contributor" \
  --scope "/subscriptions/.../resourceGroups/language-dev-rg"

# Staging: DevOps team
az role assignment create \
  --assignee devops@company.com \
  --role "Contributor" \
  --scope "/subscriptions/.../resourceGroups/language-staging-rg"

# Prod: Only DevOps lead
az role assignment create \
  --assignee devops-lead@company.com \
  --role "Contributor" \
  --scope "/subscriptions/.../resourceGroups/language-prod-rg"
```

## Monitoring and Cost Tracking

### Cost by Environment

```bash
# View costs per environment
az consumption budget list --resource-group language-dev-rg
az consumption budget list --resource-group language-staging-rg
az consumption budget list --resource-group language-prod-rg

# Or via Azure Cost Management UI
# Subscriptions → Cost Management → Cost Analysis
# Filter by Resource Group
```

### Performance Monitoring

Each environment has its own monitoring:

```bash
# Dev metrics
az containerapp metrics show \
  --resource-group language-dev-rg \
  --name language-server

# Staging metrics
az containerapp metrics show \
  --resource-group language-staging-rg \
  --name language-server

# Production metrics
az containerapp metrics show \
  --resource-group language-prod-rg \
  --name language-server
```

## Disaster Recovery per Environment

### Rollback to Previous State

```bash
# Find previous version
az storage blob version list \
  --account-name languageterraformstate \
  --container-name terraform-state \
  --name language-prod.tfstate

# Restore production to previous version
az storage blob copy start \
  --account-name languageterraformstate \
  --container-name terraform-state \
  --source-uri "https://...?versionid=OLD_VERSION" \
  --destination-blob language-prod.tfstate

# Verify and reapply
terraform plan -var-file="environments/prod.tfvars"
terraform apply -var-file="environments/prod.tfvars"
```

### Independent Destruction

```bash
# Destroy dev only
terraform destroy \
  -var-file="environments/dev.tfvars" \
  -auto-approve

# Staging and prod remain untouched
```

## Best Practices

### Do's ✅

- ✅ Use different tfvars per environment
- ✅ Isolate state files per environment
- ✅ Test changes in dev first
- ✅ Promote through staging to prod
- ✅ Require approval for production
- ✅ Monitor costs per environment
- ✅ Use different resource group names
- ✅ Tag resources by environment

### Don'ts ❌

- ❌ Don't share state files between environments
- ❌ Don't apply prod changes without staging test
- ❌ Don't use same resource names across environments
- ❌ Don't skip approval process for production
- ❌ Don't deploy to prod from dev state
- ❌ Don't mix environment configurations
- ❌ Don't delete production state without backup

## Example Directory Structure

```
infrastructure/
├── terraform/
│   ├── main.tf                    # Environment-agnostic
│   ├── variables.tf               # Environment-agnostic
│   ├── outputs.tf                 # Environment-agnostic
│   ├── providers.tf               # Environment-agnostic
│   └── environments/
│       ├── dev.tfvars             # Dev-specific config
│       ├── staging.tfvars         # Staging-specific config
│       └── prod.tfvars            # Prod-specific config
├── AZURE_DEPLOYMENT_GUIDE.md      # General setup
├── MULTI_ENVIRONMENT_GUIDE.md     # This file
└── STATE_MANAGEMENT.md            # State details
```

## Troubleshooting

### Wrong State File Used

**Problem:** Applied to dev but prod changed

**Solution:**
1. Check which state file was used: `terraform state list`
2. Verify `language-prod.tfstate` wasn't modified
3. Restore from backup if needed
4. Always verify state file before apply!

### Environment Variables Not Loaded

**Problem:** Plan used wrong values

**Solution:**
```bash
# Verify tfvars is loaded
terraform plan -var-file="environments/prod.tfvars" -var-file=environments/prod.tfvars

# Check variable values
terraform console
> var.environment
"prod"
```

### State Lock on Different Environment

**Problem:** Dev state locked, can't apply to staging

**Solution:**
```bash
# State files are separate - this shouldn't happen
# If it does, check Azure Storage:
az storage blob show \
  --account-name languageterraformstate \
  --container-name terraform-state \
  --name language-dev.tfstate

# Force unlock only if necessary
terraform force-unlock <lock-id>
```

## Related Documentation

- [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md) - State files and locking
- [AZURE_DEPLOYMENT_GUIDE.md](./AZURE_DEPLOYMENT_GUIDE.md) - Azure setup
- [../.github/DEPLOYMENT_GUIDE.md](../.github/DEPLOYMENT_GUIDE.md) - GitHub Actions
- [TERRAFORM_QUICKSTART.md](../TERRAFORM_QUICKSTART.md) - Quick start guide
