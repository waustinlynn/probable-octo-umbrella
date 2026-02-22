# Environment Setup and Switching

Quick guide to set up and switch between environments.

## Quick Start: Use the Init Script

The easiest way to initialize Terraform for an environment:

```bash
# Initialize for dev
./infrastructure/scripts/init-environment.sh dev

# Initialize for staging
./infrastructure/scripts/init-environment.sh staging

# Initialize for prod
./infrastructure/scripts/init-environment.sh prod
```

This script:
- ✅ Validates environment exists
- ✅ Checks tfvars file exists
- ✅ Initializes with correct state file
- ✅ Shows current configuration
- ✅ Provides next steps

## Manual Setup (Advanced)

If you prefer to initialize manually:

```bash
cd infrastructure/terraform

# For dev
terraform init \
  -backend-config="resource_group_name=language-terraform-state" \
  -backend-config="storage_account_name=languageterraformstate" \
  -backend-config="container_name=terraform-state" \
  -backend-config="key=language-dev.tfstate"

# For staging
terraform init \
  -backend-config="resource_group_name=language-terraform-state" \
  -backend-config="storage_account_name=languageterraformstate" \
  -backend-config="container_name=terraform-state" \
  -backend-config="key=language-staging.tfstate"

# For prod
terraform init \
  -backend-config="resource_group_name=language-terraform-state" \
  -backend-config="storage_account_name=languageterraformstate" \
  -backend-config="container_name=terraform-state" \
  -backend-config="key=language-prod.tfstate"
```

## Understanding the Key Parameter

The `key` parameter differentiates state files:

```
language-dev.tfstate       (development)
language-staging.tfstate   (staging)
language-prod.tfstate      (production)
```

Same Terraform code, different state files = complete environment isolation.

## Workflow: Plan and Apply

### Step 1: Initialize for Environment

```bash
./infrastructure/scripts/init-environment.sh dev
# Now Terraform is connected to dev state
```

### Step 2: Plan Changes

```bash
cd infrastructure/terraform

terraform plan \
  -var-file="environments/dev.tfvars" \
  -out=tfplan
```

Review the output carefully.

### Step 3: Apply Changes

```bash
terraform apply tfplan
```

## Switching Environments

Always re-initialize when switching environments:

```bash
# Working on dev
./infrastructure/scripts/init-environment.sh dev
terraform plan -var-file="environments/dev.tfvars"

# Now switch to staging
./infrastructure/scripts/init-environment.sh staging
terraform plan -var-file="environments/staging.tfvars"
```

**Why re-initialize?**
- Backend config is set at init time
- `key` parameter selects state file
- Without re-init, wrong state file is used
- Could accidentally modify wrong environment!

## Verifying Current Environment

```bash
# Check which state file you're using
terraform state list

# View backend configuration
terraform show -json | jq '.terraform_version'

# Look at .terraform directory
cat .terraform/terraform.tfstate | jq '.backend.config'
```

## Common Patterns

### Pattern 1: Test in Dev, Verify in Staging, Deploy to Prod

```bash
# Step 1: Change in dev
./infrastructure/scripts/init-environment.sh dev
terraform plan -var-file="environments/dev.tfvars" -out=tfplan-dev
terraform apply tfplan-dev
# Verify changes work in dev

# Step 2: Move to staging
./infrastructure/scripts/init-environment.sh staging
terraform plan -var-file="environments/staging.tfvars" -out=tfplan-staging
terraform apply tfplan-staging
# Load test in staging

# Step 3: Deploy to prod
./infrastructure/scripts/init-environment.sh prod
terraform plan -var-file="environments/prod.tfvars" -out=tfplan-prod
terraform apply tfplan-prod
# Monitor production
```

### Pattern 2: Quick Dev Testing

```bash
# Work on dev repeatedly
./infrastructure/scripts/init-environment.sh dev

# First change
terraform plan -var-file="environments/dev.tfvars"
terraform apply

# Second change
terraform plan -var-file="environments/dev.tfvars"
terraform apply

# Third change
terraform plan -var-file="environments/dev.tfvars"
terraform apply
```

No need to re-initialize unless switching to different environment.

### Pattern 3: Independent Environment Updates

```bash
# Update dev without affecting others
./infrastructure/scripts/init-environment.sh dev
terraform apply

# Separately, update staging
./infrastructure/scripts/init-environment.sh staging
terraform apply

# Separately, update prod
./infrastructure/scripts/init-environment.sh prod
terraform apply
```

Each environment completely isolated.

## Troubleshooting

### "No such file or directory" for tfvars

**Problem:** tfvars file doesn't exist

**Solution:**
```bash
# Create tfvars file from example
cp terraform/terraform.tfvars.example terraform/environments/dev.tfvars

# Edit with your values
nano terraform/environments/dev.tfvars
```

### "Error acquiring the state lock"

**Problem:** State file is locked (in use)

**Solution:**
```bash
# Check current environment
cat .terraform/terraform.tfstate | jq '.backend.config.key'

# Force unlock if necessary (use with caution!)
terraform force-unlock <lock-id>
```

### "State has been accessed with provider credentials"

**Problem:** Switching environments without re-initializing

**Solution:**
```bash
# Clean and re-initialize
rm -rf .terraform .terraform.lock.hcl
./infrastructure/scripts/init-environment.sh staging
```

### Script Says "Invalid environment"

**Problem:** Typo in environment name

**Solution:**
```bash
# Valid environments
./infrastructure/scripts/init-environment.sh dev
./infrastructure/scripts/init-environment.sh staging
./infrastructure/scripts/init-environment.sh prod
```

## Best Practices

✅ **Always:**
- Use `init-environment.sh` script for consistency
- Re-initialize when switching environments
- Review plan output before applying
- Keep tfvars files synchronized

❌ **Never:**
- Skip the `terraform init` step
- Apply without reviewing plan
- Forget to re-init when switching
- Commit .terraform directory
- Hardcode state file names

## Advanced: Custom Backend Config

To use different Azure storage or resource group per environment:

```bash
# Prod uses separate storage account
terraform init \
  -backend-config="resource_group_name=language-prod-state" \
  -backend-config="storage_account_name=languageprodstate" \
  -backend-config="container_name=terraform-state" \
  -backend-config="key=language-prod.tfstate"
```

Then update the init script accordingly.

## Related Documentation

- [BACKEND_CONFIGURATION.md](./BACKEND_CONFIGURATION.md) - Detailed backend explanation
- [MULTI_ENVIRONMENT_GUIDE.md](./MULTI_ENVIRONMENT_GUIDE.md) - Full multi-environment setup
- [TERRAFORM_QUICKSTART.md](../TERRAFORM_QUICKSTART.md) - Quick start guide
