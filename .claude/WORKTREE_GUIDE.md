# Worktree Development Guide

This guide specifies how Claude should behave when working in different git worktrees across this monorepo. Each worktree focuses on a specific domain with its own tools, tech stack, and development patterns.

## Worktree Contexts

### 1. Client Worktree
**Directory**: `client/`
**Tech Stack**: React Native, Expo, TypeScript, JavaScript
**Primary Language**: TypeScript/TSX

#### Responsibilities
- Mobile application UI and business logic
- Client-side state management
- Audio streaming client implementation
- Native module integration (iOS/Android)
- Expo configuration and build management

#### Agent Specifications
- **General Purpose Agent**: Used for exploring codebase, searching code patterns, investigating issues
- **Focus**: Component architecture, state management patterns, React Native best practices
- **Key Skills**: React component analysis, Expo CLI understanding, TypeScript

#### Tool Permissions
- **Bash**:
  - `npm install` - Install dependencies
  - `npm run build:*` - Build commands
  - `npm test` - Run tests
  - `npm run dev` - Development server
  - `npx expo *` - Expo CLI commands
  - `git worktree *` - Manage git worktrees
- **File Operations**: Full read/write within `client/` directory
- **No Access**: Server code, infrastructure code, deployment scripts

#### Key Files & Patterns
- Component structure: `client/components/`
- App routing: `client/app/`
- Custom hooks: `client/hooks/`
- Services: `client/services/`
- Context/state: `client/context/`

#### Development Workflow
1. Work in `client` worktree
2. Make changes to UI components, hooks, or services
3. Run `npm test` within client directory for unit tests
4. Test on device via Expo
5. Commit changes with `git commit -m "feat(client): ..."`

---

### 2. Server Worktree
**Directory**: `server/`
**Tech Stack**: Node.js, TypeScript, gRPC, Express, Jest
**Primary Language**: TypeScript

#### Responsibilities
- gRPC audio streaming server
- HTTP/REST API endpoints (Express)
- Database integration and ORM
- Business logic and data processing
- WebSocket management
- Authentication and authorization

#### Agent Specifications
- **General Purpose Agent**: Code exploration and pattern analysis
- **Bash Agent**: For running TypeScript compilation, tests, and server operations
- **Focus**: Backend architecture, API design, server performance
- **Key Skills**: gRPC/protobuf, Node.js patterns, TypeScript backend patterns

#### Tool Permissions
- **Bash**:
  - `npm install` - Dependency management
  - `npm run build` - TypeScript compilation
  - `npm test` - Run Jest tests
  - `npm run dev` - Development server with ts-node-dev
  - `npm run lint:*` - Linting and formatting
  - `git worktree *` - Manage git worktrees
- **File Operations**: Full read/write within `server/` directory
- **No Access**: Client code, infrastructure code, deployment scripts

#### Key Files & Patterns
- Entry point: `server/src/index.ts`
- gRPC service definitions: `server/proto/`
- Request handlers: `server/src/services/`
- Middleware: `server/src/middleware/`
- Models/Types: `server/src/types/`
- Tests: `server/src/**/*.test.ts`

#### Development Workflow
1. Work in `server` worktree
2. Modify service logic, add endpoints, or update data models
3. Run `npm run build` to check TypeScript compilation
4. Run `npm test` to verify functionality
5. Run `npm run dev` to test server locally
6. Commit with `git commit -m "feat(server): ..."`

---

### 3. Infrastructure Worktree
**Directory**: `infrastructure/`
**Tech Stack**: Terraform, Azure Container Apps, Docker, Bash/Shell scripts
**Primary Language**: HCL (Terraform), YAML, Bash
**Cloud Provider**: Azure (primary), AWS/GCP (legacy)

#### Responsibilities
- Infrastructure as Code (Terraform targeting Azure)
- Docker build processes and container registry management
- Azure cloud resource management (Container Apps, VNets, ACR, etc.)
- Environment configuration and state management
- Networking, security policies, and RBAC
- gRPC server deployment on Container Apps

#### Agent Specifications
- **General Purpose Agent**: For understanding IaC patterns and structure
- **Bash Agent**: For validating configurations, running terraform commands
- **Focus**: Infrastructure patterns, security best practices, deployment strategy
- **Key Skills**: Terraform, Kubernetes, Cloud platform understanding

