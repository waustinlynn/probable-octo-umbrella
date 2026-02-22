# Deployment Configuration Updates

Summary of all changes made to deployment system.

## 🔐 Authentication: OIDC Only

**What changed:**
- ✅ Only OIDC authentication supported (no Service Principal secrets)
- ✅ All references to Service Principal secrets removed
- ✅ Keyless, short-lived token authentication

**Files updated:**
- `.github/DEPLOYMENT_GUIDE.md` - OIDC authentication details
- `.github/PERMISSIONS_GUIDE.md` - OIDC setup (removed secret option)
- `infrastructure/AZURE_DEPLOYMENT_GUIDE.md` - OIDC-only setup instructions

**Why OIDC only:**
- No secrets to rotate or leak
- Tokens valid for ~1 hour only
- Automatic expiration
- Audit trail shows which workflow ran
- Industry best practice

**GitHub Secrets needed:**
```
AZURE_SUBSCRIPTION_ID      # Public info
AZURE_TENANT_ID            # Public info
AZURE_CLIENT_ID            # App registration ID (not a secret)
AZURE_STATE_RG             # Resource group name
AZURE_STATE_STORAGE        # Storage account name
AZURE_STATE_CONTAINER      # Container name
```

## 🌍 Multi-Environment Deployments

**What changed:**
- ✅ Separate state files per environment (dev, staging, prod)
- ✅ Separate configuration per environment (tfvars)
- ✅ Independent scaling and cost control
- ✅ GitHub Actions supports environment selection

**Directory structure:**
```
infrastructure/terraform/
├── main.tf                    # Shared across all environments
├── variables.tf               # Shared
├── outputs.tf                 # Shared
├── providers.tf               # Shared
└── environments/              # NEW - environment-specific configs
    ├── dev.tfvars
    ├── staging.tfvars
    └── prod.tfvars
```

**State files (one per environment):**
```
Azure Storage: languageterraformstate
├── language-dev.tfstate       (dev environment)
├── language-staging.tfstate   (staging environment)
└── language-prod.tfstate      (production environment)
```

**Configuration example (dev.tfvars):**
```hcl
azure_subscription_id          = "YOUR_SUBSCRIPTION_ID"
azure_region                   = "eastus"
environment                    = "dev"
resource_group_name            = "language-dev-rg"
container_registry_name        = "languagedevregistry"
server_image                   = "languagedevregistry.azurecr.io/server:latest"
server_cpu                     = "0.25"    # Smaller in dev
server_memory                  = "0.5"
server_replicas                = 1         # Single replica ok in dev
```

**Example for production:**
```hcl
server_cpu                     = "1.0"     # More CPU in prod
server_memory                  = "2.0"     # More memory
server_replicas                = 3         # High availability
```

### GitHub Actions with Environments

**Workflow now supports environment selection:**

When triggering a workflow, you can select:
```
Action: [plan / apply / destroy-plan]
Environment: [dev / staging / prod]
```

**Example via CLI:**
```bash
# Plan dev
gh workflow run deploy.yml -f action=plan -f environment=dev

# Plan staging
gh workflow run deploy.yml -f action=plan -f environment=staging

# Apply production
gh workflow run deploy.yml -f action=apply -f environment=prod
```

**In GitHub UI:**
1. Actions → Deploy Infrastructure
2. Run workflow
3. Select environment (dev/staging/prod)
4. Select action (plan/apply/destroy-plan)
5. Run

## 📖 New Documentation

**New guides created:**
- `infrastructure/MULTI_ENVIRONMENT_GUIDE.md` - Complete multi-environment setup
- `.github/MANUAL_WORKFLOW_GUIDE.md` - How to trigger manual workflows

**Updated guides:**
- `infrastructure/AZURE_DEPLOYMENT_GUIDE.md` - OIDC-only setup
- `.github/DEPLOYMENT_GUIDE.md` - OIDC-only authentication
- `.github/PERMISSIONS_GUIDE.md` - OIDC-only permissions
- `infrastructure/README.md` - Documentation structure

## 🔧 GitHub Actions Workflow Changes

**File: `.github/workflows/deploy.yml`**

**New inputs:**
```yaml
environment:
  description: 'Target environment'
  type: choice
  options:
    - dev
    - staging
    - prod
```

**Automatic updates:**
- State file key uses environment: `language-${{ github.event.inputs.environment }}.tfstate`
- Tfvars file uses environment: `environments/${{ github.event.inputs.environment }}.tfvars`
- Job summaries show environment name
- Logs clearly indicate which environment is being deployed to

## 📋 Getting Started with Multi-Environments

### Step 1: Create Environment Configurations

