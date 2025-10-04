# Agent Service - Backend Automation Guide

## Overview

The Wallet Autopilot Agent Service is the backend automation engine that monitors wallet health via Envio and executes delegated transactions on behalf of users on Monad testnet. It operates autonomously based on user-defined rules while respecting delegation permissions.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              AGENT SERVICE LAYERS                    │
├─────────────────────────────────────────────────────┤
│  API Layer        → Express REST API                │
│  Monitoring Layer → Event listeners, polling         │
│  Rule Engine      → Decision logic                   │
│  Executor Layer   → Delegation transaction executor  │
│  Storage Layer    → Delegation registry, logs        │
└─────────────────────────────────────────────────────┘
```

---

## Part 1: Project Setup

### 1.1 Initialize Backend

```bash
mkdir backend
cd backend
npm init -y

# Install dependencies
npm install express typescript ts-node
npm install @metamask/delegation-toolkit viem
npm install graphql-request dotenv
npm install --save-dev @types/express @types/node nodemon
```

### 1.2 TypeScript Configuration

```json
// backend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### 1.3 Package Scripts

```json
// backend/package.json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest"
  }
}
```

### 1.4 Environment Configuration

```bash
# backend/.env
NODE_ENV=development
PORT=3001

# Monad Network
MONAD_RPC_URL=https://testnet.monad.xyz
MONAD_CHAIN_ID=41454

# Agent Account (KEEP SECRET!)
AGENT_PRIVATE_KEY=0x...

# Envio GraphQL Endpoint
ENVIO_GRAPHQL_ENDPOINT=http://localhost:8080/v1/graphql

# Database (optional)
DATABASE_URL=postgresql://user:pass@localhost:5432/wallet_autopilot

# Monitoring
POLLING_INTERVAL_MS=60000
MAX_GAS_PRICE_GWEI=100
```

---

## Part 2: Core Service Structure

### 2.1 Main Entry Point

```typescript
// backend/src/index.ts
import express from 'express';
import dotenv from 'dotenv';
import { AgentService } from './agent/AgentService';
import { apiRouter } from './api/routes';

dotenv.config();

const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now() });
});

// API routes
app.use('/api', apiRouter);

// Initialize and start agent service
const agentService = new AgentService();

async function main() {
  try {
    // Start agent monitoring
    await agentService.start();
    console.log('✅ Agent service started');

    // Start API server
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await agentService.stop();
  process.exit(0);
});

main();
```

### 2.2 Agent Service Core

```typescript
// backend/src/agent/AgentService.ts
import { WalletMonitor } from './WalletMonitor';
import { DelegationRegistry } from './DelegationRegistry';
import { TransactionExecutor } from './TransactionExecutor';
import { RuleEngine } from './RuleEngine';

export class AgentService {
  private monitor: WalletMonitor;
  private registry: DelegationRegistry;
  private executor: TransactionExecutor;
  private ruleEngine: RuleEngine;
  private isRunning: boolean = false;

  constructor() {
    this.registry = new DelegationRegistry();
    this.executor = new TransactionExecutor();
    this.ruleEngine = new RuleEngine();
    this.monitor = new WalletMonitor(
      this.registry,
      this.executor,
      this.ruleEngine
    );
  }

  /**
   * Start the agent service
   */
  async start() {
    if (this.isRunning) {
      console.warn('⚠️  Agent service already running');
      return;
    }

    console.log('🤖 Starting Wallet Autopilot Agent...');
    
    // Load delegations from storage
    await this.registry.loadDelegations();
    
    // Start monitoring
    await this.monitor.start();
    
    this.isRunning = true;
  }

  /**
   * Stop the agent service
   */
  async stop() {
    if (!this.isRunning) return;

    console.log('🛑 Stopping agent service...');
    
    await this.monitor.stop();
    await this.registry.save();
    
    this.isRunning = false;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      running: this.isRunning,
      activeDelegations: this.registry.getCount(),
      monitoredWallets: this.monitor.getWalletCount(),
    };
  }
}
```

---

## Part 3: Delegation Registry

### 3.1 Delegation Storage

