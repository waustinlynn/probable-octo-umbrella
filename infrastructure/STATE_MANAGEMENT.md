# Terraform State Management and Deployment Locks

This document explains how Terraform state is managed in this project, including remote storage, locking mechanisms, and best practices.

## Overview

**Terraform State** is the single source of truth about deployed infrastructure. It maps Terraform configurations to real Azure resources.

**Critical Rule**: Never share state files in git repositories. Always use remote storage with locking.

## State Storage Architecture

```
┌─────────────────────────────────┐
│   Local Development Machine     │
│  (terraform plan/apply)         │
└────────────────┬────────────────┘
                 │
                 │ (authenticated)
                 ▼
┌─────────────────────────────────┐
│   Azure Storage Account         │
│  (language-terraform-state)     │
│                                 │
│  ├─ Container: terraform-state  │
│  │  └─ Blob: language-main.tfstate
│  │     ├─ Current version       │
│  │     ├─ Historical versions   │
│  │     └─ Lease lock            │
│  │                              │
│  └─ Diagnostic Logs             │
│     (audit trail)               │
└─────────────────────────────────┘
                 ▲
                 │ (authenticated)
                 │
┌────────────────┴────────────────┐
│  GitHub Actions Runners         │
│  (automated deployment)         │
└─────────────────────────────────┘
```

## Local Development State

When developing locally with `terraform plan`:

1. **No remote state used** - State stays local in `.terraform/`
2. **Use `-var-file="terraform.tfvars"`** to match production variables
3. **Never commit state files** - Add to `.gitignore`

```bash
# Local workflow
cd infrastructure/terraform
terraform init  # Uses local backend only
terraform plan  # Doesn't modify any state
terraform show  # Shows what would be deployed
```

**Local state never conflicts** with production because:
- GitHub Actions uses different state files per branch
- Local machines don't push changes to remote
- Multiple developers can plan independently

## Remote State Storage Setup

### Azure Storage Account Requirements

The storage account for Terraform state needs:

1. **Account Tier**: Standard or Premium
2. **Replication**: Geo-redundant (GRS) recommended
3. **Encryption**: Enabled (default)
4. **HTTPS Only**: Required
5. **Versioning**: Enabled for rollback
6. **Soft Delete**: Optional but recommended

### Initial Setup Script

```bash
#!/bin/bash
set -e

# Configuration
STATE_RG="language-terraform-state"
STATE_STORAGE="languageterraformstate"
STATE_LOCATION="eastus"
STATE_CONTAINER="terraform-state"

echo "Creating resource group..."
az group create \
  --name $STATE_RG \
  --location $STATE_LOCATION

echo "Creating storage account..."
az storage account create \
  --name $STATE_STORAGE \
  --resource-group $STATE_RG \
  --location $STATE_LOCATION \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot \
  --https-only true \
  --min-tls-version TLS1_2

echo "Enabling versioning..."
az storage account blob-service-properties update \
  --account-name $STATE_STORAGE \
  --resource-group $STATE_RG \
  --enable-versioning true \
  --enable-soft-delete-blob true \
  --soft-delete-blob-retention-days 7

echo "Creating blob container..."
az storage container create \
  --name $STATE_CONTAINER \
  --account-name $STATE_STORAGE

echo "✅ State storage ready!"
echo ""
echo "Add to GitHub Secrets:"
echo "  AZURE_STATE_RG=$STATE_RG"
echo "  AZURE_STATE_STORAGE=$STATE_STORAGE"
echo "  AZURE_STATE_CONTAINER=$STATE_CONTAINER"
```

## Deployment Locks

### How Locking Works

Azure Storage Blob Leases prevent concurrent modifications:

```
Time    Event
────────────────────────────────────────────────
T1      GitHub Actions runs: terraform init
        → Acquires lease on language-main.tfstate
        → Lease duration: 60 seconds (auto-renew)

T2      Developer runs: terraform init
        → Attempts to acquire lease
        → Lease is held by GitHub Actions
        → Request blocked until lease released

T3      GitHub Actions completes: terraform apply
        → Lease released automatically
        → terraform.tfstate written to storage

T4      Developer's request succeeds
        → Lease acquired
        → terraform.tfstate downloaded locally
```

