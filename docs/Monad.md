# Monad Testnet Integration Guide

## Overview

Monad is a high-performance EVM-compatible Layer 1 blockchain. This guide covers everything you need to integrate your Wallet Autopilot with Monad testnet, including network setup, faucet usage, contract deployment, and best practices.

## Network Information

### Monad Testnet Details

```typescript
// Network Configuration
export const monadTestnet = {
  id: 41454,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: {
    default: { 
      http: ['https://testnet.monad.xyz'],
      webSocket: ['wss://testnet.monad.xyz']
    },
    public: { 
      http: ['https://testnet.monad.xyz'] 
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://explorer.testnet.monad.xyz',
      apiUrl: 'https://explorer.testnet.monad.xyz/api',
    },
  },
  testnet: true,
};
```

### Key Endpoints

| Service | URL | Purpose |
|---------|-----|---------|
| RPC HTTP | `https://testnet.monad.xyz` | Transaction submission & queries |
| RPC WebSocket | `wss://testnet.monad.xyz` | Real-time event subscriptions |
| Block Explorer | `https://explorer.testnet.monad.xyz` | Transaction & contract verification |
| Faucet | TBD | Get testnet MON tokens |

---

## Part 1: Getting Testnet Tokens

### 1.1 Using the Faucet

```bash
# Method 1: Web Interface
# Visit the Monad faucet website
# Connect your wallet
# Request tokens (usually 1-10 MON per request)

# Method 2: CLI (if available)
curl -X POST https://faucet.testnet.monad.xyz/api/claim \
  -H "Content-Type: application/json" \
  -d '{"address": "0xYourWalletAddress"}'
```

### 1.2 Checking Your Balance

```typescript
// Using Viem
import { createPublicClient, http, formatEther } from 'viem';
import { monadTestnet } from './config';

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

async function checkBalance(address: string) {
  const balance = await publicClient.getBalance({ 
    address: address as `0x${string}` 
  });
  
  console.log(`Balance: ${formatEther(balance)} MON`);
  return balance;
}
```

### 1.3 Funding Multiple Accounts

For Wallet Autopilot, you'll need MON in multiple accounts:

```typescript
// Accounts that need funding
const accounts = {
  user: '0xUserAddress',           // User's EOA
  smartAccount: '0xSmartAccount',  // User's smart account
  agent: '0xAgentAddress',         // Agent's account (for gas)
};

// Each needs:
// - User EOA: ~0.5 MON (for creating smart account)
// - Smart Account: ~1.0 MON (for delegated transactions)
// - Agent: ~5.0 MON (for executing many transactions)
```

---

## Part 2: Network Configuration

### 2.1 MetaMask Setup

**Manual Configuration**:

1. Open MetaMask
2. Click network dropdown → "Add Network"
3. Enter details:
   - **Network Name**: Monad Testnet
   - **RPC URL**: `https://testnet.monad.xyz`
   - **Chain ID**: `41454`
   - **Currency Symbol**: MON
   - **Block Explorer**: `https://explorer.testnet.monad.xyz`

**Programmatic Configuration** (for dApp):

```typescript
// lib/addMonadNetwork.ts
export async function addMonadToMetaMask() {
  if (!window.ethereum) {
    throw new Error('MetaMask not installed');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: '0xa1f6', // 41454 in hex
        chainName: 'Monad Testnet',
        nativeCurrency: {
          name: 'Monad',
          symbol: 'MON',
          decimals: 18,
        },
        rpcUrls: ['https://testnet.monad.xyz'],
        blockExplorerUrls: ['https://explorer.testnet.monad.xyz'],
      }],
    });
    
    console.log('✅ Monad Testnet added to MetaMask');
  } catch (error) {
    console.error('Failed to add Monad network:', error);
    throw error;
  }
}

// Auto-switch to Monad
export async function switchToMonad() {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0xa1f6' }],
    });
  } catch (error: any) {
    // Network not added yet, add it
    if (error.code === 4902) {
      await addMonadToMetaMask();
    } else {
      throw error;
    }
  }
}
```

### 2.2 Viem Configuration