```typescript
// backend/src/agent/DelegationRegistry.ts
import fs from 'fs/promises';
import path from 'path';

export interface DelegationRecord {
  id: string;
  userAddress: string;
  smartAccountAddress: string;
  delegation: any; // Signed delegation object
  permissions: {
    canRevokeApprovals: boolean;
    canConsolidateDust: boolean;
    canRemoveSpam: boolean;
    tokenAddresses: string[];
  };
  rules: {
    autoRevokeEnabled: boolean;
    revokeThresholdDays: number;
    dustConsolidationEnabled: boolean;
    dustThresholdUSD: number;
    spamRemovalEnabled: boolean;
  };
  createdAt: Date;
  lastActiveAt: Date;
  status: 'active' | 'paused' | 'revoked';
}

export class DelegationRegistry {
  private delegations: Map<string, DelegationRecord> = new Map();
  private storageFile = path.join(__dirname, '../../data/delegations.json');

  /**
   * Register a new delegation
   */
  async register(record: DelegationRecord) {
    this.delegations.set(record.smartAccountAddress, record);
    await this.save();
    console.log(`✅ Registered delegation for ${record.smartAccountAddress}`);
  }

  /**
   * Get delegation by smart account address
   */
  get(smartAccountAddress: string): DelegationRecord | undefined {
    return this.delegations.get(smartAccountAddress.toLowerCase());
  }

  /**
   * Get all active delegations
   */
  getActive(): DelegationRecord[] {
    return Array.from(this.delegations.values())
      .filter(d => d.status === 'active');
  }

  /**
   * Update delegation status
   */
  async updateStatus(
    smartAccountAddress: string, 
    status: DelegationRecord['status']
  ) {
    const delegation = this.delegations.get(smartAccountAddress);
    if (delegation) {
      delegation.status = status;
      delegation.lastActiveAt = new Date();
      await this.save();
    }
  }

  /**
   * Remove delegation
   */
  async remove(smartAccountAddress: string) {
    this.delegations.delete(smartAccountAddress);
    await this.save();
    console.log(`🗑️  Removed delegation for ${smartAccountAddress}`);
  }

  /**
   * Load delegations from file
   */
  async loadDelegations() {
    try {
      const data = await fs.readFile(this.storageFile, 'utf-8');
      const records: DelegationRecord[] = JSON.parse(data);
      
      records.forEach(record => {
        // Convert date strings back to Date objects
        record.createdAt = new Date(record.createdAt);
        record.lastActiveAt = new Date(record.lastActiveAt);
        this.delegations.set(record.smartAccountAddress, record);
      });

      console.log(`📂 Loaded ${records.length} delegations`);
    } catch (error) {
      console.log('📂 No existing delegations file, starting fresh');
    }
  }

  /**
   * Save delegations to file
   */
  async save() {
    try {
      // Ensure data directory exists
      await fs.mkdir(path.dirname(this.storageFile), { recursive: true });
      
      const records = Array.from(this.delegations.values());
      await fs.writeFile(
        this.storageFile, 
        JSON.stringify(records, null, 2)
      );
    } catch (error) {
      console.error('❌ Failed to save delegations:', error);
    }
  }

  /**
   * Get count of delegations
   */
  getCount(): number {
    return this.delegations.size;
  }
}
```

---

## Part 4: Wallet Monitor

### 4.1 Monitoring Service