### Lock Scenarios

**Scenario 1: Concurrent GitHub Actions Runs**

GitHub Actions prevents this via branch protection:
- Only main branch triggers apply
- PR runs only execute plan (read-only)
- Multiple developers can plan simultaneously

**Scenario 2: Local Development + GitHub Actions**

Recommended workflow:
```bash
# Developer machine
terraform plan -var-file="terraform.tfvars"
# Don't run terraform apply locally!

# Push to GitHub
git push origin feature-branch

# Create PR (triggers GitHub Actions plan)
# Review plan output in PR comment

# Merge PR (triggers GitHub Actions apply)
# Watch deployment in Actions tab
```

**Scenario 3: Stuck Lock**

If a workflow crashes and leaves a lock:

```bash
# Check lock state
az storage blob show \
  --account-name languageterraformstate \
  --container-name terraform-state \
  --name language-main.tfstate

# Force unlock (use only if necessary!)
terraform force-unlock <lock-id>

# Or manually break lease
az storage blob lease break \
  --account-name languageterraformstate \
  --container-name terraform-state \
  --blob-name language-main.tfstate
```

## State File Anatomy

### What's in the State File

The `.tfstate` file is JSON that includes:

```json
{
  "version": 4,
  "terraform_version": "1.6.0",
  "serial": 42,
  "lineage": "unique-identifier",
  "outputs": {
    "server_fqdn": {
      "value": "language-server.xxx.azurecontainerapps.io",
      "sensitive": false
    }
  },
  "resources": [
    {
      "type": "azurerm_container_app",
      "name": "server",
      "instances": [
        {
          "attributes": {
            "id": "/subscriptions/.../containerApps/language-server",
            "name": "language-server",
            "ingress": [...]
          }
        }
      ]
    }
  ]
}
```

### Sensitive Data in State

The state file contains **sensitive values** (passwords, connection strings, keys):

```hcl
resource "azurerm_container_registry" "main" {
  admin_password = "..."  # ← Stored unencrypted in state!
}

output "registry_password" {
  value     = azurerm_container_registry.main.admin_password
  sensitive = true        # ← Masked in logs only, still in state
}
```

**Protect the state file:**
- Store in encrypted storage (Azure Storage does this)
- Restrict access via RBAC
- Enable versioning for audit trail
- Never download/share state files
- Use Azure Key Vault for secrets

## Versioning and Rollback

### Enable Versioning

Versioning is **already configured** in the setup script above. Verify:

```bash
az storage account blob-service-properties show \
  --account-name languageterraformstate \
  --resource-group language-terraform-state
```

Should show:
```
"IsVersioningEnabled": true
```

### List State Versions

```bash
# View all versions of state file
az storage blob version list \
  --account-name languageterraformstate \
  --container-name terraform-state \
  --name language-main.tfstate \
  --output table
```

Output:
```
Name                    VersionId                         LastModified
──────────────────────  ────────────────────────────────  ─────────────────
language-main.tfstate   2024-02-22T10:30:45.1234567Z      2024-02-22 10:30
language-main.tfstate   2024-02-21T15:20:15.9876543Z      2024-02-21 15:20
language-main.tfstate   2024-02-20T09:10:05.5432109Z      2024-02-20 09:10
```

### Restore Previous State

If a deployment went wrong and you need to rollback:

```bash
#!/bin/bash
set -e

ACCOUNT="languageterraformstate"
CONTAINER="terraform-state"
BLOB="language-main.tfstate"
OLD_VERSION="2024-02-21T15:20:15.9876543Z"  # Get from version list

# Get the old version
OLD_URI=$(az storage blob version list \
  --account-name $ACCOUNT \
  --container-name $CONTAINER \
  --name $BLOB \
  --query "[?versionId=='$OLD_VERSION'].url" \
  -o tsv)

# Restore (creates new version)
az storage blob copy start \
  --account-name $ACCOUNT \
  --container-name $CONTAINER \
  --source-uri "$OLD_URI" \
  --destination-blob $BLOB

echo "State restored. Next steps:"
echo "1. Verify: terraform state list"
echo "2. Review: terraform plan"
echo "3. If correct: terraform apply"
```

