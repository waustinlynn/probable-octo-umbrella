# Language: Audio Streaming Platform

A full-stack monorepo for building real-time audio streaming applications with React Native, Node.js, and optional OpenAI integration.

## 🎯 Quick Navigation

Choose your starting point based on what you want to do:

### I want to get started quickly
→ Read [**QUICKSTART.md**](QUICKSTART.md) (5 minutes)

### I want to build audio streaming with AI (Whisper → GPT-4 → TTS)
→ Read [**server/QUICKSTART_AUDIO.md**](server/QUICKSTART_AUDIO.md) (5 minutes)
→ Then [**server/AUDIO_STREAMING_SETUP.md**](server/AUDIO_STREAMING_SETUP.md) (complete guide)

### I want to understand the architecture
→ Keep reading below or see [Project Structure](#project-structure)

### I want to test or write tests
→ Read [**server/TESTING.md**](server/TESTING.md)

### I'm working in a specific domain (client/server/infrastructure/pipelines)
→ Read [**.claude/WORKTREE_GUIDE.md**](.claude/WORKTREE_GUIDE.md) for development practices

---

## 📦 Project Structure

This is a monorepo with four main domains:

```
language/
├── client/                      # React Native mobile app (Expo)
│   ├── README.md               # Client setup & development
│   ├── app/                    # App screens and routing
│   ├── components/             # UI components
│   ├── services/               # Business logic (WebSocket, Audio)
│   ├── context/                # State management
│   ├── hooks/                  # Custom React hooks
│   └── package.json
│
├── server/                      # Node.js backend
│   ├── README.md               # Server setup & development
│   ├── QUICKSTART_AUDIO.md     # AI audio streaming quickstart
│   ├── AUDIO_STREAMING_SETUP.md # Complete audio/AI guide
│   ├── TESTING.md              # Testing guide
│   ├── src/
│   │   ├── index.ts            # Server entry point
│   │   ├── services/           # Business logic
│   │   ├── middleware/         # Express middleware
│   │   └── **/*.test.ts        # Tests
│   ├── proto/                  # gRPC definitions
│   └── package.json
│
├── infrastructure/              # Infrastructure as Code
│   ├── README.md               # Infrastructure setup
│   ├── terraform/              # Terraform configurations
│   ├── kubernetes/             # Kubernetes manifests
│   └── docker/                 # Docker build files
│
├── .github/                     # GitHub configuration
│   ├── workflows/              # GitHub Actions CI/CD
│   └── README.md               # GitHub Actions documentation
│
├── pipelines/                   # CI/CD utilities
│   ├── README.md               # Pipeline documentation
│   ├── scripts/                # Helper scripts
│   └── config/                 # Pipeline configuration
│
├── .claude/                     # Claude Code configuration
│   ├── WORKTREE_GUIDE.md       # Development practices by domain
│   ├── WORKTREE_QUICK_REFERENCE.md
│   └── settings.local.json
│
├── QUICKSTART.md               # Main quick start guide
└── README.md                   # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+** and **npm**
- **Git** with worktree support
- Optional: **Docker** for containerized deployment
- Optional: **OpenAI API key** for audio AI features

### Option 1: Basic Audio Streaming (5 minutes)

```bash
# Terminal 1: Start the server
cd server
npm install
npm run dev

# Terminal 2: Start the client
cd client
npm install
npm start
# Scan QR code with Expo Go or press 'a'/'i'
```

See [QUICKSTART.md](QUICKSTART.md) for details.

### Option 2: Audio Streaming with AI (OpenAI)

```bash
# Terminal 1: Setup and start server with OpenAI
cd server
cp .env.example .env
# Add your OPENAI_API_KEY to .env
npm install
npm run dev

# Terminal 2: Start the client
cd client
npm install
npm start
```

See [**server/QUICKSTART_AUDIO.md**](server/QUICKSTART_AUDIO.md) for 5-minute setup.

---

## 🏗️ Architecture Overview

### Technology Stack

**Frontend:**
- React Native (Expo) - Cross-platform mobile apps
- TypeScript - Type-safe development
- WebSocket - Real-time communication
- expo-av - Audio recording/playback

**Backend:**
- Node.js/TypeScript - Runtime
- gRPC - Service-to-service communication
- Express.js - HTTP API
- WebSocket - Real-time streaming
- Optional: OpenAI APIs (Whisper, GPT-4, TTS)

**Infrastructure:**
- Terraform - Infrastructure as Code
- Kubernetes - Container orchestration
- Docker - Containerization
- GitHub Actions - CI/CD

### Data Flow

```
Client (React Native)
    ↓
  [Records audio]
    ↓
[WebSocket → Server]
    ↓
Server (Node.js)
    ↓
[Process audio: Whisper → GPT-4 → TTS]
    ↓
[WebSocket ← Server]
    ↓
Client (React Native)
    ↓
  [Plays response]
```

Complete message flows documented in [**server/AUDIO_STREAMING_SETUP.md**](server/AUDIO_STREAMING_SETUP.md#message-flow).

---

## 🛠️ Development Guide

### Using Git Worktrees

This project uses **git worktrees** for parallel development across domains:

```bash
# Create a feature branch in a worktree
git worktree add ../feature-name origin/main

# Switch to the worktree
cd ../feature-name

# Work on your feature
# When done, remove the worktree
git worktree remove ../feature-name
```

### Domain-Specific Development

Each domain has specific tools, patterns, and practices:

**Client Development:**
- See `client/README.md` for setup
- Focus on React Native components and state management
- Test with `npm test`

**Server Development:**
- See `server/README.md` for setup
- Focus on API endpoints and business logic
- Test with `npm test` and `npm run test:integration`
- Add OpenAI integration for AI features

**Infrastructure:**
- See `infrastructure/README.md` for setup
- Validate with `terraform plan` and `terraform validate`
- Deploy with GitHub Actions

**Pipelines:**
- See `.github/README.md` and `pipelines/README.md`
- Edit workflows in `.github/workflows/`
- Test locally with `act`

For detailed practices, see [**.claude/WORKTREE_GUIDE.md**](.claude/WORKTREE_GUIDE.md).

---

## 📚 Documentation by Domain

### Client (React Native/Expo)

- [client/README.md](client/README.md) - Development guide
- Complete guides: Routing, components, state management

### Server (Node.js/gRPC)

- [server/README.md](server/README.md) - Development guide
- [server/QUICKSTART_AUDIO.md](server/QUICKSTART_AUDIO.md) - AI audio setup (5 min)
- [server/AUDIO_STREAMING_SETUP.md](server/AUDIO_STREAMING_SETUP.md) - Complete audio/AI guide
- [server/TESTING.md](server/TESTING.md) - Testing guide with examples

### Infrastructure & Deployment

- [infrastructure/README.md](infrastructure/README.md) - Terraform, Kubernetes, Docker
- [.github/README.md](.github/README.md) - GitHub Actions workflows
- [pipelines/README.md](pipelines/README.md) - CI/CD utilities and scripts

### Developer Tools

- [.claude/WORKTREE_GUIDE.md](.claude/WORKTREE_GUIDE.md) - Development practices and tool permissions
- [.claude/WORKTREE_QUICK_REFERENCE.md](.claude/WORKTREE_QUICK_REFERENCE.md) - Quick reference card

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflows

Automatic testing, building, and deployment:

- **Test** (`test.yml`) - Runs on every push/PR
  - Client: ESLint + Jest
  - Server: TypeScript + Jest + Integration tests
  - Infrastructure: Terraform + Kubernetes validation

- **Build** (`build.yml`) - Runs on main branch pushes
  - Builds Docker images for server and client
  - Pushes to GitHub Container Registry
  - Generates SBOM for security

See [.github/README.md](.github/README.md) for workflow details.

### Local Pipeline Testing

Test workflows locally before pushing:

```bash
# Install act (GitHub Actions local runner)
brew install act

# Run test workflow
act push -j test-server
act push -j build-server
```

---

## 🐳 Docker & Deployment

### Building Docker Images

```bash
# Build server image
docker build -f infrastructure/docker/Dockerfile.server -t language-server:latest .

# Build client image
docker build -f infrastructure/docker/Dockerfile.client -t language-client:latest .

# Run server
docker run -p 8080:8080 -p 50051:50051 \
  -e OPENAI_API_KEY=sk-... \
  language-server:latest
```

### Kubernetes Deployment

```bash
# Validate manifests
kubectl apply --dry-run=client -f infrastructure/kubernetes/

# Deploy
kubectl apply -f infrastructure/kubernetes/
```

See [infrastructure/README.md](infrastructure/README.md) for complete deployment guide.

---

## 🧪 Testing

### Run All Tests

```bash
# Client tests
cd client && npm test

# Server tests (unit + integration)
cd server && npm test
cd server && npm run test:integration

# Infrastructure validation
cd infrastructure
terraform validate
kubectl apply --dry-run=client -f kubernetes/
```

See [server/TESTING.md](server/TESTING.md) for detailed testing guide with examples.

---

## 🔧 Configuration

### Environment Variables

**Server** (`.env`):
```bash
NODE_ENV=development
PORT=8080
OPENAI_API_KEY=sk-...  # Optional, for AI features
```

**Client** (`.env`):
```bash
EXPO_PUBLIC_WS_URL=ws://localhost:8080
```

See respective README files for complete configuration options.

---

## 🤝 Contributing

When working on this project:

1. **Choose your domain** (client, server, infrastructure, or pipelines)
2. **Read the relevant README** in that domain's folder
3. **Read [.claude/WORKTREE_GUIDE.md](.claude/WORKTREE_GUIDE.md)** for development practices
4. **Create a git worktree** for your feature
5. **Follow commit conventions**:
   - `feat(client):`, `feat(server):`, `infra():`, `ci():` - by domain
   - `fix(...)` for bug fixes
   - `docs:` for documentation

6. **Test your changes** before committing
7. **Create a pull request** with a clear description

---

## 📖 Common Tasks

### Add a new feature to the client
1. Read [client/README.md](client/README.md)
2. Create a worktree: `git worktree add ../feature-client origin/main`
3. Develop in `client/` folder
4. Test: `npm test --prefix client`
5. Commit: `git commit -m "feat(client): ..."`

### Add a new API endpoint to the server
1. Read [server/README.md](server/README.md)
2. Create a worktree: `git worktree add ../feature-server origin/main`
3. Implement in `server/src/`
4. Add tests in `server/src/**/*.test.ts`
5. Test: `npm test --prefix server`
6. Commit: `git commit -m "feat(server): ..."`

### Deploy infrastructure changes
1. Read [infrastructure/README.md](infrastructure/README.md)
2. Modify Terraform in `infrastructure/terraform/`
3. Validate: `terraform -C infrastructure/terraform plan`
4. Review PR
5. GitHub Actions handles deployment

### Update CI/CD workflows
1. Read [.github/README.md](.github/README.md)
2. Edit workflows in `.github/workflows/`
3. Test locally: `act push -j test-server`
4. Commit: `git commit -m "ci: ..."`

---

## 🆘 Troubleshooting

### Server connection issues
- Verify server is running: `curl http://localhost:8080/health`
- Check WebSocket URL in client matches server address
- For physical device: use computer IP instead of localhost

### Audio permission denied
- iOS: Settings > Privacy > Microphone
- Android: Grant permission when prompted

### Tests failing
- Run with verbose output: `npm test -- --verbose`
- Check [server/TESTING.md](server/TESTING.md) for detailed guidance
- Clear cache: `rm -rf node_modules && npm install`

### Docker build fails
- Check Dockerfile exists at specified path
- Verify all dependencies in package.json
- Ensure build context has required files

See individual domain READMEs for domain-specific troubleshooting.

---

## 📞 Need Help?

1. **Quick setup**: [QUICKSTART.md](QUICKSTART.md) or [server/QUICKSTART_AUDIO.md](server/QUICKSTART_AUDIO.md)
2. **Architecture**: [Project Structure](#project-structure) or [SETUP.md](SETUP.md)
3. **Development practices**: [.claude/WORKTREE_GUIDE.md](.claude/WORKTREE_GUIDE.md)
4. **Domain-specific**: See README.md in `client/`, `server/`, or `infrastructure/`
5. **Testing**: [server/TESTING.md](server/TESTING.md)
6. **Deployment**: [infrastructure/README.md](infrastructure/README.md) and [.github/README.md](.github/README.md)

---

## 📄 License

[Add your license here]

---

## 🚀 Next Steps

1. **First time?** → [QUICKSTART.md](QUICKSTART.md)
2. **Want AI features?** → [server/QUICKSTART_AUDIO.md](server/QUICKSTART_AUDIO.md)
3. **Deploying?** → [infrastructure/README.md](infrastructure/README.md)
4. **Contributing?** → Read this README's Contributing section
5. **Working in specific domain?** → [.claude/WORKTREE_GUIDE.md](.claude/WORKTREE_GUIDE.md)

Happy building! 🎉
