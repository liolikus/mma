# Envio Setup Manual

This guide will help you set up Envio indexer for the Wallet Autopilot backend.

## Prerequisites

Envio requires Docker to run PostgreSQL and Hasura GraphQL Engine.

## Step 1: Install and Configure Docker

### Install Docker (if not already installed)

```bash
# Update package lists
sudo apt-get update

# Install Docker and Docker Compose
sudo apt-get install -y docker.io docker-compose

# Start Docker service
sudo systemctl start docker

# Enable Docker to start on boot
sudo systemctl enable docker

# Verify Docker is installed
docker --version
```

### Fix Docker Permissions (Important!)

```bash
# Add your user to the docker group
sudo usermod -aG docker $USER

# Apply the group changes (choose ONE of these options):

# Option A: Apply changes to current shell session
newgrp docker

# Option B: Logout and login again (more reliable)
# - Close your terminal
# - Open a new terminal
# - The changes will be applied

# Verify you can run docker without sudo
docker ps
```

**Note:** If `docker ps` still shows permission errors, you must logout/login or restart your computer.

## Step 2: Verify Docker is Running

```bash
# Check Docker daemon is running
sudo systemctl status docker

# If not running, start it:
sudo systemctl start docker

# Test Docker works without sudo
docker run hello-world
```

## Step 3: Install pnpm (if not already installed)

```bash
# Check if pnpm is installed
pnpm --version

# If not installed, install it:
npm install -g pnpm

# Verify installation
pnpm --version
```

## Step 4: Navigate to Backend Directory

```bash
cd /home/liolik/p/mma/backend
```

## Step 5: Install Envio Dependencies

```bash
# Install pnpm dependencies (if not already done)
pnpm install

# This will install the 'envio' CLI tool defined in package.json
```

## Step 6: Start Envio Indexer

```bash
# Start Envio in development mode
pnpm envio dev

# This command will:
# - Start Docker containers (PostgreSQL + Hasura)
# - Generate TypeScript types from schema.graphql
# - Start indexing Monad testnet from block 0
# - Expose GraphQL API at http://localhost:8080/v1/graphql
```

**Expected Output:**

```
Starting Envio development environment...
✓ Docker containers started
✓ Database initialized
✓ GraphQL API running at http://localhost:8080
✓ Hasura Console at http://localhost:8080/console
✓ Indexing events from Monad Testnet (Chain ID: 41454)
```

## Step 7: Verify Envio is Running

### In a NEW terminal window:

```bash
# Check Docker containers are running
docker ps

# You should see containers like:
# - postgres
# - hasura/graphql-engine

# Test GraphQL endpoint
curl -X POST http://localhost:8080/v1/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { queryType { name } } }"}'

# Open Hasura console in browser
# Visit: http://localhost:8080/console
```

## Step 8: Verify Backend Connection

```bash
# In another terminal, check backend logs
cd /home/liolik/p/mma/backend
# (Backend should already be running from npm run dev)

# Test backend API with Envio data
curl http://localhost:3001/api/wallet/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb/health
```

## Full Stack Startup Commands

Once everything is set up, here's how to start the full stack:

### Terminal 1: Envio Indexer
```bash
cd /home/liolik/p/mma/backend
pnpm envio dev
```

### Terminal 2: Backend Agent
```bash
cd /home/liolik/p/mma/backend
npm run dev
```

### Terminal 3: Frontend
```bash
cd /home/liolik/p/mma/frontend
npm run dev
```

## Troubleshooting

### Issue: "Permission denied" when running docker

**Solution:**
```bash
sudo usermod -aG docker $USER
newgrp docker
# OR logout and login again
```

### Issue: "docker: command not found"

**Solution:**
```bash
sudo apt-get update
sudo apt-get install -y docker.io
```

### Issue: "Port 8080 already in use"

**Solution:**
```bash
# Find what's using port 8080
sudo lsof -i :8080

# Kill the process or change Envio port in config
```

### Issue: Envio fails to start containers

**Solution:**
```bash
# Check Docker is running
sudo systemctl status docker

# Start Docker if stopped
sudo systemctl start docker

# Clean up old containers
docker compose -f /home/liolik/p/mma/backend/generated/docker-compose.yaml down
```

### Issue: Backend shows "Backend not available, using mock data"

**Solution:**
1. Verify Envio is running: `curl http://localhost:8080/v1/graphql`
2. Check backend env var: `ENVIO_API_URL=http://localhost:8080/v1/graphql` in `.env`
3. Restart backend: `npm run dev`

### Issue: No data being indexed

**Solution:**
```bash
# Check Envio logs for errors
# Envio runs in foreground, check the terminal output

# Verify network connectivity to Monad testnet
curl https://testnet.monad.xyz -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Check config.yaml has correct contract addresses
cat /home/liolik/p/mma/backend/config.yaml
```

## Stopping Envio

```bash
# In the terminal where Envio is running, press Ctrl+C

# To fully stop and remove containers:
cd /home/liolik/p/mma/backend/generated
docker compose down

# To stop and remove data (clean slate):
docker compose down -v
```

## Environment Variables

Make sure your `/home/liolik/p/mma/backend/.env` file has:

```env
MONAD_RPC_URL=https://testnet.monad.xyz
AGENT_PRIVATE_KEY=0x11111111111111111111111111111111111111111111111
AGENT_ADDRESS=0xe3a49d0C86fcbB4458E7B70b5D64496b553474F3
ENVIO_API_URL=http://localhost:8080/v1/graphql
PORT=3001
```

## Quick Reference

```bash
# Start everything (3 separate terminals):

# Terminal 1: Envio
cd /home/liolik/p/mma/backend && pnpm envio dev

# Terminal 2: Backend
cd /home/liolik/p/mma/backend && npm run dev

# Terminal 3: Frontend
cd /home/liolik/p/mma/frontend && npm run dev

# Verify everything is running:
curl http://localhost:8080/v1/graphql  # Envio GraphQL
curl http://localhost:3001/health       # Backend
curl http://localhost:3000              # Frontend
```

## Next Steps

After Envio is running:
1. Open frontend at http://localhost:3000
2. Connect your MetaMask wallet
3. Backend will now use real blockchain data instead of mocks
4. Envio will index ERC20 Approval and Transfer events in real-time

## Documentation

- Envio Docs: https://docs.envio.dev/
- Monad Testnet: https://docs.monad.xyz/
- Backend API: http://localhost:3001/api
- Hasura Console: http://localhost:8080/console