#### Tool Permissions
- **Bash**:
  - `terraform plan` - Plan infrastructure changes (read-only analysis)
  - `terraform validate` - Validate configuration syntax
  - `terraform state list/show` - View current state
  - `terraform init` - Initialize Terraform with Azure backend
  - `az *` - Azure CLI commands for manual operations
  - `docker build *` - Build container images
  - `docker push *` - Push images to Azure Container Registry
  - `git worktree *` - Manage git worktrees
- **File Operations**: Full read/write within `infrastructure/` directory
- **No Access**: Client code, server application code
- **Not Permitted**:
  - `terraform apply` in main branch (must use GitHub Actions)
  - `terraform destroy` without manual review
  - `az deployment *` without planning first

#### Key Files & Patterns
- Terraform Azure config: `infrastructure/terraform/` (providers.tf, main.tf, variables.tf, outputs.tf)
- Terraform state backend: Azure Storage Account (configured via secrets)
- Container registry: Azure Container Registry (ACR)
- Dockerfiles: `infrastructure/docker/` (server, client)
- Deployment guide: `infrastructure/AZURE_DEPLOYMENT_GUIDE.md`
- Scripts: `infrastructure/scripts/`
- GitHub Actions workflows: `.github/workflows/deploy.yml`

#### Development Workflow
1. Work in `infrastructure` worktree
2. Modify Terraform Azure configs (Container Apps, VNets, ACR, etc.)
3. Update `infrastructure/terraform/terraform.tfvars` with your environment values
4. Run `terraform validate` to check syntax
5. Run `terraform plan` to preview Azure resource changes
6. For local testing, use `terraform apply` (with appropriate environment variables)
7. Review plan output before applying changes
8. For breaking changes, create a migration plan document
9. Commit with `git commit -m "infra(terraform): ..."`

#### Azure Environment Setup
- **Cloud Provider**: Microsoft Azure
- **State Management**: Azure Storage Account with Terraform backend
- **Container Registry**: Azure Container Registry (ACR)
- **Compute**: Azure Container Apps (for gRPC server)
- **Networking**: Azure Virtual Networks (VNet) with subnets
- **Monitoring**: Log Analytics Workspace
- **Authentication**: Azure CLI or GitHub Actions OIDC

#### Pre-requisites for Local Development
```bash
# Install Azure CLI and login
az login
az account set --subscription <subscription-id>

# Verify Terraform access
cd infrastructure/terraform
terraform init
```

#### Terraform Backend State Management
- **Location**: Azure Storage Account (language-terraform-state resource group)
- **Locking**: Automatic via Azure Storage leases
- **Versioning**: Enabled for state rollback
- **Remote State**: Required for production deployments
- See `AZURE_DEPLOYMENT_GUIDE.md` for setup instructions

---

### 4. Pipelines Worktree
**Directory**: `.github/workflows/` (workflows) + `pipelines/` (scripts & config)
**Tech Stack**: GitHub Actions, YAML, Bash, Docker
**Primary Language**: YAML, Bash

#### Responsibilities
- CI/CD workflow definitions (GitHub Actions)
- Automated testing pipelines
- Build and deployment automation
- Secret management
- Artifact handling
- Release workflows
- Pipeline helper scripts

#### Agent Specifications
- **General Purpose Agent**: For understanding workflow patterns
- **Bash Agent**: For validating workflow syntax and testing scripts
- **Focus**: Pipeline efficiency, reliability, and maintainability
- **Key Skills**: GitHub Actions, YAML, shell scripting, bash

#### Tool Permissions
- **Bash**:
  - `act *` - Test GitHub Actions workflows locally
  - `github cli commands` - Interact with GitHub API
  - `docker build *` - Build containers for pipeline testing
  - `bash pipelines/scripts/*` - Run pipeline scripts
  - `git status` - Check repository state
  - `git log --oneline` - View commit history
  - `git worktree *` - Manage git worktrees
- **File Operations**: Full read/write within `.github/workflows/`, `.github/`, and `pipelines/` directories
- **No Access**: Application code directories (client/, server/)

#### Key Files & Patterns
- Workflows: `.github/workflows/` (test.yml, build.yml, deploy.yml)
- Reusable actions: `.github/actions/` (future)
- Pipeline scripts: `pipelines/scripts/` (test.sh, build.sh, deploy.sh)
- Configuration: `pipelines/config/` (codecov.yml, etc.)
- GitHub docs: `.github/README.md`
- Pipeline docs: `pipelines/README.md`

