# Worktree Quick Reference

## Creating & Switching Worktrees

```bash
# Create a new worktree for a feature
git worktree add ../feature-name origin/main

# List active worktrees
git worktree list

# Remove worktree when done
git worktree remove ../feature-name
```

## Worktree Types & Commands

### 🔵 Client Worktree
```bash
cd client
npm install          # Install dependencies
npm test             # Run unit tests
npm run dev          # Start development server
npx expo test        # Run Expo tests
```
**Commit prefix**: `feat(client):` | `fix(client):`

### 🟢 Server Worktree
```bash
cd server
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm test             # Run Jest tests
npm run dev          # Start dev server with ts-node-dev
npm run lint:*       # Run linters
```
**Commit prefix**: `feat(server):` | `fix(server):`

### 🟠 Infrastructure Worktree
```bash
cd infrastructure
terraform validate   # Check Terraform syntax
terraform plan       # Preview infrastructure changes
kubectl get pods     # Query Kubernetes resources
docker build .       # Build Docker images
```
**Commit prefix**: `infra(terraform):` | `infra(k8s):` | `infra(docker):`

### 🟡 Pipelines Worktree
```bash
cd .github/workflows
# Edit YAML workflow files
git status           # Check changes
gh pr create         # Create pull request
```
**Commit prefix**: `ci:` | `ci(github-actions):`

## Claude Context Switching

When starting work in a worktree:

1. **State your domain**: "I'm working in the client worktree"
2. **Reference the guide**: Mention `.claude/WORKTREE_GUIDE.md` for context
3. **Use appropriate tools**: Only tools relevant to that domain

## Key Files

| Worktree | Key Files |
|---|---|
| Client | `client/package.json`, `client/app.json`, `client/tsconfig.json` |
| Server | `server/package.json`, `server/src/index.ts`, `server/proto/` |
| Infra | `infrastructure/terraform/`, `infrastructure/kubernetes/` |
| Pipelines | `.github/workflows/`, `pipelines/scripts/` |

## Testing by Domain

```bash
# Client
npm test --prefix client

# Server
npm test --prefix server
npm run test:integration --prefix server

# Infrastructure
terraform -C infrastructure validate
kubectl apply --dry-run=client -f infrastructure/kubernetes/
```

## Remember

- Each worktree has its own `.git` state
- Always test in your domain before committing
- Document cross-domain impacts in PR description
- Use consistent commit message prefixes
- Refer to `.claude/WORKTREE_GUIDE.md` for detailed specifications
