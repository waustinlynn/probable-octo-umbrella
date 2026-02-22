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
**Tech Stack**: Terraform, Kubernetes manifests, Docker, Bash/Shell scripts
**Primary Language**: HCL (Terraform), YAML, Bash

#### Responsibilities
- Infrastructure as Code (Terraform)
- Kubernetes manifests and configurations
- Docker build processes
- Cloud resource management (AWS/GCP/Azure)
- Environment configuration
- Networking and security policies

#### Agent Specifications
- **General Purpose Agent**: For understanding IaC patterns and structure
- **Bash Agent**: For validating configurations, running terraform commands
- **Focus**: Infrastructure patterns, security best practices, deployment strategy
- **Key Skills**: Terraform, Kubernetes, Cloud platform understanding

#### Tool Permissions
- **Bash**:
  - `terraform plan` - Plan infrastructure changes (read-only analysis)
  - `terraform validate` - Validate configuration syntax
  - `kubectl get *` - Query Kubernetes resources (read-only)
  - `docker build *` - Build container images
  - `helm validate *` - Validate Helm charts
  - `git worktree *` - Manage git worktrees
- **File Operations**: Full read/write within `infrastructure/` directory
- **No Access**: Client code, server application code

#### Key Files & Patterns
- Terraform modules: `infrastructure/terraform/modules/`
- Provider configuration: `infrastructure/terraform/providers.tf`
- Kubernetes: `infrastructure/kubernetes/`
- Dockerfiles: `infrastructure/docker/`
- Scripts: `infrastructure/scripts/`

#### Development Workflow
1. Work in `infrastructure` worktree
2. Modify Terraform configs, update Kubernetes manifests, or adjust Docker builds
3. Run `terraform plan` to preview changes
4. Run `terraform validate` to check syntax
5. For breaking changes, create a migration plan document
6. Commit with `git commit -m "infra(terraform): ..."` or `git commit -m "infra(k8s): ..."`

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

**Infrastructure Validation**
```bash
cd infrastructure
terraform validate
terraform plan
kubectl apply --dry-run=client -f kubernetes/
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

### Infrastructure Context
- Always plan before applying infrastructure changes
- Document the reasoning for configuration choices
- Consider disaster recovery and security implications
- Use immutable infrastructure principles

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