```bash
cd infrastructure/terraform/environments

# Create dev.tfvars
cat > dev.tfvars <<'EOF'
azure_subscription_id      = "YOUR_SUBSCRIPTION_ID"
azure_region               = "eastus"
environment                = "dev"
resource_group_name        = "language-dev-rg"
container_registry_name    = "languagedevregistry"
server_image               = "languagedevregistry.azurecr.io/server:latest"
server_cpu                 = "0.25"
server_memory              = "0.5"
server_replicas            = 1
tags = {
  Environment = "dev"
}
EOF

# Similarly for staging.tfvars and prod.tfvars
```

### Step 2: Create State Files in Azure

```bash
# Dev state
az storage blob create \
  --account-name languageterraformstate \
  --container-name terraform-state \
  --name language-dev.tfstate

# Staging state
az storage blob create \
  --account-name languageterraformstate \
  --container-name terraform-state \
  --name language-staging.tfstate

# Prod state
az storage blob create \
  --account-name languageterraformstate \
  --container-name terraform-state \
  --name language-prod.tfstate
```

### Step 3: Test Locally per Environment

```bash
cd infrastructure/terraform

# Test dev
terraform init -backend-config="key=language-dev.tfstate"
terraform plan -var-file="environments/dev.tfvars"

# Switch to staging
terraform init -backend-config="key=language-staging.tfstate"
terraform plan -var-file="environments/staging.tfvars"

# Switch to prod
terraform init -backend-config="key=language-prod.tfstate"
terraform plan -var-file="environments/prod.tfvars"
```

### Step 4: Deploy via GitHub Actions

1. Go to Actions tab
2. Click "Deploy Infrastructure"
3. Click "Run workflow"
4. Select environment (dev/staging/prod)
5. Select action (plan/apply/destroy-plan)
6. Click "Run workflow"

## 🎯 Workflow Examples

### Plan Development

```
Actions → Deploy Infrastructure → Run workflow
Environment: dev
Action: plan
→ Previews dev infrastructure changes
```

### Test in Staging

```
Actions → Deploy Infrastructure → Run workflow
Environment: staging
Action: apply
→ Deploys to staging environment
→ separate state, separate resources
```

### Deploy Production

```
Actions → Deploy Infrastructure → Run workflow
Environment: prod
Action: plan
→ Review plan thoroughly
→ Run workflow again with apply
Environment: prod
Action: apply
→ Deploys to production
→ Everything isolated from dev/staging
```

## ✅ Checklist for Setup

- [ ] Read `infrastructure/MULTI_ENVIRONMENT_GUIDE.md`
- [ ] Create `environments/dev.tfvars`
- [ ] Create `environments/staging.tfvars`
- [ ] Create `environments/prod.tfvars`
- [ ] Create state files in Azure Storage (3 blobs)
- [ ] Test locally: `terraform plan -var-file="environments/dev.tfvars"`
- [ ] Trigger GitHub Actions with environment selection
- [ ] Verify separate resource groups created (language-dev-rg, language-staging-rg, language-prod-rg)
- [ ] Verify separate state files managed independently

## 🚀 Benefits of This Setup

✅ **Independent Environments**
- Dev changes don't affect prod
- Each environment can scale differently
- Different cost models per environment

✅ **Safe Promotion Path**
- Test in dev first
- Stage in staging second
- Deploy to prod last

✅ **Isolated State Management**
- Three separate state files
- Independent locking per environment
- Can rollback one environment independently

✅ **RBAC Control**
- Different team access per environment
- GitHub approval gates per environment
- Audit trail by environment

✅ **Cost Optimization**
- Dev can be tiny (0.25 CPU, 1 replica)
- Staging medium (0.5 CPU, 2 replicas)
- Prod large (1.0 CPU, 3+ replicas)

## 📚 Documentation Reference

| Need | Document |
|------|----------|
| Quick start | `../TERRAFORM_QUICKSTART.md` |
| Multi-environment setup | `infrastructure/MULTI_ENVIRONMENT_GUIDE.md` |
| Azure setup | `infrastructure/AZURE_DEPLOYMENT_GUIDE.md` |
| State files & locking | `infrastructure/STATE_MANAGEMENT.md` |
| GitHub Actions details | `.github/DEPLOYMENT_GUIDE.md` |
| Manual triggers | `.github/MANUAL_WORKFLOW_GUIDE.md` |
| OIDC & security | `.github/PERMISSIONS_GUIDE.md` |

## 🔒 Security Model

- ✅ OIDC authentication only (no secrets)
- ✅ Tokens valid for ~1 hour
- ✅ Automatic token expiration
- ✅ Separate state files = separate locking
- ✅ All changes audited in Azure
- ✅ GitHub Actions logs show which environment

## Questions?

- Multi-environment workflow: See `infrastructure/MULTI_ENVIRONMENT_GUIDE.md`
- OIDC setup: See `infrastructure/AZURE_DEPLOYMENT_GUIDE.md` → "Service Principal Setup"
- Manual triggers: See `.github/MANUAL_WORKFLOW_GUIDE.md`
- State management: See `infrastructure/STATE_MANAGEMENT.md`
