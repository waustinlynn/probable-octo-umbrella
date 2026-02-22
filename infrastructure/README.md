# Infrastructure

This directory contains all infrastructure-as-code, container configurations, and deployment automation for Azure.

**Cloud Provider**: Microsoft Azure
**Deployment Method**: Terraform + GitHub Actions
**Container Platform**: Azure Container Apps (gRPC Server)

## Structure

```
infrastructure/
├── terraform/                      # Terraform configurations for Azure
│   ├── providers.tf               # Azure provider configuration
│   ├── main.tf                    # Azure resources (Container Apps, VNet, ACR, etc.)
│   ├── variables.tf               # Input variables for Azure deployment
│   ├── outputs.tf                 # Output values (FQDN, registry URL, etc.)
│   ├── terraform.tfvars.example   # Template for local configuration
│   └── .terraform/                # (Local) Terraform working directory
├── docker/                        # Dockerfile configurations
│   ├── Dockerfile.server          # gRPC server container image
│   ├── Dockerfile.client          # Client container image
│   └── .dockerignore
├── AZURE_DEPLOYMENT_GUIDE.md      # Step-by-step Azure deployment instructions
├── STATE_MANAGEMENT.md            # Terraform state and locking documentation
└── README.md                      # This file
```

## Development Workflow

### Local Development (Planning)

When working in the infrastructure worktree:

```bash
cd infrastructure/terraform

# 1. Copy and configure variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your Azure subscription ID, region, etc.

# 2. Initialize Terraform
terraform init  # (uses local backend for planning)

# 3. Check formatting
terraform fmt -check -recursive

# 4. Validate configuration
terraform validate

# 5. Plan infrastructure changes (read-only)
terraform plan \
  -var-file="terraform.tfvars" \
  -var="environment=dev" \
  -out=tfplan

# 6. Review the plan
terraform show tfplan
```

### Deploying Infrastructure

**Never apply locally to production.**
Use GitHub Actions for all main branch deployments:

1. **Create a feature branch:**
   ```bash
   git checkout -b infra/feature-name
   ```

2. **Make Terraform changes:**
   ```bash
   cd infrastructure/terraform
   # Edit main.tf, variables.tf, etc.
   terraform plan -var-file="terraform.tfvars" -var="environment=dev"
   ```

3. **Push and create PR:**
   ```bash
   git add infrastructure/
   git commit -m "infra(terraform): description of changes"
   git push origin infra/feature-name
   ```

4. **Review plan on PR:**
   - GitHub Actions runs `terraform plan`
   - Plan output commented on PR
   - Reviewers inspect proposed changes

5. **Merge to main:**
   - After approval, PR is merged
   - GitHub Actions runs plan again
   - **Manual approval required** in GitHub environment
   - `terraform apply` executes automatically

### Docker Image Building

Images are automatically built by GitHub Actions (see `.github/workflows/build.yml`):

```bash
# Manual build (local testing only)
cd infrastructure

# Build server image
docker build \
  -f docker/Dockerfile.server \
  -t languageregistry.azurecr.io/server:latest .

# Build client image
docker build \
  -f docker/Dockerfile.client \
  -t languageregistry.azurecr.io/client:latest .

# Push to Azure Container Registry
az acr login --name languageregistry
docker push languageregistry.azurecr.io/server:latest
docker push languageregistry.azurecr.io/client:latest
```

## Cloud Architecture (Azure)

### Core Services

| Service | Purpose |
|---------|---------|
| **Azure Container Apps** | Serverless container platform for gRPC server |
| **Azure Container Registry (ACR)** | Secure Docker image storage and management |
| **Azure Virtual Network (VNet)** | Network isolation and connectivity |
| **Log Analytics Workspace** | Centralized logging and monitoring |
| **Azure Storage Account** | Terraform state file storage with locking |

### Azure Resources Created by Terraform

```
Resource Group: language-rg
├── Container Registry: languageregistry
├── Virtual Network: language-vnet
│   └── Subnet: language-subnet-ca (10.0.1.0/24)
├── Network Security Group: language-nsg
│   └── Rules: Allow gRPC traffic (port 50051)
├── Log Analytics Workspace: language-logs
├── Container Apps Environment: language-{env}-cae
│   └── Container App: language-server
│       ├── Image: languageregistry.azurecr.io/server:latest
│       ├── CPU: 0.5-1.0 cores
│       ├── Memory: 1.0-2.0 GB
│       ├── Replicas: 2-10 (auto-scaling)
│       └── Ingress: TCP port 50051 (gRPC)
```

### Why Azure Container Apps for gRPC?

✅ **Perfect for gRPC workloads:**
- Native HTTP/2 support (required by gRPC)
- TCP ingress with static ports
- Automatic TLS termination
- Built-in request tracing

✅ **Cost effective:**
- Pay only for CPU/memory used
- No cluster management overhead
- Scales to zero (configurable)

✅ **High availability:**
- Multi-zone deployment
- Automatic failover
- Health checks and probes

✅ **Developer friendly:**
- Simple scaling configuration
- No Kubernetes learning curve
- Built-in monitoring and logging

## Secrets Management

Sensitive data should NOT be committed:

1. ❌ Don't commit `.env` files, API keys, or credentials
2. ✅ Use Terraform variables and environment-specific `tfvars`
3. ✅ Store secrets in cloud provider's secret manager
4. ✅ Reference secrets in Kubernetes via `secrets/` manifests

