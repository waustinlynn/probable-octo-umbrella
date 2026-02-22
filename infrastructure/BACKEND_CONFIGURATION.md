# Backend Configuration and State File Management

How Terraform backend configuration works with multi-environment setups.

## The Issue: Backend Configuration Can't Use Variables

Terraform has a limitation: **backend blocks cannot reference variables directly**.

This doesn't work:
```hcl
# ❌ INVALID - Variables not allowed in backend block
variable "environment" {
  type = string
}

terraform {
  backend "azurerm" {
    key = "language-${var.environment}.tfstate"  # ERROR!
  }
}
```

Why? Terraform needs to read the backend config BEFORE it evaluates variables. Backend initialization happens first.

## The Solution: Backend Config Flags

Use `terraform init -backend-config` flags to pass backend configuration dynamically:

```bash
terraform init \
  -backend-config="resource_group_name=language-terraform-state" \
  -backend-config="storage_account_name=languageterraformstate" \
  -backend-config="container_name=terraform-state" \
  -backend-config="key=language-dev.tfstate"
```

This allows:
- ✅ Dynamic state file names per environment
- ✅ Same Terraform configuration for all environments
- ✅ Complete isolation between dev/staging/prod

## How It Works

### Step 1: Empty Backend Block in Code

**File: `infrastructure/terraform/providers.tf`**

```hcl
terraform {
  backend "azurerm" {
    # Empty - values provided at init time
  }
}
```

### Step 2: Provider Configuration in Code

**Also in `providers.tf`**

```hcl
provider "azurerm" {
  features {
    container_app {
      block_public_ingress = false
    }
  }
  subscription_id = var.azure_subscription_id
}
```

Note: Provider uses `var.azure_subscription_id` but backend doesn't use variables. They're separate.

### Step 3: Backend Config at Init Time

**Local development:**
```bash
cd infrastructure/terraform

# Initialize for dev environment
terraform init \
  -backend-config="resource_group_name=language-terraform-state" \
  -backend-config="storage_account_name=languageterraformstate" \
  -backend-config="container_name=terraform-state" \
  -backend-config="key=language-dev.tfstate"

# Now terraform uses language-dev.tfstate
```

**GitHub Actions:**
```yaml
- name: Terraform Init
  run: |
    cd infrastructure/terraform
    terraform init \
      -backend-config="resource_group_name=${{ secrets.AZURE_STATE_RG }}" \
      -backend-config="storage_account_name=${{ secrets.AZURE_STATE_STORAGE }}" \
      -backend-config="container_name=${{ secrets.AZURE_STATE_CONTAINER }}" \
      -backend-config="key=language-${{ github.event.inputs.environment }}.tfstate"
```

## State File Differentiation

The `key` parameter is what differentiates state files:

```
Azure Storage Account: languageterraformstate
├── Container: terraform-state
│   ├── Blob: language-dev.tfstate       ← key=language-dev.tfstate
│   ├── Blob: language-staging.tfstate   ← key=language-staging.tfstate
│   └── Blob: language-prod.tfstate      ← key=language-prod.tfstate
```

**Same infrastructure code, different state files:**
```bash
# Using dev state
terraform init -backend-config="key=language-dev.tfstate"
terraform plan -var-file="environments/dev.tfvars"
# → Uses language-dev.tfstate
# → Shows dev infrastructure status

# Switch to staging
terraform init -backend-config="key=language-staging.tfstate"
terraform plan -var-file="environments/staging.tfvars"
# → Uses language-staging.tfstate
# → Shows staging infrastructure status

# Switch to prod
terraform init -backend-config="key=language-prod.tfstate"
terraform plan -var-file="environments/prod.tfvars"
# → Uses language-prod.tfstate
# → Shows prod infrastructure status
```

## Local Development Workflow

### Working with Dev

```bash
cd infrastructure/terraform

# Initialize with dev state
terraform init \
  -backend-config="resource_group_name=language-terraform-state" \
  -backend-config="storage_account_name=languageterraformstate" \
  -backend-config="container_name=terraform-state" \
  -backend-config="key=language-dev.tfstate"

# Plan dev changes
terraform plan -var-file="environments/dev.tfvars" -out=tfplan-dev

# Apply to dev
terraform apply tfplan-dev
```

### Switching to Staging

```bash
# Initialize with staging state
terraform init \
  -backend-config="resource_group_name=language-terraform-state" \
  -backend-config="storage_account_name=languageterraformstate" \
  -backend-config="container_name=terraform-state" \
  -backend-config="key=language-staging.tfstate"

# Plan staging changes
terraform plan -var-file="environments/staging.tfvars" -out=tfplan-staging

# Apply to staging
terraform apply tfplan-staging
```

### Important: Always Re-Initialize When Switching

```bash
# ❌ DON'T DO THIS
terraform init -backend-config="key=language-dev.tfstate"
terraform plan -var-file="environments/dev.tfvars"
# Then immediately...
terraform plan -var-file="environments/staging.tfvars"  # Still using dev state!

# ✅ DO THIS
terraform init -backend-config="key=language-dev.tfstate"
terraform plan -var-file="environments/dev.tfvars"
# Then re-init for staging...
terraform init -backend-config="key=language-staging.tfstate"
terraform plan -var-file="environments/staging.tfvars"  # Now using staging state!
```

The `terraform init` command reconfigures the backend. Always re-initialize when switching environments.

## Backend Configuration Reference

