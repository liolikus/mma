# Envio HyperIndex Integration Guide

## Overview

Envio HyperIndex is a real-time blockchain indexer that will power the Wallet Autopilot monitoring system. It tracks on-chain events like token approvals, transfers, spam tokens, and dust balances, feeding this data to the automation agent.

## Quick Reference: Monad Testnet Configuration

```yaml
# Critical values for Monad Testnet
Chain ID: 10143              # NOT 41454!
HyperSync URL: https://monad-testnet.hypersync.xyz
RPC URL: https://testnet-rpc.monad.xyz
HyperRPC URL: https://monad-testnet.rpc.hypersync.xyz
```

**Always use HyperSync for best performance!**

## Prerequisites

```bash
# Install Node.js 22+ and pnpm
npm install -g pnpm

# Install Docker Desktop (for local development)
# Download from: https://www.docker.com/products/docker-desktop/

# For Windows users: Install WSL
# Follow: https://learn.microsoft.com/en-us/windows/wsl/install
```

---

## Part 1: Initializing Your Indexer

### 1.1 Quick Start with Contract Import

The fastest way to start indexing is using the Contract Import method:

```bash
# Navigate to your backend directory
cd backend

# Initialize indexer
pnpx envio init
```

**Interactive Prompts:**

```
? Choose an initialization option
  Template
> Contract Import

? Would you like to import from a block explorer or a local abi?
> Block Explorer
  Local ABI

? Which blockchain would you like to import a contract from?
> [Custom Network ID]  # We'll add Monad manually

# Enter Monad testnet details:
Network Name: monad-testnet
Chain ID: 41454
RPC URL: https://testnet.monad.xyz
```

### 1.2 Alternative: Manual Initialization

For Wallet Autopilot, we'll manually configure for Monad and add contract ABIs:

```bash
pnpx envio init

# Select "Template" → Choose "Greeter Template" as base
# We'll modify the generated files for our needs
```

---

## Part 2: Configuration File Setup

### 2.1 Main Configuration (config.yaml)

Create or modify `config.yaml` for Wallet Autopilot:

```yaml
# backend/config.yaml
# yaml-language: $schema=./node_modules/envio/evm.schema.json

name: WalletAutopilot
description: Indexer for wallet health monitoring and automation

# Enable for faster processing
preload_handlers: true

# Store raw events for debugging
raw_events: true

# Address format - lowercase is faster
address_format: lowercase

contracts:
  # Standard ERC20 tokens for approval monitoring
  - name: ERC20Token
    abi_file_path: ./abis/ERC20.json
    handler: ./src/EventHandlers.js
    events:
      - event: "Approval(address indexed owner, address indexed spender, uint256 value)"
      - event: "Transfer(address indexed from, address indexed to, uint256 value)"

networks:
  - id: 10143  # Monad Testnet (IMPORTANT: Use 10143, not 41454)
    start_block: 0  # HyperSync will find first relevant block automatically
    hypersync_config:
      url: https://monad-testnet.hypersync.xyz  # Use HyperSync for faster indexing
    contracts:
      # Add token addresses you want to track
      - name: ERC20Token
        address:
          # Add known token addresses here when available
          # Example deployed tokens on Monad testnet:
          - "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701"
          - "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea"
```

### 2.2 Environment Variables

Create `.env` file for configuration:

```bash
# backend/.env

# Envio API Token (get from https://envio.dev/app/api-tokens)
ENVIO_API_TOKEN=your-api-token-here

# Hasura Admin Secret
HASURA_ADMIN_SECRET=testing

# Optional: Custom PostgreSQL settings
ENVIO_PG_PORT=5433
ENVIO_PG_PASSWORD=testing
ENVIO_PG_USER=postgres
ENVIO_PG_DATABASE=envio-dev
HASURA_EXTERNAL_PORT=8080
```