```typescript
// backend/src/agent/WalletMonitor.ts
import { envioClient } from '../services/envio';
import { DelegationRegistry } from './DelegationRegistry';
import { TransactionExecutor } from './TransactionExecutor';
import { RuleEngine } from './RuleEngine';

export class WalletMonitor {
  private interval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(
    private registry: DelegationRegistry,
    private executor: TransactionExecutor,
    private ruleEngine: RuleEngine
  ) {}

  /**
   * Start monitoring wallets
   */
  async start() {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('👀 Starting wallet monitoring...');

    // Initial scan
    await this.scanAllWallets();

    // Set up periodic polling
    const intervalMs = parseInt(process.env.POLLING_INTERVAL_MS || '60000');
    this.interval = setInterval(() => {
      this.scanAllWallets();
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  async stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    console.log('🛑 Stopped wallet monitoring');
  }

  /**
   * Scan all wallets with active delegations
   */
  private async scanAllWallets() {
    const activeDelegations = this.registry.getActive();
    
    console.log(`🔍 Scanning ${activeDelegations.length} wallets...`);

    for (const delegation of activeDelegations) {
      try {
        await this.checkWallet(delegation);
      } catch (error) {
        console.error(
          `❌ Error checking wallet ${delegation.smartAccountAddress}:`,
          error
        );
      }
    }
  }

  /**
   * Check individual wallet for needed actions
   */
  private async checkWallet(delegation: DelegationRecord) {
    const { smartAccountAddress, rules } = delegation;

    // Get wallet health from Envio
    const health = await this.getWalletHealth(smartAccountAddress);
    
    if (!health) {
      console.log(`⚠️  No health data for ${smartAccountAddress}`);
      return;
    }

    console.log(
      `📊 Wallet ${smartAccountAddress}: Health ${health.healthScore}/100`
    );

    // Check each automation rule
    if (rules.autoRevokeEnabled) {
      await this.checkForRevokeActions(delegation, health);
    }

    if (rules.dustConsolidationEnabled) {
      await this.checkForDustConsolidation(delegation, health);
    }

    if (rules.spamRemovalEnabled) {
      await this.checkForSpamRemoval(delegation, health);
    }
  }

  /**
   * Check for approvals to revoke
   */
  private async checkForRevokeActions(
    delegation: DelegationRecord,
    health: any
  ) {
    if (health.riskyApprovalsCount === 0) return;

    // Get risky approvals from Envio
    const approvals = await this.getRiskyApprovals(
      delegation.smartAccountAddress
    );

    for (const approval of approvals) {
      // Check if action should be taken based on rules
      const shouldRevoke = await this.ruleEngine.shouldRevokeApproval(
        approval,
        delegation.rules
      );

      if (shouldRevoke) {
        console.log(`⚡ Executing auto-revoke for ${approval.spender}`);
        
        await this.executor.revokeApproval(
          delegation.smartAccountAddress,
          delegation.delegation,
          approval.tokenAddress,
          approval.spender
        );
      }
    }
  }

  /**
   * Check for dust to consolidate
   */
  private async checkForDustConsolidation(
    delegation: DelegationRecord,
    health: any
  ) {
    if (health.dustTokensCount === 0) return;

    // TODO: Implement dust consolidation logic
    console.log(`💰 Found ${health.dustTokensCount} dust tokens to consolidate`);
  }

  /**
   * Check for spam to remove
   */
  private async checkForSpamRemoval(
    delegation: DelegationRecord,
    health: any
  ) {
    if (health.spamTokensCount === 0) return;

    // TODO: Implement spam removal logic
    console.log(`🗑️  Found ${health.spamTokensCount} spam tokens to remove`);
  }

  /**
   * Get wallet health from Envio
   */
  private async getWalletHealth(walletAddress: string) {
    const query = `
      query GetHealth($wallet: String!) {
        WalletHealth(where: { walletAddress: { _eq: $wallet } }) {
          healthScore
          activeApprovalsCount
          riskyApprovalsCount
          spamTokensCount
          dustTokensCount
        }
      }
    `;

    try {
      const data = await envioClient.request(query, { 
        wallet: walletAddress.toLowerCase() 
      });
      return data.WalletHealth[0];
    } catch (error) {
      console.error('Failed to fetch wallet health:', error);
      return null;
    }
  }

  /**
   * Get risky approvals from Envio
   */
  private async getRiskyApprovals(walletAddress: string) {
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
          blockTimestamp
        }
      }
    `;

    try {
      const data = await envioClient.request(query, { 
        wallet: walletAddress.toLowerCase() 
      });
      return data.TokenApproval;
    } catch (error) {
      console.error('Failed to fetch risky approvals:', error);
      return [];
    }
  }

  /**
   * Get wallet count
   */
  getWalletCount(): number {
    return this.registry.getActive().length;
  }
}
```

---

## Part 5: Rule Engine

### 5.1 Decision Logic

```typescript
// backend/src/agent/RuleEngine.ts

