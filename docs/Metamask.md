# MetaMask Smart Accounts & Delegation Toolkit Integration Guide

## Overview

This guide covers the integration of MetaMask Smart Accounts and the Delegation Toolkit for the Wallet Autopilot project. MetaMask Smart Accounts enable account abstraction with delegated permissions, allowing an agent to perform automated actions on behalf of users.

## Prerequisites

```bash
# Install the Delegation Toolkit
npm install @metamask/delegation-toolkit viem

# Required peer dependencies
npm install viem@latest
```

## Core Concepts

### Smart Account Types

1. **Hybrid Smart Account**: Supports both EOA owner and passkey signers
2. **Multisig Smart Account**: Multiple EOA signers with configurable threshold
3. **Stateless 7702 Smart Account**: Upgraded EOA supporting smart account features (EIP-7702)

For Wallet Autopilot, we'll use **Hybrid Smart Accounts** as they provide flexibility and are well-suited for delegation scenarios.

---

## Part 1: Creating Smart Accounts

### 1.1 Setup Public Client (Monad Testnet)

```typescript
// lib/monad.ts
import { createPublicClient, http } from "viem";

export const monadTestnet = {
  id: 41454,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: { 
    name: 'Monad', 
    symbol: 'MON', 
    decimals: 18 
  },
  rpcUrls: {
    default: { http: ['https://testnet.monad.xyz'] },
    public: { http: ['https://testnet.monad.xyz'] },
  },
  blockExplorers: {
    default: { 
      name: 'Monad Explorer', 
      url: 'https://explorer.testnet.monad.xyz' 
    },
  },
};

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});
```

### 1.2 Create Hybrid Smart Account with EOA Signer

For Wallet Autopilot, users will create smart accounts using their MetaMask wallet:

```typescript
// lib/smartAccount.ts
import { 
  Implementation, 
  toMetaMaskSmartAccount 
} from "@metamask/delegation-toolkit";
import { createWalletClient, custom } from "viem";
import { publicClient, monadTestnet } from "./monad";

/**
 * Create a Hybrid Smart Account for the user
 * This will be called when user first connects their wallet
 */
export async function createUserSmartAccount() {
  // Get user's wallet client from MetaMask
  const walletClient = createWalletClient({
    chain: monadTestnet,
    transport: custom(window.ethereum),
  });

  const addresses = await walletClient.getAddresses();
  const ownerAddress = addresses[0];

  // Create Hybrid Smart Account
  const smartAccount = await toMetaMaskSmartAccount({
    client: publicClient,
    implementation: Implementation.Hybrid,
    deployParams: [
      ownerAddress,  // EOA owner address
      [],            // No passkey IDs initially
      [],            // No passkey X coordinates
      []             // No passkey Y coordinates
    ],
    deploySalt: "0x", // Can use unique salt per user if needed
    signer: { walletClient },
  });

  return smartAccount;
}
```

### 1.3 Create Hybrid Smart Account with Passkey (Optional)

For enhanced security, users can add passkey authentication:

```typescript
// lib/smartAccountPasskey.ts
import { 
  Implementation, 
  toMetaMaskSmartAccount 
} from "@metamask/delegation-toolkit";
import {
  createWebAuthnCredential,
  toWebAuthnAccount,
} from "viem/account-abstraction";
import { Address, PublicKey } from "ox";
import { toHex } from "viem";
import { publicClient } from "./monad";

/**
 * Create a Hybrid Smart Account with passkey signer
 * Useful for passwordless authentication
 */
export async function createSmartAccountWithPasskey() {
  // Create WebAuthn credential (passkey)
  const credential = await createWebAuthnCredential({
    name: "Wallet Autopilot",
  });

  const webAuthnAccount = toWebAuthnAccount({ credential });

  // Deserialize public key from credential
  const publicKey = PublicKey.fromHex(credential.publicKey);
  const owner = Address.fromPublicKey(publicKey);

  // Create smart account with passkey
  const smartAccount = await toMetaMaskSmartAccount({
    client: publicClient,
    implementation: Implementation.Hybrid,
    deployParams: [
      owner,
      [credential.id],     // Passkey ID
      [publicKey.x],       // Public key X coordinate
      [publicKey.y]        // Public key Y coordinate
    ],
    deploySalt: "0x",
    signer: { 
      webAuthnAccount, 
      keyId: toHex(credential.id) 
    },
  });

  return smartAccount;
}
```

---

## Part 2: Deploying Smart Accounts

Smart accounts can be deployed in two ways:

### 2.1 Automatic Deployment (Recommended)

The smart account is automatically deployed when sending the first user operation:

```typescript
// lib/deployment.ts
import { createBundlerClient } from "viem/account-abstraction";
import { parseEther } from "viem";
import { publicClient, monadTestnet } from "./monad";

/**
 * Deploy smart account automatically with first transaction
 * The Delegation Toolkit handles deployment via initCode
 */
export async function deploySmartAccountAutomatic(smartAccount: any) {
  // Create bundler client (you'll need a bundler service)
  const bundlerClient = createBundlerClient({
    client: publicClient,
    transport: http("YOUR_BUNDLER_RPC_URL"), // Replace with actual bundler
  });

  // First user operation will deploy the account
  const userOpHash = await bundlerClient.sendUserOperation({
    account: smartAccount,
    calls: [
      {
        to: "0x1234567890123456789012345678901234567890",
        value: parseEther("0.001"), // Small test transaction
      }
    ],
    maxFeePerGas: 1n,
    maxPriorityFeePerGas: 1n,
  });

  console.log("Smart Account deployed with user operation:", userOpHash);
  return userOpHash;
}
```

### 2.2 Manual Deployment

Deploy smart account manually using a relay account (useful for sponsored deployments):

```typescript
// lib/deploymentManual.ts
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet, publicClient } from "./monad";

/**
 * Manually deploy smart account using a relay account
 * Useful when you want to sponsor deployment costs
 */
export async function deploySmartAccountManual(
  smartAccount: any,
  relayPrivateKey: string
) {
  // Get factory args from smart account
  const { factory, factoryData } = await smartAccount.getFactoryArgs();

  // Create relay account wallet client
  const relayAccount = privateKeyToAccount(relayPrivateKey);
  const walletClient = createWalletClient({
    account: relayAccount,
    chain: monadTestnet,
    transport: http(),
  });

  // Deploy smart account via relay
  const hash = await walletClient.sendTransaction({
    to: factory,
    data: factoryData,
  });

  console.log("Smart Account deployed manually:", hash);
  return hash;
}
```

---

## Part 3: Creating Delegations

Delegations grant specific permissions to the Wallet Autopilot Agent.

### 3.1 Function Call Scope (For Auto-Revoke)

Allow agent to revoke token approvals:

```typescript
// lib/delegations.ts
import { createDelegation } from "@metamask/delegation-toolkit";

/**
 * Create delegation for auto-revoking token approvals
 * Allows agent to call approve(spender, 0) on ERC20 tokens
 */
export async function createRevokeDelegation(
  delegatorAccount: any,  // User's smart account
  delegateAccount: any,   // Agent's account
  tokenAddresses: string[] // Tokens to monitor
) {
  const delegation = createDelegation({
    scope: {
      type: "functionCall",
      targets: tokenAddresses,  // ERC20 token contracts
      selectors: ["approve(address,uint256)"], // Only approve function
    },
    to: delegateAccount,
    from: delegatorAccount,
    environment: delegatorAccount.environment,
  });

  return delegation;
}
```

### 3.2 ERC20 Transfer Scope (For Dust Consolidation)

Allow agent to consolidate dust tokens:

```typescript
/**
 * Create delegation for dust token consolidation
 * Allows agent to transfer small amounts of tokens
 */
export async function createDustConsolidationDelegation(
  delegatorAccount: any,
  delegateAccount: any,
  tokenAddress: string,
  maxAmount: bigint // Maximum amount agent can transfer
) {
  const delegation = createDelegation({
    scope: {
      type: "erc20TransferAmount",
      tokenAddress,
      maxAmount, // e.g., tokens worth $1
    },
    to: delegateAccount,
    from: delegatorAccount,
    environment: delegatorAccount.environment,
  });

  return delegation;
}
```

### 3.3 Spending Limit Scope (Safety Constraint)

Add spending limits to prevent agent from transferring too much:

```typescript
/**
 * Create delegation with periodic spending limit
 * Ensures agent can only spend limited amounts per day
 */
export async function createLimitedSpendingDelegation(
  delegatorAccount: any,
  delegateAccount: any,
  tokenAddress: string,
  dailyLimit: bigint
) {
  const delegation = createDelegation({
    scope: {
      type: "erc20PeriodTransfer",
      tokenAddress,
      periodAmount: dailyLimit, // Amount per period
      periodDuration: 86400,    // 24 hours in seconds
      startDate: Math.floor(Date.now() / 1000), // Start now
    },
    to: delegateAccount,
    from: delegatorAccount,
    environment: delegatorAccount.environment,
  });

  return delegation;
}
```

### 3.4 Native Token Limit (For Gas Sponsorship)

Allow agent to pay for gas with spending limits:

