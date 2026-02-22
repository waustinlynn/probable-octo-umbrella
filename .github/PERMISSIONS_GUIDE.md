# GitHub Actions Permission Model for Terraform

This guide explains the permission model used by GitHub Actions workflows for Azure infrastructure deployments.

## Quick Overview

```
┌──────────────────────────────────────────────────────────┐
│            Manual Deployment Permission Model            │
├──────────────────┬─────────────────┬────────────────────┤
│     Context      │  What's Allowed │  Authentication    │
├──────────────────┼─────────────────┼────────────────────┤
│ Manual Plan      │ Plan only       │ Azure OIDC/Service │
│ Workflow         │ (read-only)     │ Principal          │
│ Dispatch         │ No changes      │ (requires manual   │
│ (workflow_       │ previews infra  │ trigger)           │
│  dispatch)       │                 │                    │
├──────────────────┼─────────────────┼────────────────────┤
│ Manual Apply     │ Plan + Apply    │ Azure OIDC/Service │
│ Workflow         │ (read + write)  │ Principal          │
│ Dispatch         │ Deploys to Azure│ (requires manual   │
│                  │                 │ trigger)           │
├──────────────────┼─────────────────┼────────────────────┤
│ Local Dev        │ Plan only       │ az login           │
│ Machine          │ (never apply)   │ (your credentials) │
│ (terraform cli)  │                 │                    │
└──────────────────┴─────────────────┴────────────────────┘
```

**Key Point**: All GitHub Actions runs are **manual** (workflow_dispatch only) to save Azure credits until ready for production.

## Authentication Methods

### For Pull Requests (Read-Only Plan)

**What happens:**
- Uses automatic `GITHUB_TOKEN` (no configuration needed)
- Can read repository and current Azure state
- Cannot modify Azure resources

**Token permissions:**
```yaml
permissions:
  contents: read           # Read repository code
  pull-requests: write     # Comment on PRs
  id-token: write          # (not used for PR plans)
```

**Benefits:**
- No secrets required
- Safe to expose in public repos
- Automatic token management

### Manual Deployments Use OIDC Only

All manual workflows use **Azure AD OIDC** for keyless authentication.

**Configuration in workflow:**
```yaml
- uses: azure/login@v1
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

**Token flow:**
```
GitHub Actions Runner
    ↓
Requests OIDC token from GitHub
    ↓
Exchanges for Azure access token (short-lived)
    ↓
Authenticates to Azure
    ↓
Executes terraform plan/apply
    ↓
Token automatically expires
```

**Why OIDC Only:**
- ✅ No static secrets to rotate
- ✅ Tokens expire in ~1 hour
- ✅ Audit logs show which workflow ran
- ✅ Can restrict to specific repo/branch
- ✅ Industry best practice
- ❌ Service Principal secrets **not supported** (too risky)

## Role-Based Access Control (RBAC)

### Azure Permissions

The Service Principal used by GitHub Actions needs these Azure roles:

```
Azure Subscription
│
├─ Contributor                    (Primary role)
│  ├─ Create/modify/delete resources
│  ├─ Modify IAM roles (scoped)
│  └─ Manage access
│
├─ Storage Account Blob Data
│  └─ Read/write Terraform state file
│
└─ Network Contributor
   └─ Manage VNets and security groups
```

**Minimum permissions (if no IAM changes):**
```
- Contributor
- Storage Account Blob Data Contributor
```

### GitHub Permissions

Defined in each workflow YAML:

```yaml
permissions:
  contents: read              # Read source code
  pull-requests: write        # Comment on PRs
  id-token: write            # OIDC tokens
```

**What each permission does:**

| Permission | Allows | Risk |
|-----------|--------|------|
| `contents: read` | Read .tf files | Low (public anyway) |
| `pull-requests: write` | Comment on PRs | Low (informational) |
| `id-token: write` | Request OIDC tokens | Medium (needs OIDC config) |

## Approval Gates

### GitHub Environments

Deployments to production use GitHub Environments for approval:

**Setup:**
1. Settings → Environments → Create "infrastructure"
2. Set "Deployment branches" → Only main
3. Add "Required reviewers" (optional)
4. Require status checks ✅

**Flow:**
```
terraform apply starts
    ↓