**Important Notes:**
- Chain ID for Monad Testnet is **10143** (not 41454)
- Use **HyperSync** URL for faster indexing: `https://monad-testnet.hypersync.xyz`
- RPC URL (if needed): `https://testnet-rpc.monad.xyz`
- HyperRPC URL (alternative): `https://monad-testnet.rpc.hypersync.xyz`

Use environment variables in config:

```yaml
networks:
  - id: 10143
    hypersync_config:
      url: ${ENVIO_RPC_URL:-https://testnet.monad.xyz}
```

---

## Part 3: Schema Definition

### 3.1 GraphQL Schema (schema.graphql)

Define data structures for indexed events:

```graphql
# backend/schema.graphql

# Token Approval Events (for auto-revoke feature)
type TokenApproval @entity {
  id: ID!
  owner: String!
  spender: String!
  tokenAddress: String!
  amount: BigInt!
  
  # Metadata
  blockNumber: BigInt!
  blockTimestamp: BigInt!
  transactionHash: String!
  
  # Risk assessment
  isUnlimited: Boolean!
  isRisky: Boolean!
  lastUsedAt: BigInt
  
  # Status tracking
  status: ApprovalStatus!
  revokedAt: BigInt
  revokedTxHash: String
}

enum ApprovalStatus {
  ACTIVE
  REVOKED
  EXPIRED
}

# Token Transfer Events (for spam detection)
type TokenTransfer @entity {
  id: ID!
  from: String!
  to: String!
  tokenAddress: String!
  amount: BigInt!
  
  blockNumber: BigInt!
  blockTimestamp: BigInt!
  transactionHash: String!
  
  # Spam detection flags
  isPotentialSpam: Boolean!
  isAirdrop: Boolean!
}

# Wallet Token Balances (for dust tracking)
type WalletTokenBalance @entity {
  id: ID!  # Format: wallet-token
  walletAddress: String!
  tokenAddress: String!
  balance: BigInt!
  
  # USD value estimation
  estimatedValueUSD: Float
  isDust: Boolean!  # < $1
  
  lastUpdatedBlock: BigInt!
  lastUpdatedTimestamp: BigInt!
}

# Token Metadata (for displaying token info)
type TokenMetadata @entity {
  id: ID!  # Token address
  address: String!
  name: String
  symbol: String
  decimals: Int!
  
  # Spam detection
  isVerified: Boolean!
  isSpam: Boolean!
  hasLiquidity: Boolean!
  
  # Activity tracking
  totalHolders: Int!
  totalTransfers: BigInt!
  firstSeenBlock: BigInt!
}

# Automated Actions Log (track what agent does)
type AutomatedAction @entity {
  id: ID!
  walletAddress: String!
  actionType: ActionType!
  
  # Details
  tokenAddress: String
  targetAddress: String  # Spender for revokes
  amount: BigInt
  
  # Execution
  transactionHash: String!
  blockNumber: BigInt!
  blockTimestamp: BigInt!
  gasUsed: BigInt!
  
  status: ActionStatus!
  errorMessage: String
}

enum ActionType {
  REVOKE_APPROVAL
  CONSOLIDATE_DUST
  REMOVE_SPAM
}

enum ActionStatus {
  PENDING
  COMPLETED
  FAILED
}

# Wallet Health Metrics (aggregated view)
type WalletHealth @entity {
  id: ID!  # Wallet address
  walletAddress: String!
  
  # Metrics
  activeApprovalsCount: Int!
  riskyApprovalsCount: Int!
  spamTokensCount: Int!
  dustTokensCount: Int!
  healthScore: Int!  # 0-100
  
  # Last update
  lastCalculatedAt: BigInt!
  lastActionAt: BigInt
}
```

### 3.2 Generate TypeScript Types

After defining schema, generate types:

```bash
cd backend
pnpm codegen
```

This creates TypeScript types in `generated/` directory.

---

## Part 4: Event Handlers

**Important: Event Object Structure**