```typescript
/**
 * Create delegation for native token (MON) spending
 * Allows agent to pay gas fees with limits
 */
export async function createGasSpendingDelegation(
  delegatorAccount: any,
  delegateAccount: any,
  maxGasAmount: bigint // Max MON for gas
) {
  const delegation = createDelegation({
    scope: {
      type: "nativeTokenTransferAmount",
      maxAmount: maxGasAmount, // e.g., 0.1 MON in wei
    },
    to: delegateAccount,
    from: delegatorAccount,
    environment: delegatorAccount.environment,
  });

  return delegation;
}
```

---

## Part 4: Executing Delegated Transactions

The agent uses delegations to execute transactions on behalf of users:

### 4.1 Agent Setup

```typescript
// backend/src/agent/setup.ts
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http } from "viem";
import { monadTestnet } from "./monad";

/**
 * Initialize agent account
 * This runs in the backend service
 */
export function initializeAgent() {
  const agentPrivateKey = process.env.AGENT_PRIVATE_KEY!;
  const agentAccount = privateKeyToAccount(agentPrivateKey);

  const agentWalletClient = createWalletClient({
    account: agentAccount,
    chain: monadTestnet,
    transport: http(),
  });

  return { agentAccount, agentWalletClient };
}
```

### 4.2 Execute Revoke Approval

```typescript
// backend/src/agent/executor.ts
import { encodeFunctionData } from "viem";
import { executeDelegatedTransaction } from "@metamask/delegation-toolkit";

/**
 * Agent revokes a token approval on behalf of user
 */
export async function executeRevokeApproval(
  userSmartAccount: any,
  delegation: any,
  tokenAddress: string,
  spenderAddress: string
) {
  // Encode approve(spender, 0) calldata
  const calldata = encodeFunctionData({
    abi: [
      {
        name: "approve",
        type: "function",
        inputs: [
          { name: "spender", type: "address" },
          { name: "amount", type: "uint256" }
        ],
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "nonpayable",
      }
    ],
    functionName: "approve",
    args: [spenderAddress, 0n], // Set approval to 0
  });

  // Execute delegated transaction
  const txHash = await executeDelegatedTransaction({
    smartAccount: userSmartAccount,
    delegation,
    transaction: {
      to: tokenAddress,
      data: calldata,
      value: 0n,
    },
  });

  console.log(`Revoked approval for ${spenderAddress} on ${tokenAddress}`);
  return txHash;
}
```

### 4.3 Execute Dust Consolidation

```typescript
/**
 * Agent swaps dust tokens to target asset
 */
export async function executeDustConsolidation(
  userSmartAccount: any,
  delegation: any,
  dustTokenAddress: string,
  dexRouterAddress: string,
  swapCalldata: string // Pre-built swap calldata from DEX
) {
  const txHash = await executeDelegatedTransaction({
    smartAccount: userSmartAccount,
    delegation,
    transaction: {
      to: dexRouterAddress,
      data: swapCalldata,
      value: 0n,
    },
  });

  console.log(`Consolidated dust token ${dustTokenAddress}`);
  return txHash;
}
```

---

## Part 5: Frontend Integration

### 5.1 React Hook for Smart Account

```typescript
// hooks/useSmartAccount.ts
import { useState, useEffect } from 'react';
import { useWalletClient } from 'wagmi';
import { createUserSmartAccount } from '@/lib/smartAccount';

export function useSmartAccount() {
  const [smartAccount, setSmartAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { data: walletClient } = useWalletClient();

  const createSmartAccount = async () => {
    if (!walletClient) return;
    
    setIsLoading(true);
    try {
      const account = await createUserSmartAccount();
      setSmartAccount(account);
      
      // Store smart account address in local state or context
      localStorage.setItem('smartAccountAddress', account.address);
    } catch (error) {
      console.error('Failed to create smart account:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { smartAccount, createSmartAccount, isLoading };
}
```

### 5.2 React Hook for Delegations

```typescript
// hooks/useDelegation.ts
import { useState } from 'react';
import { createRevokeDelegation } from '@/lib/delegations';

export function useDelegation(smartAccount: any) {
  const [delegation, setDelegation] = useState(null);
  const [isGranting, setIsGranting] = useState(false);

  const grantDelegation = async (agentAddress: string, tokenAddresses: string[]) => {
    if (!smartAccount) return;
    
    setIsGranting(true);
    try {
      // Create delegation object
      const newDelegation = await createRevokeDelegation(
        smartAccount,
        { address: agentAddress },
        tokenAddresses
      );
      
      // Sign delegation (requires user signature)
      const signedDelegation = await smartAccount.signDelegation(newDelegation);
      setDelegation(signedDelegation);
      
      // Send to backend to register
      await fetch('/api/delegation', {
        method: 'POST',
        body: JSON.stringify({
          userAddress: smartAccount.address,
          delegation: signedDelegation,
        }),
      });
      
      return signedDelegation;
    } catch (error) {
      console.error('Failed to grant delegation:', error);
    } finally {
      setIsGranting(false);
    }
  };

  const revokeDelegation = async () => {
    // Revoke delegation by calling revoke on smart account
    // This requires user signature
    await smartAccount.revokeDelegation(delegation);
    setDelegation(null);
  };

  return { delegation, grantDelegation, revokeDelegation, isGranting };
}
```