Workflow pauses at "infrastructure" environment
    ↓
Required reviewers notified
    ↓
Reviewers must approve in GitHub
    ↓
apply proceeds or is cancelled
```

**Who can approve?**
- Repository owners
- Team members with "Maintain" or "Admin" role
- Manually selected reviewers (if configured)

### Manual Approval Process

When `terraform apply` is queued:

1. **Workflow shows approval pending:**
   ```
   Job: Deploy Infrastructure (Terraform Apply)
   Status: Waiting for approval
   ```

2. **Reviewer clicks "Review Deployments":**
   ```
   Actions tab
   → Deploy Infrastructure run
   → Review Deployments button
   ```

3. **Reviewer sees approval dialog:**
   ```
   ✓ Approve
   ✗ Reject

   Comments (optional):
   [Deployment approved - verified all changes safe]
   ```

4. **After approval:**
   - Workflow continues
   - `terraform apply` executes
   - Outputs exported

## Security Boundaries

### What GitHub Actions Can Do

**Allowed:**
- ✅ Read Terraform files and state
- ✅ Plan infrastructure changes
- ✅ Apply approved changes to Azure
- ✅ Export outputs
- ✅ Comment on PRs

**Not allowed:**
- ❌ Modify GitHub Actions workflow itself (without review)
- ❌ Leak secrets (masked in logs)
- ❌ Create new GitHub users or teams
- ❌ Force-push to protected branches

### What Developers Can Do Locally

**Can:**
- ✅ `terraform plan` (local only)
- ✅ `terraform validate`
- ✅ Read Azure state
- ✅ View current infrastructure

**Cannot:**
- ❌ `terraform apply` to main environment
- ❌ Access production secrets directly
- ❌ Modify GitHub Secrets
- ❌ Approve their own deployments

## Secrets Management

### What's Stored in GitHub Secrets

```
AZURE_SUBSCRIPTION_ID          Plain text (public)
AZURE_TENANT_ID                Plain text (public)
AZURE_CLIENT_ID                Plain text (public, but sensitive)
AZURE_CLIENT_SECRET            **Sensitive** (rotated 90 days)
AZURE_STATE_RG                 Plain text (public)
AZURE_STATE_STORAGE            Plain text (public)
AZURE_STATE_CONTAINER          Plain text (public)
```

### Secret Masking in Logs

GitHub Actions automatically hides secret values:

```
Before:        "password": "SuperSecret123!"
After:         "password": "***"
In logs:       *** [masked]
```

**Sensitivity levels:**

| Secret | Masked | Rotated | Why |
|--------|--------|---------|-----|
| Subscription ID | No | No | Public anyway |
| Client Secret | Yes | 90 days | High value target |
| State storage name | No | No | Just a reference |

### Rotation Policy

**OIDC (recommended):**
- No rotation needed
- GitHub handles token generation
- Tokens valid for ~1 hour

**Service Principal Secret:**
- **Mandatory**: Rotate every 90 days
- **Process**:
  1. Create new client secret
  2. Test in staging
  3. Update `AZURE_CLIENT_SECRET`
  4. Delete old secret

```bash
# Example rotation
NEW_SECRET=$(az ad app credential create --id $CLIENT_ID)
# Update GitHub Secrets → AZURE_CLIENT_SECRET
# Verify terraform apply works
az ad app credential delete --id $CLIENT_ID --key-id $OLD_KEY_ID
```

## Audit and Compliance

### GitHub Audit Log

All workflow actions are logged:

**View audit log:**
1. Settings → Audit log
2. Filter by "actions"
3. See all deployments and approvals

**Example entries:**
```
2024-02-22 10:30:45 workflows.deployment_created
  workflow: deploy.yml
  environment: infrastructure
  actor: github-actions[bot]
  status: pending_approval

2024-02-22 10:31:22 workflows.deployment_approval
  environment: infrastructure
  actor: alice@company.com
  approved: true

2024-02-22 10:31:35 workflows.deployment_status
  environment: infrastructure
  conclusion: success