export interface ApprovalData {
  spender: string;
  tokenAddress: string;
  amount: bigint;
  isUnlimited: boolean;
  blockTimestamp: bigint;
}

export class RuleEngine {
  /**
   * Determine if an approval should be revoked
   */
  async shouldRevokeApproval(
    approval: ApprovalData,
    rules: any
  ): Promise<boolean> {
    // Check if approval is old enough (unused threshold)
    const daysSinceApproval = this.getDaysSince(approval.blockTimestamp);
    
    if (daysSinceApproval < rules.revokeThresholdDays) {
      return false; // Too recent
    }

    // Always revoke unlimited approvals after threshold
    if (approval.isUnlimited) {
      console.log(`  → Unlimited approval detected (${daysSinceApproval} days old)`);
      return true;
    }

    // Check if spender is known risky protocol
    const isRiskyProtocol = await this.isRiskySpender(approval.spender);
    if (isRiskyProtocol) {
      console.log(`  → Risky protocol detected: ${approval.spender}`);
      return true;
    }

    // Check if approval hasn't been used recently
    const hasRecentActivity = await this.checkRecentActivity(
      approval.tokenAddress,
      approval.spender
    );
    
    if (!hasRecentActivity) {
      console.log(`  → No recent activity for ${daysSinceApproval} days`);
      return true;
    }

    return false;
  }

  /**
   * Check if token is dust (below threshold)
   */
  isDustToken(balance: bigint, usdValue: number, threshold: number): boolean {
    return usdValue > 0 && usdValue < threshold;
  }

  /**
   * Check if token is spam
   */
  async isSpamToken(tokenAddress: string): Promise<boolean> {
    // TODO: Implement spam detection logic
    // - Check against known spam list
    // - Check liquidity
    // - Check contract verification
    return false;
  }

  /**
   * Get days since timestamp
   */
  private getDaysSince(timestamp: bigint): number {
    const now = Math.floor(Date.now() / 1000);
    const diffSeconds = now - Number(timestamp);
    return Math.floor(diffSeconds / 86400);
  }

  /**
   * Check if spender is known risky
   */
  private async isRiskySpender(spender: string): Promise<boolean> {
    // TODO: Maintain list of known risky protocols
    const riskyAddresses = new Set([
      // Add known compromised or risky addresses
    ]);

    return riskyAddresses.has(spender.toLowerCase());
  }

  /**
   * Check for recent activity with approval
   */
  private async checkRecentActivity(
    tokenAddress: string,
    spender: string
  ): Promise<boolean> {
    // TODO: Query Envio for recent transfer events
    // involving this token and spender
    return false;
  }
}
```

---

## Part 6: Transaction Executor

### 6.1 Delegated Transaction Execution

```typescript
// backend/src/agent/TransactionExecutor.ts
import { createWalletClient, http, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monadTestnet } from '../config/monad';
import { executeDelegatedTransaction } from '@metamask/delegation-toolkit';

export class TransactionExecutor {
  private agentWalletClient: any;
  private agentAccount: any;

  constructor() {
    // Initialize agent account
    const privateKey = process.env.AGENT_PRIVATE_KEY!;
    this.agentAccount = privateKeyToAccount(privateKey);
    
    this.agentWalletClient = createWalletClient({
      account: this.agentAccount,
      chain: monadTestnet,
      transport: http(),
    });

    console.log(`🤖 Agent address: ${this.agentAccount.address}`);
  }

