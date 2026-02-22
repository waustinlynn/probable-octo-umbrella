# GitHub Actions Terraform Deployment Guide

This guide covers how to deploy Azure infrastructure using GitHub Actions with Terraform state management, deployment locks, and security best practices.

## Quick Start

### Prerequisites

1. **Azure Resources Created**
   - Storage account for Terraform state (with container and versioning enabled)
   - Service Principal or OIDC app registration
   - Appropriate RBAC roles assigned

2. **GitHub Secrets Configured**
   - `AZURE_SUBSCRIPTION_ID`
   - `AZURE_TENANT_ID`
   - `AZURE_CLIENT_ID`
   - `AZURE_STATE_RG`
   - `AZURE_STATE_STORAGE`
   - `AZURE_STATE_CONTAINER`

3. **Terraform Configuration**
   - `infrastructure/terraform/terraform.tfvars` created (copy from `.example`)
   - Backend configuration uncommented in `providers.tf`

## Manual Deployment Workflow

All deployments are **manual** to preserve Azure credits until ready for production.

### Stage 1: Local Development

```
1. Edit Terraform files locally
   ↓
2. Run: terraform plan -var-file="terraform.tfvars"
   ↓
3. Review plan output
   ↓
4. Commit and push changes
```

**Never apply locally to production.**

### Stage 2: Manual Plan via GitHub Actions

When ready to see proposed changes in GitHub:

```
1. Go to Actions tab → Deploy Infrastructure
2. Click "Run workflow" button
3. Select action: "plan"
4. Click "Run workflow"
   ↓
5. Workflow runs terraform plan
   ↓
6. View results in workflow summary
   ↓
7. Artifacts available for download
```

**Plan output shows:**
```
Resource actions are as follows:

  # azurerm_container_app.server will be created
  + resource "azurerm_container_app" "server" {
      + id   = (known after apply)
      + name = "language-server"
      ...
    }

  Plan: 8 to add, 0 to change, 0 to destroy.
```

**Download artifacts:**
1. Click on the completed workflow run
2. Scroll to "Artifacts" section
3. Download "terraform-plan" file
4. Review locally: `terraform show tfplan`

### Stage 3: Manual Apply via GitHub Actions

When satisfied with the plan:

```
1. Go to Actions tab → Deploy Infrastructure
2. Click "Run workflow" button
3. Select action: "apply"
4. Click "Run workflow"
   ↓
5. Workflow plans again (safety check)
   ↓
6. Workflow applies the plan
   ↓
7. Infrastructure deployed to Azure! ✅
   ↓
8. Outputs logged (server FQDN, registry, etc.)
```

**What happens during apply:**
1. Terraform initializes with remote state
2. Acquires state lock from Azure Storage
3. Runs terraform plan (verifies nothing changed)
4. Applies infrastructure changes
5. Exports outputs
6. Releases state lock
7. Displays summary in workflow

## Permissions and Approvals

### GitHub Environments

The deploy workflow uses GitHub Environments to enforce approvals:

**Infrastructure Environment:**
- Required for: `plan` and `apply` jobs
- Purpose: Controls who can trigger deployments
- Approval: Manual review by designated users

**Setup in GitHub:**
1. Go to Settings → Environments
2. Create "infrastructure" environment
3. Set deployment branches: `main`
4. Set required reviewers (optional)
5. Restrict to OIDC token (recommended)

### RBAC Permissions

The service principal used by GitHub Actions requires:

**Role: Contributor**
- Scope: Subscription or specific resource group
- Allows: Create, modify, delete resources
- Restriction: Cannot modify IAM roles

**Recommended Minimal Roles:**
```
- Contributor on target resource group
- Storage Account Blob Data Contributor (for state)
- Reader on logging/monitoring resources
```

### GitHub Token Permissions

Workflow uses automatic GITHUB_TOKEN with:
- `contents: read` - Read repository
- `pull-requests: write` - Comment on PRs
- `id-token: write` - Use OIDC tokens

## State Management and Locks

### Remote State Storage

Terraform state is stored in Azure Storage:

**Location:**
```
Storage Account: languageterraformstate
Container: terraform-state
Key: language-{branch}.tfstate
```

**Benefits:**
- Single source of truth across team
- Automatic locking prevents conflicts
- Versioning enables state rollback
- Encrypted at rest

### Deployment Locks

Azure Storage automatically prevents concurrent deployments:

**How it works:**
1. When `terraform init` runs, it acquires a lease
2. If another deployment tries to run, it waits for lease
3. After `terraform apply`, lease is released
4. Concurrent deployments are serialized

**Monitoring Locks:**
```bash
# View current locks
az storage blob list \
  --account-name languageterraformstate \
  --container-name terraform-state

# Force unlock if necessary (use with caution!)
terraform force-unlock <lock-id>
```

### State Isolation by Branch

Different branches use different state files:

- `language-main.tfstate` → Production (main branch)
- `language-develop.tfstate` → Development (if needed)
- `language-{feature}.tfstate` → Feature branches (if enabled)

**Why isolation matters:**
- Prevents accidental prod changes from feature branches
- Allows independent testing
- Rollback to branch-specific state

## Authentication: OIDC Only

This project uses **Azure AD OIDC for keyless authentication**. No static secrets to manage!

### How OIDC Works

```
GitHub Actions Workflow
    ↓
Requests OIDC token from GitHub
    ↓
Exchanges for Azure access token (short-lived, ~1 hour)
    ↓
Authenticates to Azure
    ↓
Token automatically expires - no rotation needed
```

### GitHub Secrets Required

Only store authentication info (no sensitive credentials):