```typescript
// config/monad.ts
import { defineChain } from 'viem';

export const monadTestnet = defineChain({
  id: 41454,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet.monad.xyz'] },
  },
  blockExplorers: {
    default: { 
      name: 'Monad Explorer', 
      url: 'https://explorer.testnet.monad.xyz' 
    },
  },
  testnet: true,
});

// Export configured clients
import { createPublicClient, createWalletClient, http, custom } from 'viem';

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

// For browser wallet (MetaMask)
export const walletClient = createWalletClient({
  chain: monadTestnet,
  transport: custom(window.ethereum),
});
```

### 2.3 Ethers.js Configuration (Alternative)

```typescript
// config/monad-ethers.ts
import { ethers } from 'ethers';

export const monadProvider = new ethers.JsonRpcProvider(
  'https://testnet.monad.xyz',
  {
    chainId: 41454,
    name: 'monad-testnet',
  }
);

// Connect with MetaMask
export async function getMonadSigner() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  
  // Switch to Monad
  await provider.send('wallet_switchEthereumChain', [
    { chainId: '0xa1f6' }
  ]);
  
  return provider.getSigner();
}
```

---

## Part 3: Smart Contract Deployment

### 3.1 Deploy with Hardhat

```typescript
// hardhat.config.ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    monadTestnet: {
      url: "https://testnet.monad.xyz",
      chainId: 41454,
      accounts: [process.env.PRIVATE_KEY!],
      gasPrice: 1000000000, // 1 Gwei
    },
  },
  etherscan: {
    apiKey: {
      monadTestnet: "your-api-key", // If explorer supports verification
    },
    customChains: [
      {
        network: "monadTestnet",
        chainId: 41454,
        urls: {
          apiURL: "https://explorer.testnet.monad.xyz/api",
          browserURL: "https://explorer.testnet.monad.xyz",
        },
      },
    ],
  },
};

export default config;
```

```bash
# Deploy contracts
npx hardhat run scripts/deploy.ts --network monadTestnet

# Verify contract (if supported)
npx hardhat verify --network monadTestnet DEPLOYED_ADDRESS
```

### 3.2 Deploy with Foundry

```bash
# foundry.toml
[profile.monad]
src = "src"
out = "out"
libs = ["lib"]
rpc_url = "https://testnet.monad.xyz"
chain_id = 41454

# Deploy
forge create src/MyContract.sol:MyContract \
  --rpc-url https://testnet.monad.xyz \
  --private-key $PRIVATE_KEY \
  --chain-id 41454
```

---

## Part 4: Transaction Management

### 4.1 Gas Configuration

Monad testnet gas settings:

```typescript
// lib/gasConfig.ts
export const GAS_SETTINGS = {
  // Base gas settings
  maxFeePerGas: 2_000_000_000n,        // 2 Gwei
  maxPriorityFeePerGas: 1_000_000_000n, // 1 Gwei
  
  // Gas limits by transaction type
  limits: {
    simpleTransfer: 21_000n,
    tokenApproval: 50_000n,
    tokenTransfer: 65_000n,
    smartAccountDeploy: 500_000n,
    delegatedTransaction: 150_000n,
  },
};

// Get current gas prices
export async function getCurrentGasPrices(client: any) {
  const gasPrice = await client.getGasPrice();
  
  return {
    gasPrice,
    maxFeePerGas: gasPrice * 120n / 100n, // 20% buffer
    maxPriorityFeePerGas: gasPrice * 110n / 100n, // 10% priority
  };
}

// Estimate gas for transaction
export async function estimateGas(
  client: any,
  transaction: any
) {
  const estimate = await client.estimateGas(transaction);
  return estimate * 120n / 100n; // Add 20% buffer
}
```

### 4.2 Transaction Submission

```typescript
// lib/transactions.ts
import { publicClient } from './monad';
import { GAS_SETTINGS } from './gasConfig';

export async function submitTransaction(
  walletClient: any,
  transaction: {
    to: string;
    data?: string;
    value?: bigint;
  }
) {
  try {
    // Estimate gas
    const gasEstimate = await publicClient.estimateGas({
      account: walletClient.account.address,
      ...transaction,
    });

    // Get current gas prices
    const gasPrice = await publicClient.getGasPrice();

    // Submit transaction
    const hash = await walletClient.sendTransaction({
      ...transaction,
      gas: gasEstimate * 120n / 100n,
      maxFeePerGas: gasPrice * 120n / 100n,
      maxPriorityFeePerGas: gasPrice * 110n / 100n,
    });

    console.log(`Transaction submitted: ${hash}`);

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

    return receipt;
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  }
}
```