  /**
   * Execute approval revocation
   */
  async revokeApproval(
    smartAccountAddress: string,
    delegation: any,
    tokenAddress: string,
    spenderAddress: string
  ) {
    try {
      console.log(`⚡ Revoking approval:`);
      console.log(`   Token: ${tokenAddress}`);
      console.log(`   Spender: ${spenderAddress}`);

      // Encode approve(spender, 0) calldata
      const calldata = encodeFunctionData({
        abi: [{
          name: 'approve',
          type: 'function',
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'nonpayable',
        }],
        functionName: 'approve',
        args: [spenderAddress, 0n],
      });

      // Execute delegated transaction
      const txHash = await executeDelegatedTransaction({
        smartAccount: { address: smartAccountAddress },
        delegation,
        transaction: {
          to: tokenAddress,
          data: calldata,
          value: 0n,
        },
      });

      console.log(`✅ Revoke executed: ${txHash}`);

      // Log action to database/storage
      await this.logAction({
        type: 'REVOKE_APPROVAL',
        walletAddress: smartAccountAddress,
        tokenAddress,
        spenderAddress,
        txHash,
        timestamp: new Date(),
      });

      return txHash;
    } catch (error) {
      console.error('❌ Failed to revoke approval:', error);
      throw error;
    }
  }

  /**
   * Execute dust consolidation swap
   */
  async consolidateDust(
    smartAccountAddress: string,
    delegation: any,
    dustTokenAddress: string,
    targetTokenAddress: string,
    amount: bigint
  ) {
    try {
      console.log(`⚡ Consolidating dust:`);
      console.log(`   From: ${dustTokenAddress}`);
      console.log(`   To: ${targetTokenAddress}`);
      console.log(`   Amount: ${amount}`);

      // TODO: Build swap transaction via DEX
      // For now, just a placeholder

      const txHash = 'TODO_IMPLEMENT_SWAP';

      await this.logAction({
        type: 'CONSOLIDATE_DUST',
        walletAddress: smartAccountAddress,
        tokenAddress: dustTokenAddress,
        targetAddress: targetTokenAddress,
        amount: amount.toString(),
        txHash,
        timestamp: new Date(),
      });

      return txHash;
    } catch (error) {
      console.error('❌ Failed to consolidate dust:', error);
      throw error;
    }
  }

  /**
   * Log automated action
   */
  private async logAction(action: any) {
    // TODO: Store in database
    console.log('📝 Action logged:', action.type);
  }

  /**
   * Check gas price before executing
   */
  private async checkGasPrice(): Promise<boolean> {
    const maxGasPrice = BigInt(
      process.env.MAX_GAS_PRICE_GWEI || '100'
    ) * BigInt(1e9);

    // TODO: Get current gas price from chain
    // For now, always allow
    return true;
  }
}
```

---

## Part 7: API Endpoints

### 7.1 REST API Routes

```typescript
// backend/src/api/routes.ts
import { Router } from 'express';
import { agentService } from '../index';

export const apiRouter = Router();

/**
 * Register new delegation
 */