The `event` object passed to handlers has this structure:
- `event.params` - Event-specific parameters (owner, spender, value, etc.)
- `event.srcAddress` - Contract address that emitted the event
- `event.logIndex` - Log index within the block
- `event.chainId` - Network chain ID
- `event.block.number` - Block number (nested!)
- `event.block.timestamp` - Block timestamp (nested!)
- `event.block.hash` - Block hash (nested!)
- `event.transaction.hash` - Transaction hash (nested!)
- `event.transaction.from` - Transaction sender (nested!)

**Always use nested access:** `event.block.number`, NOT `event.blockNumber`

### 4.1 ERC20 Approval Handler

```javascript
// backend/src/EventHandlers.js
const { ERC20Token } = require("generated");

// Maximum approval amount (2^256 - 1)
const MAX_UINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

// Threshold for unlimited approval
const UNLIMITED_THRESHOLD = BigInt("0xffffffffffffffffffffffffffffffffffffffffffff"); // ~10^72

/**
 * Handle ERC20 Approval events
 * Tracks token approvals for auto-revoke feature
 */
ERC20Token.Approval.handler(async ({ event, context }) => {
  const { owner, spender, value } = event.params;
  const tokenAddress = event.srcAddress.toLowerCase();
  
  // Create unique ID: owner-spender-token
  const approvalId = `${owner}-${spender}-${tokenAddress}`.toLowerCase();

  // Check if unlimited approval
  const isUnlimited = value >= UNLIMITED_THRESHOLD;

  // Assess risk (you can expand this logic)
  const isRisky = isUnlimited || await isSpenderRisky(spender, context);

  // Upsert TokenApproval entity
  const approval: TokenApproval = {
    id: approvalId,
    owner: owner.toLowerCase(),
    spender: spender.toLowerCase(),
    tokenAddress,
    amount: value,
    
    blockNumber: BigInt(event.block.number),
    blockTimestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash,
    
    isUnlimited,
    isRisky,
    lastUsedAt: undefined,
    
    status: value > 0n ? "ACTIVE" : "REVOKED",
    revokedAt: value === 0n ? BigInt(event.block.timestamp) : undefined,
    revokedTxHash: value === 0n ? event.transaction.hash : undefined,
  };

  context.TokenApproval.set(approval);

  // Update wallet health metrics
  await updateWalletHealth(owner.toLowerCase(), context);
  
  // Update token metadata
  await updateTokenMetadata(tokenAddress, context);
});

/**
 * Check if spender is risky
 * Placeholder - implement actual risk logic
 */
async function isSpenderRisky(spender: string, context: any): Promise<boolean> {
  // TODO: Check against known risky protocols
  // TODO: Check if contract is verified
  // TODO: Check recent exploit history
  return false;
}

/**
 * Update wallet health score
 */
async function updateWalletHealth(walletAddress: string, context: any) {
  // Get all active approvals for this wallet
  const approvals = await context.TokenApproval.getWhere({
    owner: walletAddress,
    status: "ACTIVE",
  });

  const activeCount = approvals.length;
  const riskyCount = approvals.filter((a: any) => a.isRisky).length;

  // Calculate health score (0-100)
  let healthScore = 100;
  healthScore -= riskyCount * 10;  // -10 points per risky approval
  healthScore -= activeCount * 2;   // -2 points per approval
  healthScore = Math.max(0, Math.min(100, healthScore));

  const health: WalletHealth = {
    id: walletAddress,
    walletAddress,
    activeApprovalsCount: activeCount,
    riskyApprovalsCount: riskyCount,
    spamTokensCount: 0,  // Updated by transfer handler
    dustTokensCount: 0,   // Updated by balance tracker
    healthScore,
    lastCalculatedAt: BigInt(Date.now()),
    lastActionAt: undefined,
  };

  context.WalletHealth.set(health);
}

/**
 * Update token metadata
 */
async function updateTokenMetadata(tokenAddress: string, context: any) {
  let metadata = await context.TokenMetadata.get(tokenAddress);
  
  if (!metadata) {
    // Create new metadata entry
    metadata = {
      id: tokenAddress,
      address: tokenAddress,
      name: undefined,
      symbol: undefined,
      decimals: 18,  // Default
      isVerified: false,
      isSpam: false,
      hasLiquidity: false,
      totalHolders: 0,
      totalTransfers: 0n,
      firstSeenBlock: 0n,
    };
  }

  metadata.totalTransfers = (metadata.totalTransfers || 0n) + 1n;
  
  context.TokenMetadata.set(metadata);
}
```