### 4.3 Transaction Monitoring

```typescript
// lib/transactionMonitor.ts
export class TransactionMonitor {
  private pendingTxs: Map<string, any> = new Map();

  /**
   * Track a pending transaction
   */
  track(hash: string, metadata: any) {
    this.pendingTxs.set(hash, {
      ...metadata,
      submittedAt: Date.now(),
      status: 'pending',
    });
  }

  /**
   * Monitor transaction status
   */
  async monitor(hash: string) {
    const tx = this.pendingTxs.get(hash);
    if (!tx) return null;

    try {
      const receipt = await publicClient.getTransactionReceipt({ 
        hash: hash as `0x${string}` 
      });

      if (receipt) {
        tx.status = receipt.status === 'success' ? 'confirmed' : 'failed';
        tx.blockNumber = receipt.blockNumber;
        tx.gasUsed = receipt.gasUsed;
        tx.confirmedAt = Date.now();
      }

      return tx;
    } catch (error) {
      // Transaction still pending
      return tx;
    }
  }

  /**
   * Get all pending transactions
   */
  getPending() {
    return Array.from(this.pendingTxs.values())
      .filter(tx => tx.status === 'pending');
  }
}
```

---

## Part 5: Block Explorer Integration

### 5.1 Verify Contracts

```typescript
// scripts/verify.ts
export async function verifyContract(
  contractAddress: string,
  constructorArgs: any[]
) {
  const explorerUrl = 'https://explorer.testnet.monad.xyz/api';
  
  // Build verification payload
  const payload = {
    module: 'contract',
    action: 'verifysourcecode',
    contractaddress: contractAddress,
    sourceCode: '', // Flattened source code
    codeformat: 'solidity-single-file',
    contractname: 'MyContract',
    compilerversion: 'v0.8.20+commit.a1b79de',
    optimizationUsed: '1',
    runs: '200',
    constructorArguements: '', // ABI-encoded args
  };

  // Submit for verification
  // Implementation depends on explorer API
}
```

### 5.2 Fetch Transaction Details

```typescript
// lib/explorer.ts
export async function getTransactionFromExplorer(txHash: string) {
  const url = `https://explorer.testnet.monad.xyz/api?module=transaction&action=gettxinfo&txhash=${txHash}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  return data.result;
}