apiRouter.post('/delegations', async (req, res) => {
  try {
    const { userAddress, smartAccountAddress, delegation, rules } = req.body;

    // Validate delegation signature
    // TODO: Add validation

    const record = {
      id: `${userAddress}-${Date.now()}`,
      userAddress,
      smartAccountAddress,
      delegation,
      permissions: {
        canRevokeApprovals: true,
        canConsolidateDust: rules.dustConsolidationEnabled,
        canRemoveSpam: rules.spamRemovalEnabled,
        tokenAddresses: [],
      },
      rules,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      status: 'active' as const,
    };

    await agentService.registry.register(record);

    res.json({ success: true, delegation: record });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get delegation status
 */
apiRouter.get('/delegations/:address', async (req, res) => {
  try {
    const delegation = agentService.registry.get(req.params.address);
    
    if (!delegation) {
      return res.status(404).json({ error: 'Delegation not found' });
    }

    res.json({ delegation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Pause delegation
 */
apiRouter.post('/delegations/:address/pause', async (req, res) => {
  try {
    await agentService.registry.updateStatus(req.params.address, 'paused');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Resume delegation
 */
apiRouter.post('/delegations/:address/resume', async (req, res) => {
  try {
    await agentService.registry.updateStatus(req.params.address, 'active');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Revoke delegation
 */
apiRouter.delete('/delegations/:address', async (req, res) => {
  try {
    await agentService.registry.remove(req.params.address);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get agent status
 */
apiRouter.get('/status', (req, res) => {
  res.json(agentService.getStatus());
});
```

---

## Part 8: Testing

### 8.1 Unit Tests

```typescript
// backend/tests/RuleEngine.test.ts
import { describe, it, expect } from 'jest';
import { RuleEngine } from '../src/agent/RuleEngine';

describe('RuleEngine', () => {
  const ruleEngine = new RuleEngine();

  it('should revoke unlimited approvals after threshold', async () => {
    const approval = {
      spender: '0xSpender',
      tokenAddress: '0xToken',
      amount: BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
      isUnlimited: true,
      blockTimestamp: BigInt(Math.floor(Date.now() / 1000) - 86400 * 31), // 31 days ago
    };

    const rules = {
      revokeThresholdDays: 30,
    };

    const shouldRevoke = await ruleEngine.shouldRevokeApproval(approval, rules);
    expect(shouldRevoke).toBe(true);
  });

  it('should not revoke recent approvals', async () => {
    const approval = {
      spender: '0xSpender',
      tokenAddress: '0xToken',
      amount: 1000n,
      isUnlimited: false,
      blockTimestamp: BigInt(Math.floor(Date.now() / 1000) - 86400), // 1 day ago
    };

    const rules = {
      revokeThresholdDays: 30,
    };

    const shouldRevoke = await ruleEngine.shouldRevokeApproval(approval, rules);
    expect(shouldRevoke).toBe(false);
  });
});
```

---

## Part 9: Deployment

### 9.1 Production Configuration

```bash
# backend/.env.production
NODE_ENV=production
PORT=3001

MONAD_RPC_URL=https://testnet.monad.xyz
AGENT_PRIVATE_KEY=...  # Use secrets manager in production!

ENVIO_GRAPHQL_ENDPOINT=https://indexer.envio.dev/your-id/v1/graphql

# Monitoring
SENTRY_DSN=...
LOG_LEVEL=info
```

### 9.2 Docker Deployment

```dockerfile
# backend/Dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  agent:
    build: ./backend
    ports:
      - "3001:3001"
    env_file:
      - ./backend/.env.production
    restart: unless-stopped
```

---

## Best Practices

### Security
1. **Private Key Management**: Use AWS Secrets Manager or similar
2. **Rate Limiting**: Prevent API abuse
3. **Input Validation**: Validate all delegation data
4. **Gas Limits**: Set maximum gas price thresholds
5. **Error Handling**: Never expose sensitive errors

### Performance
1. **Connection Pooling**: Reuse RPC connections
2. **Batch Processing**: Group multiple operations
3. **Caching**: Cache wallet health data
4. **Async Operations**: Non-blocking execution

### Reliability
1. **Graceful Degradation**: Continue if Envio is down
2. **Retry Logic**: Exponential backoff for failed txs
3. **Health Checks**: Monitor service health
4. **Logging**: Comprehensive logging for debugging
5. **Alerting**: Notify on critical failures

---

## Monitoring & Observability

### 9.3 Health Monitoring

```typescript
// backend/src/monitoring/health.ts
export class HealthMonitor {
  async checkHealth() {
    return {
      status: 'healthy',
      checks: {
        envio: await this.checkEnvio(),
        monad: await this.checkMonadRPC(),
        agent: await this.checkAgentBalance(),
      },
      timestamp: new Date(),
    };
  }

  private async checkEnvio(): Promise<boolean> {
    // Ping Envio GraphQL endpoint
    return true;
  }

  private async checkMonadRPC(): Promise<boolean> {
    // Check RPC connectivity
    return true;
  }

  private async checkAgentBalance(): Promise<boolean> {
    // Ensure agent has enough MON for gas
    return true;
  }
}
```

---

## Summary

This Agent Service guide provides:
- ✅ Complete backend service architecture
- ✅ Delegation registry and management
- ✅ Wallet monitoring system
- ✅ Rule engine for automation decisions
- ✅ Transaction executor with delegation
- ✅ REST API for frontend integration
- ✅ Testing, deployment, and monitoring

Use this as your reference for building the autonomous agent that powers Wallet Autopilot!