### 4.2 ERC20 Transfer Handler (Spam Detection)

```typescript
/**
 * Handle ERC20 Transfer events
 * Detects spam tokens and tracks balances
 */
ERC20Token.Transfer.handler(async ({ event, context }) => {
  const { from, to, value } = event.params;
  const tokenAddress = event.srcAddress.toLowerCase();
  
  // Create transfer record
  const transferId = `${event.transaction.hash}-${event.logIndex}`;
  
  // Detect potential spam (received without interaction)
  const isPotentialSpam = 
    from === "0x0000000000000000000000000000000000000000" || // Mint
    await isAirdropTransfer(to, event.transaction.from, context);
  
  const transfer: TokenTransfer = {
    id: transferId,
    from: from.toLowerCase(),
    to: to.toLowerCase(),
    tokenAddress,
    amount: value,
    blockNumber: BigInt(event.block.number),
    blockTimestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash,
    isPotentialSpam,
    isAirdrop: from === "0x0000000000000000000000000000000000000000",
  };

  context.TokenTransfer.set(transfer);

  // Update token balances for dust tracking
  if (from !== "0x0000000000000000000000000000000000000000") {
    await updateWalletBalance(from.toLowerCase(), tokenAddress, context);
  }
  if (to !== "0x0000000000000000000000000000000000000000") {
    await updateWalletBalance(to.toLowerCase(), tokenAddress, context);
  }
});

/**
 * Check if transfer is an airdrop (unsolicited)
 */
async function isAirdropTransfer(
  recipient: string, 
  txFrom: string, 
  context: any
): Promise<boolean> {
  // If recipient didn't initiate the transaction, it's likely an airdrop
  return recipient.toLowerCase() !== txFrom.toLowerCase();
}

/**
 * Update wallet token balance
 */
async function updateWalletBalance(
  walletAddress: string,
  tokenAddress: string,
  context: any
) {
  const balanceId = `${walletAddress}-${tokenAddress}`;
  
  // TODO: Query actual balance from contract
  // For now, just track that wallet has this token
  
  const balance: WalletTokenBalance = {
    id: balanceId,
    walletAddress,
    tokenAddress,
    balance: 0n,  // Would need to query contract
    estimatedValueUSD: undefined,
    isDust: false,
    lastUpdatedBlock: 0n,
    lastUpdatedTimestamp: BigInt(Date.now()),
  };

  context.WalletTokenBalance.set(balance);
}
```

---

## Part 5: Running the Indexer

### 5.1 Local Development

```bash
# Start local indexer with Hasura
cd backend
pnpm dev
```

This will:
1. Start Docker containers (PostgreSQL + Hasura)
2. Run indexer
3. Open Hasura console at `http://localhost:8080`

**Hasura Admin Password**: `testing`

### 5.2 Query Your Data

Access Hasura console and try GraphQL queries:

```graphql
# Get all risky approvals
query GetRiskyApprovals {
  TokenApproval(
    where: { 
      isRisky: { _eq: true },
      status: { _eq: "ACTIVE" }
    }
    order_by: { blockTimestamp: desc }
  ) {
    id
    owner
    spender
    tokenAddress
    amount
    blockTimestamp
  }
}

# Get wallet health score
query GetWalletHealth($wallet: String!) {
  WalletHealth(where: { walletAddress: { _eq: $wallet } }) {
    walletAddress
    healthScore
    activeApprovalsCount
    riskyApprovalsCount
    spamTokensCount
    dustTokensCount
  }
}

# Get recent transfers to wallet
query GetRecentTransfers($wallet: String!) {
  TokenTransfer(
    where: { to: { _eq: $wallet } }
    order_by: { blockTimestamp: desc }
    limit: 10
  ) {
    from
    to
    tokenAddress
    amount
    isPotentialSpam
    blockTimestamp
  }
}
```

### 5.3 Stop the Indexer

```bash
pnpm envio stop
```

This shuts down and removes Docker containers.

---

## Part 6: Deploying to Hosted Service

### 6.1 Sign Up for Envio Hosted Service

1. Visit [https://envio.dev](https://envio.dev)
2. Create account
3. Get API key

### 6.2 Deploy Your Indexer

```bash
# Build for production
pnpm envio build

# Deploy to hosted service
pnpm envio deploy
```

You'll receive a GraphQL endpoint URL:
```
https://indexer.envio.dev/your-indexer-id/v1/graphql
```

### 6.3 Configure Backend to Use Hosted Endpoint

```typescript
// backend/src/services/envio.ts
import { GraphQLClient } from 'graphql-request';

const ENVIO_ENDPOINT = process.env.ENVIO_GRAPHQL_ENDPOINT!;

export const envioClient = new GraphQLClient(ENVIO_ENDPOINT, {
  headers: {
    // Add auth if needed
  },
});

/**
 * Get risky approvals for a wallet
 */
export async function getRiskyApprovals(walletAddress: string) {
  const query = `
    query GetRiskyApprovals($wallet: String!) {
      TokenApproval(
        where: { 
          owner: { _eq: $wallet },
          isRisky: { _eq: true },
          status: { _eq: "ACTIVE" }
        }
      ) {
        id
        spender
        tokenAddress
        amount
        isUnlimited
      }
    }
  `;

  const data = await envioClient.request(query, { wallet: walletAddress });
  return data.TokenApproval;
}

/**
 * Get wallet health score
 */
export async function getWalletHealth(walletAddress: string) {
  const query = `
    query GetHealth($wallet: String!) {
      WalletHealth(where: { walletAddress: { _eq: $wallet } }) {
        healthScore
        activeApprovalsCount
        riskyApprovalsCount
      }
    }
  `;

  const data = await envioClient.request(query, { wallet: walletAddress });
  return data.WalletHealth[0];
}
```

---

## Part 7: Dynamic Contract Registration

For Wallet Autopilot, you'll need to dynamically add token contracts as users interact with them:

### 7.1 Handler for Dynamic Registration

```typescript
// backend/src/EventHandlers.ts

/**
 * Dynamically register new token contracts
 * Call this when discovering new tokens
 */
async function registerTokenContract(
  tokenAddress: string,
  startBlock: bigint,
  context: any
) {
  // This is a pseudo-code example
  // Actual implementation depends on Envio's dynamic contract API
  
  context.registerContract({
    name: "ERC20Token",
    address: tokenAddress,
    startBlock: Number(startBlock),
  });
}
```

---

## Part 8: Integration with Agent Service

### 8.1 Agent Monitoring Loop

```typescript
// backend/src/agent/monitor.ts
import { envioClient, getRiskyApprovals, getWalletHealth } from '../services/envio';

/**
 * Main monitoring loop for Wallet Autopilot agent
 */
export class WalletMonitor {
  private interval: NodeJS.Timeout | null = null;

  /**
   * Start monitoring wallets with active delegations
   */
  startMonitoring(walletAddresses: string[]) {
    this.interval = setInterval(async () => {
      for (const wallet of walletAddresses) {
        await this.checkWallet(wallet);
      }
    }, 60000); // Check every minute
  }

  /**
   * Check individual wallet for actions needed
   */
  private async checkWallet(walletAddress: string) {
    // Get wallet health from Envio
    const health = await getWalletHealth(walletAddress);
    
    if (!health) {
      console.log(`No health data for ${walletAddress}`);
      return;
    }

    console.log(`Wallet ${walletAddress} health score: ${health.healthScore}`);

    // Check for risky approvals to revoke
    if (health.riskyApprovalsCount > 0) {
      await this.handleRiskyApprovals(walletAddress);
    }

    // TODO: Check for spam tokens to cleanup
    // TODO: Check for dust tokens to consolidate
  }

  /**
   * Handle risky approvals
   */
  private async handleRiskyApprovals(walletAddress: string) {
    const riskyApprovals = await getRiskyApprovals(walletAddress);
    
    for (const approval of riskyApprovals) {
      console.log(`Found risky approval: ${approval.id}`);
      
      // TODO: Execute revoke via delegation
      // await executeRevokeApproval(...)
    }
  }

  stopMonitoring() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
```

### 8.2 Webhook Integration (Alternative)

Instead of polling, use webhooks for real-time notifications:

```typescript
// backend/src/webhooks/envio.ts
import express from 'express';

const app = express();
app.use(express.json());

/**
 * Receive webhook from Envio when new risky approval detected
 */
app.post('/webhooks/envio/risky-approval', async (req, res) => {
  const { walletAddress, approval } = req.body;
  
  console.log(`Webhook: Risky approval detected for ${walletAddress}`);
  
  // Trigger agent action immediately
  // await executeRevokeApproval(walletAddress, approval);
  
  res.json({ success: true });
});

app.listen(3001, () => {
  console.log('Webhook server listening on port 3001');
});
```

---

## Part 9: Advanced Features

### 9.1 Multi-Chain Indexing

If you want to support multiple chains (e.g., for cross-chain dust consolidation):

```yaml
# config.yaml
networks:
  - id: 41454  # Monad Testnet
    name: monad-testnet
    start_block: 0
    contracts:
      - name: ERC20Token
        address: ["0x..."]
  
  - id: 1  # Ethereum Mainnet (for stablecoin consolidation)
    name: ethereum-mainnet
    start_block: 18000000
    contracts:
      - name: ERC20Token
        address: ["0xUSDC..."]
```

### 9.2 Real-Time Subscriptions

Use Hasura subscriptions for real-time updates:

```typescript
// frontend/lib/subscriptions.ts
import { createClient } from 'graphql-ws';

const wsClient = createClient({
  url: 'wss://indexer.envio.dev/your-id/v1/graphql',
});

/**
 * Subscribe to wallet health changes
 */
export function subscribeToWalletHealth(
  walletAddress: string,
  onUpdate: (health: any) => void
) {
  const subscription = `
    subscription WalletHealthUpdates($wallet: String!) {
      WalletHealth(where: { walletAddress: { _eq: $wallet } }) {
        healthScore
        activeApprovalsCount
        riskyApprovalsCount
      }
    }
  `;

  wsClient.subscribe(
    {
      query: subscription,
      variables: { wallet: walletAddress },
    },
    {
      next: (data) => onUpdate(data.data.WalletHealth[0]),
      error: (err) => console.error(err),
      complete: () => console.log('Subscription complete'),
    }
  );
}
```

---

## Part 10: Testing

### 10.1 Unit Tests for Event Handlers

```typescript
// backend/tests/handlers.test.ts
import { describe, it, expect } from 'vitest';

describe('Approval Event Handler', () => {
  it('should mark unlimited approvals as risky', async () => {
    const mockEvent = {
      params: {
        owner: '0xUser',
        spender: '0xSpender',
        value: BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
      },
      srcAddress: '0xToken',
      block: { number: 1000, timestamp: 1234567890 },
      transaction: { hash: '0xHash' },
      logIndex: 0,
    };

    // Test handler logic
    // ...
  });
});
```

### 10.2 Integration Tests

```bash
# Start local indexer
pnpm dev

# Run integration tests
pnpm test:integration
```

---

## Best Practices

### Performance
1. **Use `preload_handlers: true`** - Faster processing
2. **Selective Field Selection** - Only fetch needed fields
3. **Efficient Queries** - Use indexes, pagination
4. **Batch Updates** - Update multiple entities together

### Data Quality
1. **Validate Events** - Check event data before processing
2. **Handle Reorgs** - Keep `rollback_on_reorg: true`
3. **Idempotent Handlers** - Handlers should be replayable
4. **Error Logging** - Log all errors for debugging

### Security
1. **Validate Addresses** - Always lowercase and validate
2. **Rate Limiting** - Protect API endpoints
3. **Access Control** - Secure Hasura endpoints
4. **Data Privacy** - Don't index sensitive data

---

## Troubleshooting

### Indexer Not Starting / Stuck at "No new blocks detected"

**Problem:** Indexer shows `currentBlockHeight: 0` or stuck with checkpoints at `-1`

**Solutions:**
1. **Wrong Chain ID** - Must use `10143` for Monad Testnet (NOT 41454)
2. **Wrong URL** - Use HyperSync URL: `https://monad-testnet.hypersync.xyz`
3. **Cached state** - Reset database:
   ```bash
   docker-compose -f generated/docker-compose.yaml down -v
   docker-compose -f generated/docker-compose.yaml up -d
   pnpm envio start
   ```

### Event Handler Errors: "Cannot read properties of undefined"

**Problem:** `TypeError: Cannot read properties of undefined (reading 'hash')`

**Solution:** Use correct event object structure with nested fields:
```javascript
// ❌ Wrong
const txHash = event.transactionHash;
const blockNum = event.blockNumber;

// ✅ Correct
const txHash = event.transaction.hash;
const blockNum = event.block.number;
const blockTime = event.block.timestamp;
```

### Event Handler Errors: "Cannot convert undefined to a BigInt"

**Problem:** Trying to convert undefined value to BigInt

**Solution:** Always access nested block/transaction fields:
```javascript
// ❌ Wrong
blockTimestamp: BigInt(event.timestamp)

// ✅ Correct
blockTimestamp: BigInt(event.block.timestamp)
```

### Docker Compose Errors

**Problem:** `unknown shorthand flag: 'd' in -d` or containers not starting

**Solutions:**
1. Ensure Docker is running: `docker ps`
2. Use correct command: `docker-compose -f generated/docker-compose.yaml up -d`
3. If using Docker Compose v2: `docker compose up -d`

### Events Not Indexing
- Verify contract address is correct and deployed on Monad Testnet
- Check `start_block` is before contract deployment
- Ensure event signatures match ABI exactly
- Verify tokens have activity (Approval/Transfer events)

### Slow Indexing
- Use HyperSync instead of RPC: `hypersync_config` instead of `rpc_config`
- Enable `preload_handlers: true` in config
- Use `address_format: lowercase` for better performance

### Config.yaml Errors

**Problem:** `unknown field 'field_selection'`

**Solution:** Remove `field_selection` - it's not supported in current Envio version. Block and transaction fields are automatically included.

---

## Resources

- [Envio Documentation](https://docs.envio.dev)
- [HyperIndex GitHub](https://github.com/enviodev/hyperindex)
- [Hasura Documentation](https://hasura.io/docs)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)

---

## Summary

This Envio integration guide provides:
- ✅ Indexer initialization and configuration
- ✅ Schema definition for wallet health data
- ✅ Event handlers for approvals and transfers
- ✅ Local development and deployment
- ✅ Integration with agent service
- ✅ Real-time monitoring and webhooks
- ✅ Testing and best practices

Use this as your reference for building the Envio indexing layer of Wallet Autopilot!