```

### Azure Activity Log

Azure logs all resource changes:

**View changes:**
```bash
az monitor activity-log list \
  --resource-group language-rg \
  --caller "GitHub Actions" \
  --output table
```

**Shows:**
- What resource was changed
- Who made the change (service principal)
- When it happened
- Success/failure status

## Threat Model and Mitigations

### Threat 1: Compromised Developer Laptop

**Risk:** Developer's local credentials stolen

**Mitigation:**
- GitHub Actions uses separate credentials
- Local `az login` doesn't give apply access
- Lost laptop = revoke their GitHub access

### Threat 2: Stolen GitHub Token

**Risk:** Attacker can create PRs and push to main

**Mitigation:**
- Branch protection requires approval
- Deploy job requires separate approval
- Automatic GITHUB_TOKEN scope is minimal

### Threat 3: Leaked Client Secret

**Risk:** Attacker can apply any Terraform changes

**Mitigation:**
- Rotate every 90 days (mandatory)
- Use OIDC instead (recommended)
- Monitor Azure Activity Log for suspicious activity
- GitHub Actions can revoke secret access immediately

### Threat 4: Rogue Approval

**Risk:** Unauthorized person approves deployment

**Mitigation:**
- Deployment approval requires specific GitHub roles
- Can specify required reviewers (team members)
- Audit log tracks who approved
- PR review is still required before merge

## Best Practices

### Do's ✅

- ✅ Use OIDC authentication (no secrets)
- ✅ Rotate secrets every 90 days
- ✅ Require multiple approvals for production
- ✅ Log all deployments in audit trail
- ✅ Monitor GitHub Secrets for unauthorized access
- ✅ Use least-privilege IAM roles
- ✅ Branch protect main branch
- ✅ Review plan output before applying

### Don'ts ❌

- ❌ Don't use Service Principal secrets if OIDC available
- ❌ Don't commit secrets to git (even accidentally)
- ❌ Don't approve your own deployments
- ❌ Don't disable branch protection for testing
- ❌ Don't skip terraform plan review
- ❌ Don't share GitHub credentials
- ❌ Don't use GITHUB_TOKEN for Azure auth
- ❌ Don't store secrets outside GitHub Secrets

## Setting Up OIDC (Required)

### Step 1: Create Azure App Registration

```bash
# Create app in Azure AD
az ad app create --display-name "GitHub Actions CI/CD"
APP_ID=$(az ad app list --filter "displayName eq 'GitHub Actions CI/CD'" --query "[0].id" -o tsv)

# Get tenant ID
TENANT_ID=$(az account show --query homeTenantId -o tsv)
```

### Step 2: Configure Federated Credentials

```bash
# Allow OIDC from main branch
az identity federated-credentials create \
  --name "GitHubActions-Main" \
  --identity-name $APP_ID \
  --issuer "https://token.actions.githubusercontent.com" \
  --subject "repo:owner/repo:ref:refs/heads/main" \
  --audiences "api://AzureADTokenExchange"

# Allow OIDC from pull requests
az identity federated-credentials create \
  --name "GitHubActions-PR" \
  --identity-name $APP_ID \
  --issuer "https://token.actions.githubusercontent.com" \
  --subject "repo:owner/repo:pull_request" \
  --audiences "api://AzureADTokenExchange"
```

### Step 3: Add GitHub Secrets

```
AZURE_CLIENT_ID=$APP_ID
AZURE_TENANT_ID=$TENANT_ID
AZURE_SUBSCRIPTION_ID=$(az account show --query id -o tsv)
```

### Step 4: Verify in Workflow

```yaml
- uses: azure/login@v1
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

## Related Documentation

- [GitHub Actions Permissions](https://docs.github.com/en/actions/security-guides/automatic-token-authentication)
- [Azure AD OIDC Integration](https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure)
- [Azure Login Action](https://github.com/Azure/login)
- [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/)
- See `infrastructure/AZURE_DEPLOYMENT_GUIDE.md` for setup instructions
- See `.github/DEPLOYMENT_GUIDE.md` for workflow details