export async function getContractABI(contractAddress: string) {
  const url = `https://explorer.testnet.monad.xyz/api?module=contract&action=getabi&address=${contractAddress}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  return JSON.parse(data.result);
}
```

### 5.3 Generate Explorer Links

```typescript
// lib/explorerLinks.ts
const EXPLORER_BASE = 'https://explorer.testnet.monad.xyz';

export const explorerLinks = {
  tx: (hash: string) => `${EXPLORER_BASE}/tx/${hash}`,
  address: (address: string) => `${EXPLORER_BASE}/address/${address}`,
  block: (blockNumber: number) => `${EXPLORER_BASE}/block/${blockNumber}`,
  token: (tokenAddress: string) => `${EXPLORER_BASE}/token/${tokenAddress}`,
};

// Usage in UI
// <a href={explorerLinks.tx(txHash)} target="_blank">View on Explorer</a>
```

---

## Part 6: WebSocket Subscriptions

### 6.1 Real-Time Event Monitoring

```typescript
// lib/websocket.ts
import { createPublicClient, webSocket } from 'viem';
import { monadTestnet } from './monad';

const wsClient = createPublicClient({
  chain: monadTestnet,
  transport: webSocket('wss://testnet.monad.xyz'),
});

/**
 * Subscribe to new blocks
 */
export function subscribeToBlocks(
  callback: (block: any) => void
) {
  const unwatch = wsClient.watchBlocks({
    onBlock: callback,
  });

  return unwatch; // Call this to unsubscribe
}

/**
 * Subscribe to pending transactions
 */
export function subscribeToPendingTransactions(
  callback: (tx: any) => void
) {
  const unwatch = wsClient.watchPendingTransactions({
    onTransactions: callback,
  });

  return unwatch;
}

/**
 * Subscribe to contract events
 */
export function subscribeToContractEvents(
  contractAddress: string,
  eventAbi: any,
  callback: (logs: any[]) => void
) {
  const unwatch = wsClient.watchContractEvent({
    address: contractAddress as `0x${string}`,
    abi: [eventAbi],
    onLogs: callback,
  });

  return unwatch;
}
```

### 6.2 Watch for Specific Events

```typescript
// Example: Watch for ERC20 Approval events
export function watchApprovals(
  tokenAddress: string,
  ownerAddress: string,
  onApproval: (approval: any) => void
) {
  return wsClient.watchContractEvent({
    address: tokenAddress as `0x${string}`,
    abi: [{
      type: 'event',
      name: 'Approval',
      inputs: [
        { name: 'owner', type: 'address', indexed: true },
        { name: 'spender', type: 'address', indexed: true },
        { name: 'value', type: 'uint256', indexed: false },
      ],
    }],
    eventName: 'Approval',
    args: {
      owner: ownerAddress as `0x${string}`,
    },
    onLogs: (logs) => {
      logs.forEach(log => {
        onApproval({
          owner: log.args.owner,
          spender: log.args.spender,
          amount: log.args.value,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
        });
      });
    },
  });
}
```

---

## Part 7: Error Handling

### 7.1 Common Errors

```typescript
// lib/errors.ts
export enum MonadError {
  INSUFFICIENT_BALANCE = 'Insufficient MON balance',
  NETWORK_CONGESTION = 'Network congested, try again',
  TRANSACTION_REVERTED = 'Transaction reverted',
  INVALID_CHAIN = 'Not connected to Monad testnet',
  RPC_ERROR = 'RPC endpoint error',
}

export function handleMonadError(error: any): string {
  if (error.message.includes('insufficient funds')) {
    return MonadError.INSUFFICIENT_BALANCE;
  }
  
  if (error.message.includes('timeout')) {
    return MonadError.NETWORK_CONGESTION;
  }
  
  if (error.message.includes('revert')) {
    return MonadError.TRANSACTION_REVERTED;
  }
  
  if (error.message.includes('chain mismatch')) {
    return MonadError.INVALID_CHAIN;
  }
  
  return MonadError.RPC_ERROR;
}

// Usage
try {
  await submitTransaction(walletClient, tx);
} catch (error) {
  const errorMsg = handleMonadError(error);
  console.error(errorMsg);
  // Show user-friendly error
}
```

### 7.2 Retry Logic

```typescript
// lib/retry.ts
export async function retryOnMonad<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      console.warn(`Attempt ${i + 1} failed:`, error.message);
      
      if (i === maxRetries - 1) throw error;
      
      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, delay * Math.pow(2, i))
      );
    }
  }
  
  throw new Error('Max retries exceeded');
}

// Usage
const balance = await retryOnMonad(() => 
  publicClient.getBalance({ address: userAddress })
);
```

---

## Part 8: Performance Optimization

### 8.1 Batch RPC Calls

```typescript
// lib/batchCalls.ts
export async function batchBalanceChecks(
  addresses: string[]
): Promise<Map<string, bigint>> {
  const balances = new Map<string, bigint>();
  
  // Use multicall to batch requests
  const calls = addresses.map(addr => ({
    address: addr as `0x${string}`,
  }));
  
  const results = await Promise.all(
    calls.map(call => publicClient.getBalance(call))
  );
  
  addresses.forEach((addr, i) => {
    balances.set(addr, results[i]);
  });
  
  return balances;
}
```

### 8.2 Caching Strategy

```typescript
// lib/cache.ts
export class MonadCache {
  private cache = new Map<string, { data: any; expires: number }>();
  
  set(key: string, data: any, ttlSeconds: number = 60) {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttlSeconds * 1000,
    });
  }
  
  get(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  // Cache block number (changes every ~1s on Monad)
  async getBlockNumber(): Promise<bigint> {
    const cached = this.get('blockNumber');
    if (cached) return cached;
    
    const blockNumber = await publicClient.getBlockNumber();
    this.set('blockNumber', blockNumber, 1); // 1 second TTL
    
    return blockNumber;
  }
}
```

---

## Part 9: Testing on Monad

### 9.1 Test Helpers

```typescript
// test/helpers/monad.ts
export async function setupTestAccount(): Promise<string> {
  // Generate test account
  const account = privateKeyToAccount(generatePrivateKey());
  
  // Request tokens from faucet
  await requestFaucetTokens(account.address);
  
  // Wait for tokens to arrive
  await waitForBalance(account.address, parseEther('1'));
  
  return account.address;
}

export async function waitForBalance(
  address: string,
  minBalance: bigint,
  timeoutMs = 30000
): Promise<void> {
  const start = Date.now();
  
  while (Date.now() - start < timeoutMs) {
    const balance = await publicClient.getBalance({ 
      address: address as `0x${string}` 
    });
    
    if (balance >= minBalance) return;
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error('Timeout waiting for balance');
}
```

---

## Part 10: Monitoring & Debugging

### 10.1 RPC Health Check

```typescript
// lib/healthCheck.ts
export async function checkMonadHealth(): Promise<{
  healthy: boolean;
  latency: number;
  blockNumber: bigint;
}> {
  const start = Date.now();
  
  try {
    const blockNumber = await publicClient.getBlockNumber();
    const latency = Date.now() - start;
    
    return {
      healthy: latency < 1000, // < 1s is healthy
      latency,
      blockNumber,
    };
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - start,
      blockNumber: 0n,
    };
  }
}
```

### 10.2 Transaction Debugger

```typescript
// lib/debugTransaction.ts
export async function debugTransaction(txHash: string) {
  const tx = await publicClient.getTransaction({ 
    hash: txHash as `0x${string}` 
  });
  
  const receipt = await publicClient.getTransactionReceipt({ 
    hash: txHash as `0x${string}` 
  });
  
  console.log('Transaction Debug Info:');
  console.log('├─ Hash:', txHash);
  console.log('├─ From:', tx.from);
  console.log('├─ To:', tx.to);
  console.log('├─ Value:', formatEther(tx.value), 'MON');
  console.log('├─ Gas Used:', receipt.gasUsed.toString());
  console.log('├─ Gas Price:', formatGwei(tx.gasPrice!), 'Gwei');
  console.log('├─ Status:', receipt.status);
  console.log('└─ Block:', receipt.blockNumber);
  
  if (receipt.status === 'reverted') {
    console.log('\n⚠️  Transaction Reverted');
    // Try to decode revert reason
    // ...
  }
}
```

---

## Best Practices for Monad

### Performance
1. **Use WebSockets** for real-time updates
2. **Batch RPC calls** when possible
3. **Cache frequently accessed data** (block numbers, gas prices)
4. **Optimize gas usage** to reduce costs

### Reliability
1. **Implement retry logic** for transient failures
2. **Monitor RPC health** regularly
3. **Have fallback RPC endpoints** (if available)
4. **Handle reorgs gracefully**

### Security
1. **Never expose private keys** in frontend code
2. **Validate all addresses** before transactions
3. **Set gas limits** to prevent runaway transactions
4. **Use safe math** for all calculations

---

## Troubleshooting

### Issue: MetaMask won't connect to Monad
**Solution**: Manually add network using chain ID `41454`

### Issue: Transactions failing with "insufficient funds"
**Solution**: Ensure account has enough MON for gas + value

### Issue: RPC timeout errors
**Solution**: Implement retry logic with exponential backoff

### Issue: Smart account deployment fails
**Solution**: Check bundler configuration and gas settings

---

## Resources

- [Monad Documentation](https://docs.monad.xyz)
- [Monad Block Explorer](https://explorer.testnet.monad.xyz)
- [Monad Discord](https://discord.gg/monad) - Community support
- [Viem Monad Integration](https://viem.sh)

---

## Summary

This guide covered:
- ✅ Network configuration and setup
- ✅ Faucet usage and token management
- ✅ Transaction submission and monitoring
- ✅ Block explorer integration
- ✅ WebSocket subscriptions
- ✅ Error handling and retry logic
- ✅ Performance optimization
- ✅ Testing and debugging tools

Your Wallet Autopilot is now fully configured for Monad testnet! 🚀