## State Branching Strategy

Different branches can have isolated state:

```
main                          production
├─ language-main.tfstate
└─ Azure resources (prod)

develop                       staging
├─ language-develop.tfstate
└─ Azure resources (staging)

feature/*                     ephemeral
├─ language-{feature}.tfstate
└─ Shared test resources
```

### Multi-Environment Setup

To use separate states per environment:

1. **Create separate storage containers:**
```bash
az storage container create --name terraform-state-prod
az storage container create --name terraform-state-dev
```

2. **Or use separate keys:**
```bash
key = "language-${var.environment}.tfstate"
```

3. **Update GitHub Actions:**
```yaml
env:
  STATE_KEY: language-${{ github.ref_name }}.tfstate
```

## Monitoring and Auditing

### Storage Account Diagnostics

Enable logging to see all state access:

```bash
# Enable diagnostics
az storage account update \
  --name languageterraformstate \
  --resource-group language-terraform-state \
  --set properties.logging='{
    "version":"1.0",
    "read":true,
    "write":true,
    "delete":true,
    "retentionPolicy":{
      "enabled":true,
      "days":30
    }
  }'
```

### View Access Logs

```bash
# List logs in diagnostics container
az storage container list \
  --account-name languageterraformstate \
  --query "[?contains(name, 'diagnostics')]"

# Retrieve specific logs
az storage blob download \
  --account-name languageterraformstate \
  --container-name '$logs' \
  --name 'blob/2024/02/22/...'
```

### Track State Changes

```bash
# Who and when state was modified
az storage blob show-versions \
  --account-name languageterraformstate \
  --container-name terraform-state \
  --name language-main.tfstate \
  --query "[].properties" \
  --output table
```

## Best Practices

### Do's ✅

- ✅ Always use remote state for production
- ✅ Enable versioning on storage account
- ✅ Use RBAC to restrict state access
- ✅ Regularly review state versions
- ✅ Test rollbacks in staging
- ✅ Document state management procedures
- ✅ Use GitHub Actions for production applies
- ✅ Keep state files encrypted at rest

### Don'ts ❌

- ❌ Never commit `.tfstate` files to git
- ❌ Don't apply locally to main environment
- ❌ Don't force unlock without investigation
- ❌ Don't share state files via email/Slack
- ❌ Don't disable versioning
- ❌ Don't ignore Terraform locks
- ❌ Don't mix local and remote state operations
- ❌ Don't store secrets outside of state management

## Troubleshooting

### State is Out of Sync

**Problem**: Resources exist in Azure but not in state

**Solution**:
```bash
# Import resource into state
terraform import azurerm_resource_group.main /subscriptions/xxx/resourceGroups/language-rg

# Verify import
terraform state show azurerm_resource_group.main
```

### State Lock Timeout

**Problem**: `Error acquiring the state lock`

**Solution**:
```bash
# Check lock details
az storage blob properties show \
  --account-name languageterraformstate \
  --container-name terraform-state \
  --name language-main.tfstate

# If abandoned, force unlock
terraform force-unlock <lock-id>
```

### Missing State File

**Problem**: State file deleted from Azure Storage

**Solution**: Restore from version history or recreate:
```bash
# Destroy all resources first!
terraform destroy

# Remove state and start fresh
rm terraform.tfstate*

# Re-run terraform apply with new state
```

## Related Documentation

- [Terraform State](https://www.terraform.io/docs/state/)
- [Azure Storage Blobs Documentation](https://docs.microsoft.com/en-us/azure/storage/blobs/)
- [Azure Storage Lease Operations](https://docs.microsoft.com/en-us/rest/api/storageservices/lease-blob)
- See `AZURE_DEPLOYMENT_GUIDE.md` for deployment instructions
- See `.github/DEPLOYMENT_GUIDE.md` for GitHub Actions setup