Example Kubernetes secret reference:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  DATABASE_URL: ${DB_URL}  # Set via CI/CD
  API_KEY: ${API_KEY}      # Set via CI/CD
```

## Deployment Workflow

```
Developer Push
    ↓
Feature Branch Created
    ↓
GitHub Actions: Terraform Plan
    ├─ Format check
    ├─ Validate syntax
    ├─ Generate plan
    └─ Comment plan on PR
    ↓
Code Review
    ├─ Inspect resource changes
    ├─ Verify no unintended deletions
    └─ Approve PR
    ↓
Merge to Main
    ↓
GitHub Actions: Terraform Apply
    ├─ Plan again (safety check)
    ├─ Wait for manual approval
    ├─ Apply approved changes
    └─ Export outputs (FQDN, registry URL)
    ↓
Deployment Complete
    ├─ Azure resources updated
    ├─ Container App versions updated
    └─ Logs available in Log Analytics
```

### Key Features

- **PR-based review**: See all changes before applying
- **Deployment locks**: Prevent concurrent modifications
- **State versioning**: Rollback to previous states if needed
- **Approval gates**: Manual review before production apply
- **Automatic logging**: All changes audited in Azure Storage

See:
- `.github/workflows/deploy.yml` for workflow definitions
- `.github/DEPLOYMENT_GUIDE.md` for GitHub Actions details
- `AZURE_DEPLOYMENT_GUIDE.md` for local setup instructions
- `STATE_MANAGEMENT.md` for state and locking details

## Getting Started

### First Time Setup

1. **Prerequisites**
   - Azure subscription with appropriate permissions
   - Azure CLI installed and authenticated
   - Terraform 1.6+ installed
   - Access to GitHub repository

2. **Create State Storage**
   - Follow instructions in `AZURE_DEPLOYMENT_GUIDE.md`
   - Run setup script to create storage account
   - Add secrets to GitHub

3. **Configure Local Development**
   - Copy `terraform/terraform.tfvars.example` → `terraform/terraform.tfvars`
   - Fill in your Azure subscription ID and configuration
   - Run `terraform init` and `terraform plan`

4. **Test Deployment**
   - Create feature branch
   - Make small Terraform change
   - Push and create PR
   - Review plan output
   - Merge and watch GitHub Actions apply

### Common Commands

```bash
# View current infrastructure
cd infrastructure/terraform
terraform state list
terraform state show azurerm_container_app.server

# Check outputs
terraform output
terraform output server_container_app_fqdn

# View server logs
az containerapp logs show \
  --resource-group language-rg \
  --name language-server \
  --follow
```

## Documentation

**Start here:**
- **[../TERRAFORM_QUICKSTART.md](../TERRAFORM_QUICKSTART.md)** - 15-minute setup guide to get started

**Environment Setup:**
- **[AZURE_DEPLOYMENT_GUIDE.md](./AZURE_DEPLOYMENT_GUIDE.md)** - Azure setup, OIDC authentication, troubleshooting
- **[MULTI_ENVIRONMENT_GUIDE.md](./MULTI_ENVIRONMENT_GUIDE.md)** - Managing dev/staging/prod with separate state files and configs

**Advanced Topics:**
- **[BACKEND_CONFIGURATION.md](./BACKEND_CONFIGURATION.md)** - Backend config, why `key` differentiates state files, init flags
- **[STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md)** - State files, locking, versioning, rollback, disaster recovery
- **[../.github/DEPLOYMENT_GUIDE.md](../.github/DEPLOYMENT_GUIDE.md)** - GitHub Actions workflow details and manual triggers
- **[../.github/MANUAL_WORKFLOW_GUIDE.md](../.github/MANUAL_WORKFLOW_GUIDE.md)** - How to trigger workflows manually
- **[../.github/PERMISSIONS_GUIDE.md](../.github/PERMISSIONS_GUIDE.md)** - OIDC authentication and security model

**Reference:**
- **[./.claude/WORKTREE_GUIDE.md](../.claude/WORKTREE_GUIDE.md)** - Infrastructure worktree specifications
- **[../.github/README.md](../.github/README.md)** - GitHub Actions workflows overview

## Support and Troubleshooting

If you encounter issues:

1. **Terraform plan fails**: See `AZURE_DEPLOYMENT_GUIDE.md` → Troubleshooting
2. **GitHub Actions deployment error**: See `.github/DEPLOYMENT_GUIDE.md` → Troubleshooting
3. **State management issues**: See `STATE_MANAGEMENT.md` → Troubleshooting
4. **Azure authentication problems**: See `AZURE_DEPLOYMENT_GUIDE.md` → Prerequisites

## Next Steps

1. **Quick Start**: Read [../TERRAFORM_QUICKSTART.md](../TERRAFORM_QUICKSTART.md)
2. **Set Up Azure**: Follow [AZURE_DEPLOYMENT_GUIDE.md](./AZURE_DEPLOYMENT_GUIDE.md)
3. **Configure Environments**: Review [MULTI_ENVIRONMENT_GUIDE.md](./MULTI_ENVIRONMENT_GUIDE.md)
4. **Test Locally**: `terraform plan -var-file="environments/dev.tfvars"`
5. **Deploy via GitHub**: Use Actions tab to trigger plan/apply for your environment