```
AZURE_SUBSCRIPTION_ID    # Public Azure info
AZURE_TENANT_ID          # Public Azure info
AZURE_CLIENT_ID          # App registration ID
AZURE_STATE_RG           # Resource group name
AZURE_STATE_STORAGE      # Storage account name
AZURE_STATE_CONTAINER    # Container name
```

### Benefits of OIDC

✅ **No secret rotation** - Automatic expiration
✅ **No credential theft risk** - Tokens valid for ~1 hour only
✅ **Audit trail** - Can see which workflow ran
✅ **Branch-specific** - Can restrict to main/staging/dev
✅ **Zero config** - GitHub handles token generation

### Token Expiration

Tokens automatically expire - nothing to manage. Each workflow run gets fresh token.

### Sensitive Outputs

Terraform outputs marked as `sensitive` are masked in logs:

```hcl
output "container_registry_admin_password" {
  value     = azurerm_container_registry.main.admin_password
  sensitive = true
}
```

**How they're handled:**
- Never printed to console logs
- Accessible via `terraform output` only
- Not shown in GitHub Actions logs
- Only accessible to authorized users

## Troubleshooting Deployments

### Workflow Fails at Plan Stage

**Common causes:**

1. **Invalid Terraform syntax**
   ```
   Error: Invalid expression
   ```
   Solution: Run `terraform validate` locally

2. **Missing Azure authentication**
   ```
   Error: Error acquiring the state lock
   ```
   Solution: Verify secrets are set correctly

3. **Invalid image reference**
   ```
   Error: invalid value for argument "image"
   ```
   Solution: Check `server_image` in terraform.tfvars

### Workflow Fails at Apply Stage

1. **Resource quota exceeded**
   ```
   Error: creating Container App
   ```
   Solution: Check Azure quotas, request increase if needed

2. **VNet subnet conflicts**
   ```
   Error: Subnet address space conflicts
   ```
   Solution: Change `address_prefixes` in variables

3. **Registry authentication fails**
   ```
   Error: Failed to pull image
   ```
   Solution: Verify image exists in ACR: `az acr repository list`

### Debugging Failed Deployments

#### View Full Workflow Logs

1. Go to Actions tab
2. Click the failed run
3. Expand the failed job
4. Scroll through logs for error message

#### Get Terraform Output

```bash
# Download artifact from failed run
gh run download <run-id> --dir . --name terraform-state

# Extract state information
cd .terraform && terraform show
```

#### Rollback to Previous State

```bash
# List state versions in Azure
az storage blob version list \
  --account-name languageterraformstate \
  --container-name terraform-state \
  --name language-main.tfstate

# Restore previous version
az storage blob copy start \
  --account-name languageterraformstate \
  --container-name terraform-state \
  --source-uri "...?versionid=<old-version>" \
  --destination-blob language-main.tfstate
```

## Best Practices

### 1. Plan Before Every Apply

**Always review the plan output:**
- Expand resource blocks to see details
- Check for unexpected deletions
- Verify computed values (IPs, URLs, etc.)
- Ask: "Is this what I expect?"

### 2. Use Meaningful Commit Messages

```bash
# Good
git commit -m "infra(terraform): Add gRPC server auto-scaling limits"

# Bad
git commit -m "infra: update"
```

### 3. Test Infrastructure Locally First

```bash
# Before pushing to GitHub
cd infrastructure/terraform
terraform plan -var-file="terraform.tfvars"

# Review output thoroughly
terraform show tfplan | head -100
```

### 4. Protect Main Branch

GitHub Settings → Branches → main:
- ✅ Require pull request reviews (1+)
- ✅ Require status checks (Deploy workflow)
- ✅ Require code reviews before merge
- ✅ Dismiss stale reviews on push

### 5. Document Infrastructure Changes

When merging infrastructure PRs, add details:

```markdown
## Infrastructure Changes

### What changed
- Updated Container App min replicas from 1 to 2
- Increased CPU allocation from 0.5 to 1.0

### Why
- Better reliability for production traffic
- Reduced startup time during scaling

### Migration notes
- No data migration required
- No downtime expected
- Auto-scaling will absorb traffic spikes
```

### 6. Monitor Post-Deployment

After apply completes:

```bash
# Check container app is running
az containerapp show \
  --resource-group language-rg \
  --name language-server \
  --query "properties.provisioningState"

# View recent logs
az containerapp logs show \
  --resource-group language-rg \
  --name language-server \
  --tail 50 \
  --follow
```

## Advanced Topics

### Custom Approval Gates

Require multiple reviewers for production:

```yaml
infrastructure:
  name: infrastructure
  required_reviewers:
    - devops-team
    - security-team
  deployment_branch_policy:
    protected_branches: true
```

### Scheduled Deployments

Deploy on a schedule (e.g., nightly):

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC daily
  workflow_dispatch:
```

### Cross-Environment Deployments

Use matrix strategy for dev/staging/prod:

```yaml
strategy:
  matrix:
    environment: [dev, staging, prod]

jobs:
  deploy:
    environment: ${{ matrix.environment }}
    steps:
      - run: terraform apply -var="environment=${{ matrix.environment }}"
```

### Integration with External Systems

Post deployment status to Slack:

```yaml
- name: Notify Slack
  if: always()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "status": "${{ job.status }}",
        "deployment": "azure-infrastructure"
      }
```

## Related Documentation

- [AZURE_DEPLOYMENT_GUIDE.md](../infrastructure/AZURE_DEPLOYMENT_GUIDE.md) - Local Azure deployment
- [Terraform Backend Configuration](https://www.terraform.io/docs/backends/)
- [GitHub Actions Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/)
- [Azure AD OIDC for GitHub](https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure)