### 5.3 Dashboard Component

```typescript
// components/DelegationControls.tsx
import { useSmartAccount } from '@/hooks/useSmartAccount';
import { useDelegation } from '@/hooks/useDelegation';

export function DelegationControls() {
  const { smartAccount, createSmartAccount, isLoading } = useSmartAccount();
  const { delegation, grantDelegation, revokeDelegation, isGranting } = 
    useDelegation(smartAccount);

  const AGENT_ADDRESS = process.env.NEXT_PUBLIC_AGENT_ADDRESS!;

  return (
    <div className="space-y-4">
      {!smartAccount ? (
        <button 
          onClick={createSmartAccount}
          disabled={isLoading}
          className="btn-primary"
        >
          {isLoading ? 'Creating Smart Account...' : 'Create Smart Account'}
        </button>
      ) : (
        <>
          <div className="text-sm">
            Smart Account: {smartAccount.address}
          </div>
          
          {!delegation ? (
            <button 
              onClick={() => grantDelegation(AGENT_ADDRESS, [])}
              disabled={isGranting}
              className="btn-primary"
            >
              {isGranting ? 'Granting...' : 'Enable Wallet Autopilot'}
            </button>
          ) : (
            <div className="space-y-2">
              <div className="text-green-600">✓ Autopilot Active</div>
              <button 
                onClick={revokeDelegation}
                className="btn-danger"
              >
                Pause Autopilot
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

---

## Part 6: Backend Agent Service

### 6.1 Monitor Delegations

```typescript
// backend/src/services/delegation-monitor.ts
interface DelegationRecord {
  userAddress: string;
  smartAccountAddress: string;
  delegation: any;
  permissions: {
    canRevokeApprovals: boolean;
    canConsolidateDust: boolean;
    tokenAddresses: string[];
  };
  createdAt: Date;
}

export class DelegationMonitor {
  private delegations: Map<string, DelegationRecord> = new Map();

  registerDelegation(record: DelegationRecord) {
    this.delegations.set(record.smartAccountAddress, record);
  }

  getDelegation(smartAccountAddress: string) {
    return this.delegations.get(smartAccountAddress);
  }

  removeDelegation(smartAccountAddress: string) {
    this.delegations.delete(smartAccountAddress);
  }

  getAllActiveDelegations() {
    return Array.from(this.delegations.values());
  }
}
```

---

## Best Practices for Wallet Autopilot

### Security
1. **Minimal Permissions**: Only grant permissions needed for specific actions
2. **Spending Limits**: Always set maximum amounts for token transfers
3. **Time Limits**: Use periodic scopes to limit actions per time period
4. **Audit Trail**: Log all delegated transactions for user review
5. **Revocation**: Always provide easy revocation mechanism

### User Experience
1. **Clear Communication**: Explain what permissions are being granted
2. **Visual Indicators**: Show active delegations clearly in UI
3. **Transaction History**: Display all automated actions taken
4. **Emergency Stop**: Prominent "Pause Autopilot" button

### Performance
1. **Batch Operations**: Combine multiple revocations when possible
2. **Gas Optimization**: Use efficient calldata encoding
3. **Error Handling**: Gracefully handle failed delegated transactions
4. **Retry Logic**: Implement exponential backoff for transient failures

---

## Troubleshooting

### Common Issues

**Smart Account Not Deploying**:
- Ensure user has sufficient MON for gas
- Check bundler service is configured correctly
- Verify network configuration matches Monad testnet

**Delegation Signature Fails**:
- Confirm user's wallet is connected
- Check smart account is properly initialized
- Verify delegation parameters are correct

**Delegated Transaction Reverts**:
- Check delegation permissions match transaction
- Ensure spending limits not exceeded
- Verify token addresses are correct

---

## Additional Resources

- [MetaMask Delegation Toolkit Docs](https://docs.metamask.io/delegation-toolkit/)
- [Viem Account Abstraction](https://viem.sh/account-abstraction)
- [EIP-7702 Specification](https://eips.ethereum.org/EIPS/eip-7702)

## Summary

This integration guide provides everything needed to:
- ✅ Create MetaMask Smart Accounts on Monad
- ✅ Deploy smart accounts (automatically or manually)
- ✅ Create delegations with appropriate scopes
- ✅ Execute delegated transactions from agent
- ✅ Build frontend components for user interaction
- ✅ Implement backend agent service

Use this guide as a reference when implementing the Wallet Autopilot delegation system!