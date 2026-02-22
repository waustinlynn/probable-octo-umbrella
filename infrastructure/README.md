# Infrastructure

This directory contains all infrastructure-as-code, container configurations, and deployment manifests.

## Structure

```
infrastructure/
├── terraform/          # Terraform modules and configurations
│   ├── providers.tf    # Cloud provider configuration
│   ├── variables.tf    # Input variables
│   ├── main.tf         # Main resource definitions
│   ├── outputs.tf      # Output values
│   └── modules/        # Reusable Terraform modules
├── kubernetes/         # Kubernetes manifests
│   ├── namespace.yaml  # Namespace definitions
│   ├── deployments/    # Deployment configurations
│   ├── services/       # Service definitions
│   ├── configmaps/     # ConfigMap resources
│   └── secrets/        # Secret references (don't commit sensitive data)
└── docker/             # Dockerfile configurations
    ├── Dockerfile.server
    ├── Dockerfile.client
    └── .dockerignore
```

## Development Workflow

When working in the infrastructure worktree:

### Validate Changes
```bash
cd infrastructure

# Validate Terraform
terraform validate
terraform plan

# Validate Kubernetes manifests
kubectl apply --dry-run=client -f kubernetes/
kubectl apply --dry-run=server -f kubernetes/
```

### Apply Infrastructure Changes
```bash
# Plan changes (read-only, safe to inspect)
terraform plan -out=tfplan

# Apply approved changes (requires explicit confirmation)
terraform apply tfplan
```

### Build and Push Docker Images
```bash
# Build server image
docker build -f docker/Dockerfile.server -t language-server:latest .

# Build client image
docker build -f docker/Dockerfile.client -t language-client:latest .

# Push to registry
docker push language-server:latest
docker push language-client:latest
```

## Cloud Architecture

### Services
- **Kubernetes Cluster**: Primary runtime environment
- **Container Registry**: Stores Docker images (server, client)
- **Load Balancer**: Routes traffic to gRPC server
- **Networking**: VPC, subnets, security groups

### Key Resources (Terraform)
- EKS/GKE/AKS cluster
- RDS for persistent data (optional)
- S3/GCS/Azure Blob for object storage
- CloudWatch/Stackdriver/Azure Monitor for logging

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

1. **Local validation** - `terraform plan`, `kubectl dry-run`
2. **Code review** - PR review of infrastructure changes
3. **CI/CD execution** - GitHub Actions applies changes
4. **Verification** - Health checks and monitoring alerts

See `.github/workflows/` for deployment automation.

## Related Guides

- See `.claude/WORKTREE_GUIDE.md` for infrastructure worktree specifications
- See `pipelines/README.md` for CI/CD pipeline documentation
- See `server/README.md` for containerization requirements
- See `client/README.md` for client deployment requirements
