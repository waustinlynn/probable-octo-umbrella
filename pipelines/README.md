# Pipelines & CI/CD

This directory contains CI/CD configuration, shared scripts, and pipeline documentation. The actual GitHub Actions workflows are in `.github/workflows/`.

## Structure

```
pipelines/
├── scripts/          # Shared scripts used by workflows
│   ├── build.sh      # Build helper scripts
│   ├── test.sh       # Testing helper scripts
│   └── deploy.sh     # Deployment helper scripts
├── config/           # Configuration for pipeline tools
│   └── codecov.yml   # Code coverage configuration
└── README.md         # This file

.github/
└── workflows/        # GitHub Actions workflow definitions
    ├── test.yml      # Test on push/PR
    ├── build.yml     # Build Docker images on main
    └── deploy.yml    # Deploy to infrastructure (future)
```

## Workflow Overview

### Test Workflow (`.github/workflows/test.yml`)
Runs on: Push to main/develop, Pull requests

**Jobs:**
- `test-client` - Client unit tests, linting, coverage
- `test-server` - Server TypeScript check, unit tests, integration tests
- `validate-infrastructure` - Terraform validation, Kubernetes manifest validation

### Build Workflow (`.github/workflows/build.yml`)
Runs on: Push to main, version tags (v*)

**Jobs:**
- `build-server` - Build and push server Docker image to GHCR
- `build-client` - Build and push client Docker image to GHCR
- `sbom` - Generate Software Bill of Materials for security

### Deploy Workflow (`.github/workflows/deploy.yml`)
*Future implementation*

**Expected Jobs:**
- Plan infrastructure changes with Terraform
- Review and approve before applying
- Deploy to Kubernetes cluster
- Run smoke tests

## Secrets & Environment Variables

### Required GitHub Secrets
None for basic testing. Docker image building uses GITHUB_TOKEN automatically.

### Recommended Secrets (for deployment)
```
AWS_REGION              # AWS region
AWS_ROLE_TO_ASSUME      # IAM role for OIDC
DOCKER_REGISTRY_URL     # Container registry endpoint
KUBE_CONFIG            # Kubernetes config (if needed)
```

### Environment Variables
Set in workflow files or `.github/environments/`:

```yaml
# Development
ENVIRONMENT: dev
LOG_LEVEL: debug

# Production
ENVIRONMENT: prod
LOG_LEVEL: info
```

## Running Workflows Locally

### Test with `act`
```bash
# Install act: https://github.com/nektos/act

# Run test workflow locally
act push -j test-client
act push -j test-server

# Run with specific branch
act -r origin/main
```

### Validate Workflows
```bash
# Using actionlint
brew install actionlint  # macOS
actionlint .github/workflows/*.yml
```

## Pipeline Scripts

### `scripts/test.sh`
```bash
./pipelines/scripts/test.sh client   # Run client tests
./pipelines/scripts/test.sh server   # Run server tests
./pipelines/scripts/test.sh all      # Run all tests
```

### `scripts/build.sh`
```bash
./pipelines/scripts/build.sh server   # Build server image
./pipelines/scripts/build.sh client   # Build client image
./pipelines/scripts/build.sh all      # Build both
```

## Domain-Specific Workflow Triggers

The workflows are smart about when to run expensive jobs:

```yaml
if: |
  contains(github.event.head_commit.modified, 'client/') ||
  github.event_name == 'pull_request'
```

This means:
- Client tests only run if `client/` files changed
- Server tests only run if `server/` files changed
- Infrastructure validation only runs if `infrastructure/` files changed
- Pull requests always run all tests to be safe

## Artifact Management

### Uploaded by Workflows
- `sbom/` - Software Bill of Materials (JSON)
- Coverage reports - Code coverage from tests

### Retention
Default: 90 days (configurable in workflow)

## Deployment Strategy

1. **Test Phase**: Run all tests and validation
2. **Build Phase**: Build and push Docker images on main branch
3. **Plan Phase** (future): `terraform plan` for infrastructure review
4. **Deploy Phase** (future): Apply changes after manual approval
5. **Verify Phase** (future): Run smoke tests and health checks

## Troubleshooting

### Workflow Fails
1. Check the workflow run logs in GitHub Actions
2. Look for domain-specific errors (client/server/infra)
3. Run the same job locally with `act` to reproduce
4. Check that dependencies are installed correctly

### Docker Build Fails
- Ensure Dockerfiles are in `infrastructure/docker/`
- Check that all dependencies are listed in package.json
- Verify build context includes all needed files

### Test Coverage Reports
- Configure in `pipelines/config/codecov.yml`
- Upload to Codecov via codecov/codecov-action@v3
- View reports at codecov.io

## Related Documentation

- See `.claude/WORKTREE_GUIDE.md` for pipelines worktree specifications
- See `infrastructure/README.md` for infrastructure deployment
- See `server/README.md` for server build requirements
- See `client/README.md` for client build requirements
