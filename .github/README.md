# GitHub Configuration

This directory contains GitHub-specific configuration including workflows, actions, and templates.

## Structure

```
.github/
├── workflows/          # GitHub Actions workflow definitions
│   ├── test.yml       # Test workflow - runs on push/PR
│   ├── build.yml      # Build workflow - creates Docker images on main
│   └── deploy.yml     # Deploy workflow - future infrastructure deployment
├── actions/           # Custom GitHub Actions (future)
└── README.md          # This file
```

## Workflows

### Test Workflow (`workflows/test.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- All pull requests

**Jobs:**
- **test-client** - React Native/Expo tests
  - Install dependencies
  - Run ESLint
  - Run Jest tests with coverage
  - Upload coverage to Codecov

- **test-server** - Node.js/gRPC tests
  - TypeScript compilation check
  - Run ESLint
  - Run Jest unit tests with coverage
  - Run integration tests
  - Upload coverage to Codecov

- **validate-infrastructure** - IaC validation
  - Terraform format check
  - Terraform syntax validation
  - TFLint analysis
  - Kubernetes manifest dry-run

### Build Workflow (`workflows/build.yml`)

**Triggers:**
- Push to `main` branch
- Version tags (v*)

**Jobs:**
- **build-server** - Build server Docker image
  - Set up Docker Buildx
  - Login to GitHub Container Registry
  - Build image with cache optimization
  - Push to GHCR (GitHub Container Registry)

- **build-client** - Build client Docker image
  - Set up Docker Buildx
  - Login to GitHub Container Registry
  - Build image with cache optimization
  - Push to GHCR

- **sbom** - Generate Software Bill of Materials
  - Create SBOM for server with Anchore
  - Create SBOM for client with Anchore
  - Upload SBOM artifacts

### Deploy Workflow (`workflows/deploy.yml`)

*To be implemented*

Expected functionality:
- Terraform plan on PRs
- Terraform apply on main after approval
- Kubernetes deployment
- Smoke tests and health checks

## Environment Variables

### Defined in Workflows
```yaml
REGISTRY: ghcr.io
IMAGE_NAME: ${{ github.repository }}
```

### Recommended Secrets
Add these to GitHub Settings → Secrets and variables → Actions:

```
AWS_REGION             # AWS region for deployment
AWS_ROLE_TO_ASSUME     # IAM role for OIDC
KUBE_CONFIG           # Kubernetes cluster config
SLACK_WEBHOOK         # For notifications (optional)
```

## Running Workflows

### Locally with `act`

Install [act](https://github.com/nektos/act) to run workflows locally:

```bash
# Run test workflow
act push -j test-client
act push -j test-server

# Run build workflow
act push -j build-server -b main

# Run specific workflow file
act -j test-server -W .github/workflows/test.yml
```

### Viewing Workflow Results

1. Go to repository Settings → Actions
2. View all runs: Actions tab
3. View specific run details
4. Check logs for each job

## GitHub Actions Best Practices

### Security
- ✅ Use GITHUB_TOKEN for default authentication
- ✅ Minimize secrets exposure
- ✅ Use OIDC where possible instead of static credentials
- ✅ Pin action versions to commit SHAs (not major versions)

### Performance
- ✅ Use `actions/cache` for dependencies
- ✅ Use Docker layer caching in builds
- ✅ Run jobs in parallel when possible
- ✅ Conditional job execution based on file changes

### Maintainability
- ✅ Document each workflow
- ✅ Use consistent naming conventions
- ✅ Keep workflows DRY with reusable actions
- ✅ Version your workflows

## Troubleshooting

### Workflow Won't Start
- Check branch protection rules
- Verify trigger conditions in workflow file
- Check if workflow syntax is valid

### Job Fails in Workflow
1. Click the job to view logs
2. Check specific step that failed
3. Reproduce locally with `act` if possible
4. Check for missing secrets/environment variables

### Docker Build Fails
- Ensure Dockerfiles exist at paths specified
- Check that all dependencies are in package.json
- Verify the build context has needed files
- Run locally: `docker build -f infrastructure/docker/Dockerfile.server .`

### Test Coverage Not Uploading
- Verify `codecov.yml` exists in `pipelines/config/`
- Check that tests generate coverage reports
- Confirm workflow has permission to upload
- Check Codecov repository settings

## Future Enhancements

1. **Automated Deployments** - Deploy workflow for production
2. **Notifications** - Slack/Discord alerts on workflow status
3. **Performance Reports** - Track build times and test performance
4. **Security Scanning** - SAST, dependency scanning, container scanning
5. **Release Automation** - Automated changelog and release notes

## Related Documentation

- See `pipelines/README.md` for pipeline scripts and configuration
- See `.claude/WORKTREE_GUIDE.md` for pipelines worktree specifications
- See `infrastructure/README.md` for infrastructure deployment
- See individual domain READMEs for build requirements
