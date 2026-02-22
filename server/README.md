# Language Server

A high-performance gRPC audio streaming server with Express HTTP API.

## Tech Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript
- **RPC**: gRPC with Protocol Buffers
- **HTTP**: Express.js
- **Real-time**: WebSockets
- **Testing**: Jest
- **Package Manager**: npm

## Project Structure

```
server/
├── src/
│   ├── index.ts           # Server entry point
│   ├── services/          # Business logic
│   ├── middleware/        # Express middleware
│   ├── types/             # TypeScript interfaces
│   └── **/*.test.ts       # Unit tests
├── proto/                 # Protocol Buffer definitions
│   └── audio.proto        # Audio streaming service definition
├── dist/                  # Compiled JavaScript (generated)
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── jest.config.js         # Jest test configuration
```

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+

### Installation

```bash
npm install
```

### Development

```bash
# Start development server with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run server in production mode
npm start
```

### Testing

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run integration tests only
npm run test:integration

# Run tests with coverage report
npm test -- --coverage
```

### Code Quality

```bash
# Check TypeScript compilation
npm run build

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix
```

## API Endpoints

### gRPC Services
Defined in `proto/audio.proto`. Start the gRPC server on port 50051.

### HTTP REST API (Express)
- Base URL: `http://localhost:8080`
- Health check: `GET /health`
- Status: `GET /status`

### WebSocket
- URL: `ws://localhost:8080/stream`
- For real-time audio streaming

## Environment Variables

Create a `.env` file in the server directory:

```env
# Server Configuration
NODE_ENV=development
PORT=8080
GRPC_PORT=50051
LOG_LEVEL=info

# API Keys and Secrets
API_KEY=your-api-key

# Database (if applicable)
DATABASE_URL=postgresql://user:password@localhost:5432/language
```

Do NOT commit `.env` files. Use `.env.example` for documentation.

## Building Docker Image

```bash
# Build the Docker image
docker build -f ../infrastructure/docker/Dockerfile.server -t language-server:latest .

# Run the container
docker run -p 8080:8080 -p 50051:50051 language-server:latest
```

See `infrastructure/docker/Dockerfile.server` for the production build configuration.

## Deployment

### Local Kubernetes Testing
```bash
# Build and tag image
docker build -f ../infrastructure/docker/Dockerfile.server -t language-server:v1.0.0 .

# Apply Kubernetes manifests (dry-run first)
kubectl apply --dry-run=client -f ../infrastructure/kubernetes/

# Deploy to cluster
kubectl apply -f ../infrastructure/kubernetes/
```

### CI/CD Pipeline
Automatic deployment via GitHub Actions on:
- Push to `main` branch → Build Docker image
- Version tags → Deploy to production

See `.github/workflows/build.yml` for the build pipeline.

## Common Tasks

### Add a New gRPC Service
1. Define service in `proto/audio.proto`
2. Generate TypeScript types: `npx grpc_tools_node_protoc_ts ...`
3. Implement service in `src/services/`
4. Register in `src/index.ts`
5. Add tests in `src/**/*.test.ts`

### Add a New Express Endpoint
1. Create route handler in `src/middleware/` or `src/services/`
2. Register in `src/index.ts` app routes
3. Add tests in `src/**/*.test.ts`
4. Document in this README under API Endpoints

### Update Dependencies
```bash
# Check for updates
npm outdated

# Update packages
npm update

# Update to latest major versions
npm install <package>@latest
```

## Debugging

### Enable Debug Logging
```bash
DEBUG=* npm run dev
```

### Inspect with Node DevTools
```bash
node --inspect-brk dist/index.js
# Open chrome://inspect in Chrome
```

### Test a gRPC Service
```bash
# Using grpcurl
grpcurl -plaintext localhost:50051 list
grpcurl -plaintext localhost:50051 describe <service>
```

## Performance Considerations

- Use TypeScript strict mode for type safety
- Implement proper error handling in all services
- Add request logging and monitoring
- Use connection pooling for databases
- Implement caching where appropriate
- Profile with `node --prof` for bottlenecks

## Related Documentation

- See `.claude/WORKTREE_GUIDE.md` for server worktree specifications
- See `infrastructure/README.md` for deployment
- See `.github/README.md` for CI/CD workflows
- See `pipelines/README.md` for testing scripts

## Contributing

When working in the server worktree:

1. Create a feature branch: `git checkout -b feature/audio-processing`
2. Make changes and test: `npm test`
3. Build to verify: `npm run build`
4. Commit: `git commit -m "feat(server): add audio processing"`
5. Create PR for code review

See `.claude/WORKTREE_GUIDE.md` for more details.