### Backend Config Fields

| Field | Required | Purpose |
|-------|----------|---------|
| `resource_group_name` | Yes | Azure resource group containing storage account |
| `storage_account_name` | Yes | Azure storage account name |
| `container_name` | Yes | Blob container name within storage account |
| `key` | Yes | Blob name (path) - **This differentiates environments** |

### Example Keys per Environment

```
key = "language-dev.tfstate"       # Development
key = "language-staging.tfstate"   # Staging
key = "language-prod.tfstate"      # Production
```

The `key` can be any path-like string:
```
key = "prod/servers/main.tfstate"
key = "us-east-1/prod.tfstate"
key = "2024/02/language.tfstate"
```

## GitHub Actions Implementation

**Workflow automatically handles backend config:**

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        type: choice
        options: [dev, staging, prod]

jobs:
  plan:
    steps:
      - name: Terraform Init
        run: |
          cd infrastructure/terraform
          terraform init \
            -backend-config="resource_group_name=${{ secrets.AZURE_STATE_RG }}" \
            -backend-config="storage_account_name=${{ secrets.AZURE_STATE_STORAGE }}" \
            -backend-config="container_name=${{ secrets.AZURE_STATE_CONTAINER }}" \
            -backend-config="key=language-${{ github.event.inputs.environment }}.tfstate"
```

**What happens:**
1. User selects environment (dev/staging/prod)
2. Workflow sets `key=language-{environment}.tfstate`
3. `terraform init` uses correct state file
4. `terraform plan` shows current state for that environment
5. `terraform apply` updates only that environment's state

## Preventing Cross-Environment Mistakes

### Wrong Approach: Hardcoded Key

❌ Don't do this:
```hcl
# providers.tf
backend "azurerm" {
  key = "language-prod.tfstate"  # Hardcoded!
}
```

Why it's bad:
- Dev, staging, and prod all use the same state file
- Destroying dev could destroy prod
- No environment isolation
- Can't test safely

### Right Approach: Dynamic Key via Init

✅ Do this:
```bash
# For dev
terraform init -backend-config="key=language-dev.tfstate"

# For staging
terraform init -backend-config="key=language-staging.tfstate"

# For prod
terraform init -backend-config="key=language-prod.tfstate"
```

Why it's good:
- Completely separate state files per environment
- Dev changes don't affect prod
- Easy to identify which state you're using
- Workflow automates correct key selection

## Checking Current Backend Configuration

After initializing, you can verify which backend you're using:

```bash
# View current backend configuration
terraform init -chdir=infrastructure/terraform

# Check which state file is locked/in use
terraform state list

# The .terraform directory shows backend config
cat infrastructure/terraform/.terraform/terraform.tfstate | jq '.backend'
```

## Common Mistakes

### Mistake 1: Not Re-initializing When Switching Environments

```bash
# Initialize for dev
terraform init -backend-config="key=language-dev.tfstate"

# Plan staging without re-initializing
terraform plan -var-file="environments/staging.tfvars"
# ❌ Still using dev state!

# Fix: Re-initialize
terraform init -backend-config="key=language-staging.tfstate"
terraform plan -var-file="environments/staging.tfvars"
# ✅ Now using staging state
```

### Mistake 2: Forgetting Backend Config Flags

```bash
# ❌ Wrong - uses default backend or existing one
terraform init

# ✅ Right - explicitly sets which state file
terraform init -backend-config="key=language-dev.tfstate"
```

### Mistake 3: Applying to Wrong Environment

```bash
# Accidentally apply to production state
terraform init -backend-config="key=language-prod.tfstate"
terraform apply
# ❌ Just modified production!

# Always plan first
terraform plan -out=tfplan
# Review the plan output to confirm it's for the right environment!
terraform apply tfplan
```

## Best Practices

✅ **Do this:**
- Always specify `-backend-config="key=language-{environment}.tfstate"`
- Always use `-var-file="environments/{environment}.tfvars"`
- Plan first, review, then apply
- Use `.gitignore` to avoid committing state files
- Always re-initialize when switching environments

❌ **Don't do this:**
- Don't hardcode state file names
- Don't skip backend config flags
- Don't apply without reviewing plan
- Don't commit .terraform directory to git
- Don't forget to re-initialize when switching environments

## Troubleshooting

### "Error acquiring the state lock"

**Cause:** Different environment's state file is locked

**Solution:**
```bash
# Verify you're using correct state file
terraform state list

# Check which key/environment you're connected to
cat .terraform/terraform.tfstate | jq '.backend.config'

# If wrong environment, re-initialize
terraform init -backend-config="key=language-{correct-environment}.tfstate"
```

### "State has already been accessed with provider credentials"

**Cause:** Switching environments without re-initializing

**Solution:**
```bash
# Clean up and re-initialize
rm -rf .terraform

# Re-initialize with correct environment
terraform init -backend-config="key=language-{environment}.tfstate"
```

### "Remote state has changed"

**Cause:** Someone else deployed to same environment (good sign!)

**Solution:**
```bash
# Pull latest state
terraform refresh

# Review changes
terraform plan

# Proceed with your changes
terraform apply
```

## References

- [Terraform Backend Configuration](https://www.terraform.io/docs/backends/config.html)
- [Azure Storage Backend](https://www.terraform.io/docs/backends/types/azurerm.html)
- [Backend Config in CI/CD](https://www.terraform.io/docs/cloud/run/run-environment.html#setting-variables)