#### Development Workflow
1. Work in `pipelines` worktree
2. Create or modify workflow files in `.github/workflows/`
3. Add helper scripts in `pipelines/scripts/`
4. Test locally with `act` (GitHub Actions local runner)
5. Validate with actionlint
6. Commit with `git commit -m "ci: ..."`

---

## Cross-Cutting Concerns

### Git Worktree Management
All worktrees should follow this pattern:

```bash
# Create a new feature worktree for a specific area
git worktree add ../feature-name origin/main

# Switch to worktree
cd ../feature-name

# Work on the feature
# ...

# Remove worktree when done
git worktree remove ../feature-name
```

### Testing Strategy by Domain

**Client Testing**
```bash
cd client
npm test
npx expo test
```

**Server Testing**
```bash
cd server
npm test
npm run test:watch
npm run test:integration
```

**Infrastructure Validation (Azure)**
```bash
cd infrastructure/terraform

# Terraform validation
terraform fmt -check -recursive              # Format check
terraform init                                # Initialize with Azure backend
terraform validate                            # Validate configuration
terraform plan -var-file="terraform.tfvars" -var="environment=dev"  # Plan changes

# Azure CLI validation (optional)
az account show                               # Verify Azure authentication
az group list --output table                 # List resource groups
```

### Commit Message Conventions

Prefix commits with the domain:

- `feat(client):` - Client features
- `feat(server):` - Server features
- `feat(infra):` or `infra(terraform):` - Infrastructure changes
- `ci:` - Pipeline/CI changes
- `fix(client):`, `fix(server):`, `fix(infra):` - Bug fixes by domain
- `docs:` - Documentation updates

### Documentation

Each worktree should maintain its own README:
- `client/README.md`
- `server/README.md`
- `infrastructure/README.md`
- `.github/workflows/README.md`

---

## Switching Between Worktrees

When Claude is asked to work across multiple domains:

1. **Ask for clarification** if the request spans multiple worktrees
2. **Work domain-by-domain** - Complete one domain's work before switching
3. **Document changes** that require coordination between domains
4. **Test independently** within each domain
5. **Create a summary** of cross-domain impacts (e.g., API changes that affect client)

---

## Special Instructions by Context

### Client Context
- Always consider mobile-first design principles
- Test responsive behavior across device sizes
- Be aware of platform differences (iOS/Android)
- Check native dependencies before adding packages

### Server Context
- Validate all API contracts with tests
- Consider performance implications
- Document gRPC service changes in proto files
- Ensure backward compatibility where possible

### Infrastructure Context (Azure Deployment)
- **Always use `terraform plan` before apply** - Review all proposed changes
- **State management is critical** - Use Azure Storage backend with locking
- **GitHub Actions handles production deploys** - Never apply directly to main environment
- **Document reasoning for all configuration changes**
- **Consider disaster recovery and security implications**
- **Use immutable infrastructure principles** - Update container images via new deployments
- **Container Apps auto-scaling** - Monitor CPU and memory metrics
- **gRPC on Container Apps** - Requires TCP ingress (configured in main.tf)

### Pipelines Context
- Ensure CI/CD doesn't leak secrets
- Keep pipeline execution time reasonable
- Document non-obvious workflow decisions
- Test workflow logic locally when possible

---

## Tool Access Matrix

| Tool/Command | Client | Server | Infra | Pipelines |
|---|---|---|---|---|
| npm commands | ✅ | ✅ | ❌ | ✅ |
| TypeScript compilation | ✅ | ✅ | ❌ | ✅ |
| terraform | ❌ | ❌ | ✅ | ✅ |
| kubectl | ❌ | ❌ | ✅ | ✅ |
| docker | ❌ | ❌ | ✅ | ✅ |
| git commands | ✅ | ✅ | ✅ | ✅ |
| File read/write | ✅ (client/) | ✅ (server/) | ✅ (infra/) | ✅ (pipelines/) |

---

## When Stuck or Uncertain

1. **Identify the primary domain** of the work
2. **Reference this guide** for domain-specific patterns and tools
3. **Use appropriate agents** for exploration and code analysis
4. **Ask clarifying questions** if crossing domain boundaries
5. **Document assumptions** about architecture or design patterns
