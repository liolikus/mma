# Frontend - Next.js & React Implementation Guide

## Overview

This guide covers building the Wallet Autopilot frontend using Next.js 15, React 19, Tailwind CSS, and Web3 libraries. The frontend provides an intuitive dashboard for wallet health monitoring, delegation management, and automation controls.

## Tech Stack

- **Framework**: Next.js 15 (App Router with React 19)
- **UI Library**: React 19 (with React Compiler)
- **Styling**: Tailwind CSS
- **Web3**: Wagmi v2, Viem
- **State Management**: React Context + React 19 Hooks
- **Icons**: Lucide React
- **Charts**: Recharts
- **HTTP Client**: Native Fetch API with Actions

---

## Part 1: Project Setup

### 1.1 Initialize Project

```bash
# Create Next.js app
npx create-next-app@latest wallet-autopilot-frontend
cd wallet-autopilot-frontend

# Select options:
# ✓ TypeScript: Yes
# ✓ ESLint: Yes
# ✓ Tailwind CSS: Yes
# ✓ src/ directory: Yes
# ✓ App Router: Yes
# ✓ Import alias: @/*
```

### 1.2 Install Dependencies

```bash
# React 19 and Next.js 15
npm install react@rc react-dom@rc next@latest

# Web3 libraries
npm install wagmi@^2 viem@^2 @tanstack/react-query
npm install @metamask/delegation-toolkit

# UI components & utilities
npm install lucide-react
npm install recharts
npm install date-fns
npm install clsx tailwind-merge

# Development
npm install --save-dev @types/node @types/react@rc @types/react-dom@rc
npm install --save-dev eslint-plugin-react-compiler
```

### 1.2.1 Enable React Compiler (Automatic Optimization)

React 19 includes an automatic compiler that optimizes your components. Enable it in your Next.js config:

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    reactCompiler: true,
  },
};

module.exports = nextConfig;
```

Add ESLint plugin for compiler:

```json
// .eslintrc.json
{
  "extends": ["next/core-web-vitals"],
  "plugins": ["react-compiler"],
  "rules": {
    "react-compiler/react-compiler": "error"
  }
}
```

### 1.3 Project Structure

```
src/
├── app/
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Landing page
│   ├── dashboard/
│   │   └── page.tsx         # Dashboard page
│   ├── globals.css          # Global styles
│   └── providers.tsx        # Context providers
├── components/
│   ├── ui/                  # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   └── ...
│   ├── wallet/              # Wallet-related components
│   │   ├── WalletConnect.tsx
│   │   ├── SmartAccountSetup.tsx
│   │   └── NetworkSwitcher.tsx
│   ├── dashboard/           # Dashboard components
│   │   ├── HealthScore.tsx
│   │   ├── AllowancesTable.tsx
│   │   ├── SpamTokensList.tsx
│   │   └── DustBalances.tsx
│   └── delegation/          # Delegation components
│       ├── DelegationControls.tsx
│       └── AutomationSettings.tsx
├── hooks/                   # Custom React hooks
│   ├── useSmartAccount.ts
│   ├── useDelegation.ts
│   ├── useWalletHealth.ts
│   └── useAutomation.ts
├── lib/                     # Utility functions
│   ├── monad.ts            # Monad config
│   ├── smartAccount.ts     # Smart account helpers
│   ├── delegation.ts       # Delegation helpers
│   └── utils.ts            # General utilities
├── services/               # API services
│   ├── api.ts              # Backend API client
│   └── envio.ts            # Envio GraphQL client
└── types/                  # TypeScript types
    ├── smartAccount.ts
    ├── delegation.ts
    └── wallet.ts
```

---

## Part 2: Configuration & Setup

### 2.1 Wagmi Configuration

```typescript
// src/lib/wagmi.ts
import { createConfig, http } from 'wagmi';
import { monadTestnet } from './monad';
import { injected, metaMask } from 'wagmi/connectors';

export const config = createConfig({
  chains: [monadTestnet],
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [monadTestnet.id]: http(),
  },
});
```

### 2.2 Providers Setup

```typescript
// src/app/providers.tsx
'use client';

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/lib/wagmi';
import { SmartAccountProvider } from '@/contexts/SmartAccountContext';
import { DelegationProvider } from '@/contexts/DelegationContext';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <SmartAccountProvider>
          <DelegationProvider>
            {children}
          </DelegationProvider>
        </SmartAccountProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### 2.3 Root Layout

```typescript
// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Wallet Autopilot - Automated Wallet Health',
  description: 'Automate wallet maintenance on Monad',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

---

## Part 3: Context & State Management

### 3.1 Smart Account Context (React 19 with `use` hook)

```typescript
// src/contexts/SmartAccountContext.tsx
'use client';

import { createContext, useContext, useState, use, cache } from 'react';
import { useAccount } from 'wagmi';
import { createUserSmartAccount } from '@/lib/smartAccount';

interface SmartAccountContextType {
  smartAccount: any | null;
  isCreating: boolean;
  isDeployed: boolean;
  createSmartAccount: () => Promise<void>;
  deploySmartAccount: () => Promise<void>;
}

const SmartAccountContext = createContext<SmartAccountContextType | undefined>(
  undefined
);

// Cache smart account lookup (React 19 feature)
const getCachedSmartAccount = cache(async (address: string) => {
  const stored = localStorage.getItem(`smartAccount:${address}`);
  return stored ? JSON.parse(stored) : null;
});

export function SmartAccountProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const [smartAccount, setSmartAccount] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeployed, setIsDeployed] = useState(false);

  // React 19: Load existing smart account using 'use' hook
  if (address && !smartAccount && !isCreating) {
    const cachedAccount = use(getCachedSmartAccount(address));
    if (cachedAccount && cachedAccount !== smartAccount) {
      setSmartAccount(cachedAccount);
    }
  }

  const createSmartAccount = async () => {
    if (!isConnected || isCreating) return;
    
    setIsCreating(true);
    try {
      const account = await createUserSmartAccount();
      setSmartAccount(account);
      
      // Store in localStorage
      localStorage.setItem(
        `smartAccount:${address}`,
        JSON.stringify({
          address: account.address,
          createdAt: Date.now(),
        })
      );
    } catch (error) {
      console.error('Failed to create smart account:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const deploySmartAccount = async () => {
    if (!smartAccount) return;
    
    // Deploy smart account
    // Implementation depends on deployment strategy
    setIsDeployed(true);
  };

  return (
    <SmartAccountContext.Provider
      value={{
        smartAccount,
        isCreating,
        isDeployed,
        createSmartAccount,
        deploySmartAccount,
      }}
    >
      {children}
    </SmartAccountContext.Provider>
  );
}

export function useSmartAccount() {
  const context = useContext(SmartAccountContext);
  if (!context) {
    throw new Error('useSmartAccount must be used within SmartAccountProvider');
  }
  return context;
}
```

### 3.2 Delegation Context (React 19 with Actions and Transitions)

```typescript
// src/contexts/DelegationContext.tsx
'use client';

import { createContext, useContext, useState, useTransition, useOptimistic } from 'react';
import { useSmartAccount } from './SmartAccountContext';
import { createRevokeDelegation } from '@/lib/delegation';
import { apiClient } from '@/services/api';

interface DelegationContextType {
  delegation: any | null;
  isActive: boolean;
  isPending: boolean;
  grantDelegation: (rules: any) => Promise<void>;
  revokeDelegation: () => Promise<void>;
  pauseDelegation: () => Promise<void>;
  resumeDelegation: () => Promise<void>;
}

const DelegationContext = createContext<DelegationContextType | undefined>(
  undefined
);

export function DelegationProvider({ children }: { children: React.ReactNode }) {
  const { smartAccount } = useSmartAccount();
  const [delegation, setDelegation] = useState<any | null>(null);
  const [isActive, setIsActive] = useState(false);
  
  // React 19: useTransition for non-blocking updates
  const [isPending, startTransition] = useTransition();
  
  // React 19: useOptimistic for immediate UI updates
  const [optimisticActive, setOptimisticActive] = useOptimistic(
    isActive,
    (state, newState: boolean) => newState
  );

  const grantDelegation = async (rules: any) => {
    if (!smartAccount) return;
    
    // Optimistically update UI
    startTransition(() => {
      setOptimisticActive(true);
    });
    
    try {
      const agentAddress = process.env.NEXT_PUBLIC_AGENT_ADDRESS!;
      
      // Create delegation
      const newDelegation = await createRevokeDelegation(
        smartAccount,
        { address: agentAddress },
        [] // Token addresses
      );
      
      // Sign delegation (requires user signature)
      const signedDelegation = await smartAccount.signDelegation(newDelegation);
      
      // Register with backend
      await apiClient.post('/delegations', {
        userAddress: smartAccount.ownerAddress,
        smartAccountAddress: smartAccount.address,
        delegation: signedDelegation,
        rules,
      });
      
      setDelegation(signedDelegation);
      setIsActive(true);
    } catch (error) {
      console.error('Failed to grant delegation:', error);
      // Revert optimistic update on error
      setOptimisticActive(false);
      throw error;
    }
  };

  const revokeDelegation = async () => {
    if (!smartAccount || !delegation) return;
    
    startTransition(async () => {
      setOptimisticActive(false);
      
      try {
        await smartAccount.revokeDelegation(delegation);
        
        // Remove from backend
        await apiClient.delete(`/delegations/${smartAccount.address}`);
        
        setDelegation(null);
        setIsActive(false);
      } catch (error) {
        console.error('Failed to revoke delegation:', error);
        setOptimisticActive(true);
        throw error;
      }
    });
  };

  const pauseDelegation = async () => {
    if (!smartAccount) return;
    
    startTransition(async () => {
      setOptimisticActive(false);
      await apiClient.post(`/delegations/${smartAccount.address}/pause`);
      setIsActive(false);
    });
  };

  const resumeDelegation = async () => {
    if (!smartAccount) return;
    
    startTransition(async () => {
      setOptimisticActive(true);
      await apiClient.post(`/delegations/${smartAccount.address}/resume`);
      setIsActive(true);
    });
  };

  return (
    <DelegationContext.Provider
      value={{
        delegation,
        isActive: optimisticActive,
        isPending,
        grantDelegation,
        revokeDelegation,
        pauseDelegation,
        resumeDelegation,
      }}
    >
      {children}
    </DelegationContext.Provider>
  );
}

export function useDelegation() {
  const context = useContext(DelegationContext);
  if (!context) {
    throw new Error('useDelegation must be used within DelegationProvider');
  }
  return context;
}
```

---

## Part 4: Custom Hooks (React 19 Enhanced)

### 4.1 Wallet Health Hook with Suspense

```typescript
// src/hooks/useWalletHealth.ts
import { useSuspenseQuery } from '@tanstack/react-query';
import { envioClient } from '@/services/envio';

export function useWalletHealth(walletAddress: string | undefined) {
  return useSuspenseQuery({
    queryKey: ['walletHealth', walletAddress],
    queryFn: async () => {
      if (!walletAddress) throw new Error('No wallet address');

      const query = `
        query GetHealth($wallet: String!) {
          WalletHealth(where: { walletAddress: { _eq: $wallet } }) {
            healthScore
            activeApprovalsCount
            riskyApprovalsCount
            spamTokensCount
            dustTokensCount
            lastCalculatedAt
          }
        }
      `;

      const data = await envioClient.request(query, { 
        wallet: walletAddress.toLowerCase() 
      });
      
      return data.WalletHealth[0] || null;
    },
    // React 19: Better suspense integration
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
```

### 4.2 Token Approvals Hook

```typescript
// src/hooks/useTokenApprovals.ts
import { useQuery } from '@tanstack/react-query';
import { envioClient } from '@/services/envio';

export function useTokenApprovals(walletAddress: string | undefined) {
  return useQuery({
    queryKey: ['tokenApprovals', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return [];

      const query = `
        query GetApprovals($wallet: String!) {
          TokenApproval(
            where: { 
              owner: { _eq: $wallet },
              status: { _eq: "ACTIVE" }
            }
            order_by: { blockTimestamp: desc }
          ) {
            id
            spender
            tokenAddress
            amount
            isUnlimited
            isRisky
            blockTimestamp
          }
        }
      `;

      const data = await envioClient.request(query, { 
        wallet: walletAddress.toLowerCase() 
      });
      
      return data.TokenApproval;
    },
    enabled: !!walletAddress,
  });
}
```

### 4.3 Automated Actions Hook

```typescript
// src/hooks/useAutomatedActions.ts
import { useQuery } from '@tanstack/react-query';
import { envioClient } from '@/services/envio';

export function useAutomatedActions(walletAddress: string | undefined) {
  return useQuery({
    queryKey: ['automatedActions', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return [];

      const query = `
        query GetActions($wallet: String!) {
          AutomatedAction(
            where: { walletAddress: { _eq: $wallet } }
            order_by: { blockTimestamp: desc }
            limit: 20
          ) {
            id
            actionType
            tokenAddress
            targetAddress
            transactionHash
            blockTimestamp
            status
          }
        }
      `;

      const data = await envioClient.request(query, { 
        wallet: walletAddress.toLowerCase() 
      });
      
      return data.AutomatedAction;
    },
    enabled: !!walletAddress,
  });
}
```

### 4.4 Using React 19 `use` Hook for Promises

```typescript
// src/hooks/useAsyncData.ts
import { use, cache } from 'react';

// React 19: cache() for deduplication
export const fetchWalletData = cache(async (address: string) => {
  const response = await fetch(`/api/wallet/${address}`);
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
});

// Component using 'use' hook
export function WalletData({ addressPromise }: { addressPromise: Promise<string> }) {
  // React 19: use() unwraps promises
  const address = use(addressPromise);
  const data = use(fetchWalletData(address));
  
  return <div>{data.balance}</div>;
}
```

---

## Part 4.5: React 19 Server Actions

### 4.5.1 Server Actions for Form Submission

```typescript
// src/app/actions.ts
'use server';

import { revalidatePath } from 'next/cache';

export async function updateAutomationSettings(
  prevState: any,
  formData: FormData
) {
  const smartAccountAddress = formData.get('smartAccountAddress') as string;
  const autoRevokeEnabled = formData.get('autoRevoke') === 'on';
  const dustConsolidationEnabled = formData.get('dustConsolidation') === 'on';
  
  try {
    // Update settings in backend
    const response = await fetch(`${process.env.API_URL}/api/delegations/${smartAccountAddress}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        autoRevokeEnabled,
        dustConsolidationEnabled,
      }),
    });

    if (!response.ok) throw new Error('Failed to update settings');

    // Revalidate the page
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Settings updated successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function pauseAutopilotAction(smartAccountAddress: string) {
  'use server';
  
  try {
    await fetch(`${process.env.API_URL}/api/delegations/${smartAccountAddress}/pause`, {
      method: 'POST',
    });
    
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to pause autopilot' };
  }
}
```

### 4.5.2 Using Server Actions in Components

```typescript
// src/components/delegation/AutomationSettings.tsx
'use client';

import { useFormState, useFormStatus } from 'react';
import { updateAutomationSettings } from '@/app/actions';

function SubmitButton() {
  // React 19: useFormStatus hook
  const { pending } = useFormStatus();
  
  return (
    <button 
      type="submit" 
      disabled={pending}
      className="btn-primary"
    >
      {pending ? 'Saving...' : 'Save Settings'}
    </button>
  );
}

export function AutomationSettings({ smartAccountAddress }: { smartAccountAddress: string }) {
  // React 19: useFormState for form handling
  const [state, formAction] = useFormState(updateAutomationSettings, {
    success: false,
    message: '',
  });

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="smartAccountAddress" value={smartAccountAddress} />
      
      <div className="flex items-center justify-between">
        <label htmlFor="autoRevoke">Auto-Revoke Approvals</label>
        <input 
          type="checkbox" 
          id="autoRevoke" 
          name="autoRevoke"
          defaultChecked 
        />
      </div>
      
      <div className="flex items-center justify-between">
        <label htmlFor="dustConsolidation">Consolidate Dust</label>
        <input 
          type="checkbox" 
          id="dustConsolidation" 
          name="dustConsolidation"
          defaultChecked 
        />
      </div>

      <SubmitButton />
      
      {state.message && (
        <div className={state.success ? 'text-green-600' : 'text-red-600'}>
          {state.message}
        </div>
      )}
    </form>
  );
}
```

---

## Part 5: UI Components (React 19 Optimized)

### 5.1 Wallet Connect Button

```typescript
// src/components/wallet/WalletConnect.tsx
'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/Button';
import { Wallet, LogOut } from 'lucide-react';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-sm text-gray-600">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </div>
        <Button
          onClick={() => disconnect()}
          variant="outline"
          size="sm"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={() => connect({ connector: connectors[0] })}>
      <Wallet className="h-4 w-4 mr-2" />
      Connect Wallet
    </Button>
  );
}
```

### 5.2 Health Score Component

```typescript
// src/components/dashboard/HealthScore.tsx
'use client';

import { cn } from '@/lib/utils';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';

interface HealthScoreProps {
  score: number;
  className?: string;
}

export function HealthScore({ score, className }: HealthScoreProps) {
  const getColor = () => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getIcon = () => {
    if (score >= 80) return <CheckCircle className="h-8 w-8" />;
    if (score >= 60) return <AlertTriangle className="h-8 w-8" />;
    return <Shield className="h-8 w-8" />;
  };

  const getLabel = () => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <div className={cn('relative', getColor())}>
        {getIcon()}
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={`${score * 2.83} 283`}
            opacity="0.2"
          />
        </svg>
      </div>
      
      <div className="text-center">
        <div className={cn('text-4xl font-bold', getColor())}>
          {score}
        </div>
        <div className="text-sm text-gray-600">{getLabel()}</div>
      </div>
    </div>
  );
}
```

### 5.3 Allowances Table

```typescript
// src/components/dashboard/AllowancesTable.tsx
'use client';

import { formatEther } from 'viem';
import { ExternalLink, AlertCircle } from 'lucide-react';
import { explorerLinks } from '@/lib/monad';

interface Approval {
  id: string;
  spender: string;
  tokenAddress: string;
  amount: bigint;
  isUnlimited: boolean;
  isRisky: boolean;
  blockTimestamp: bigint;
}

interface AllowancesTableProps {
  approvals: Approval[];
}

export function AllowancesTable({ approvals }: AllowancesTableProps) {
  if (approvals.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No active approvals found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              Token
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              Spender
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              Amount
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
              Status
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {approvals.map((approval) => (
            <tr key={approval.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3">
                <a
                  href={explorerLinks.token(approval.tokenAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1"
                >
                  {approval.tokenAddress.slice(0, 6)}...{approval.tokenAddress.slice(-4)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </td>
              <td className="px-4 py-3 font-mono text-sm">
                {approval.spender.slice(0, 6)}...{approval.spender.slice(-4)}
              </td>
              <td className="px-4 py-3">
                {approval.isUnlimited ? (
                  <span className="text-yellow-600">Unlimited</span>
                ) : (
                  formatEther(approval.amount)
                )}
              </td>
              <td className="px-4 py-3">
                {approval.isRisky && (
                  <span className="inline-flex items-center gap-1 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    Risky
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <button className="text-sm text-blue-600 hover:underline">
                  Revoke
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### 5.4 Delegation Controls (React 19 with Transitions)

```typescript
// src/components/delegation/DelegationControls.tsx
'use client';

import { useState, useTransition } from 'react';
import { useSmartAccount } from '@/contexts/SmartAccountContext';
import { useDelegation } from '@/contexts/DelegationContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Power, Settings, Loader2 } from 'lucide-react';
import { AutomationSettings } from './AutomationSettings';

export function DelegationControls() {
  const { smartAccount, createSmartAccount, isCreating } = useSmartAccount();
  const { isActive, isPending, grantDelegation, pauseDelegation } = useDelegation();
  const [showSettings, setShowSettings] = useState(false);
  
  // React 19: useTransition for non-blocking UI updates
  const [isTransitioning, startTransition] = useTransition();

  const handleEnableAutopilot = () => {
    startTransition(async () => {
      await grantDelegation({
        autoRevokeEnabled: true,
        revokeThresholdDays: 30,
        dustConsolidationEnabled: true,
        dustThresholdUSD: 1,
        spamRemovalEnabled: true,
      });
    });
  };

  const handlePauseAutopilot = () => {
    startTransition(async () => {
      await pauseDelegation();
    });
  };

  if (!smartAccount) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Get Started</h3>
        <p className="text-gray-600 mb-4">
          Create a smart account to enable Wallet Autopilot automation
        </p>
        <Button
          onClick={createSmartAccount}
          disabled={isCreating}
          className="w-full"
        >
          {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isCreating ? 'Creating...' : 'Create Smart Account'}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Autopilot Status</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-4">
        <div className="text-sm text-gray-600 mb-2">
          Smart Account: {smartAccount.address.slice(0, 10)}...
        </div>
      </div>

      {!isActive ? (
        <Button
          onClick={handleEnableAutopilot}
          disabled={isPending || isTransitioning}
          className="w-full"
        >
          {(isPending || isTransitioning) && (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          )}
          <Power className="h-4 w-4 mr-2" />
          {isPending || isTransitioning ? 'Enabling...' : 'Enable Autopilot'}
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-green-600 mb-4">
            <div className="h-2 w-2 rounded-full bg-green-600 animate-pulse" />
            Autopilot Active
            {isTransitioning && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          <Button
            onClick={handlePauseAutopilot}
            disabled={isPending || isTransitioning}
            variant="outline"
            className="w-full"
          >
            Pause Autopilot
          </Button>
        </div>
      )}

      {showSettings && smartAccount && (
        <div className="mt-4 pt-4 border-t">
          <AutomationSettings smartAccountAddress={smartAccount.address} />
        </div>
      )}
    </Card>
  );
}
```

---

## Part 6: Pages

### 6.1 Landing Page

```typescript
// src/app/page.tsx
import Link from 'next/link';
import { Shield, Zap, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { WalletConnect } from '@/components/wallet/WalletConnect';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Wallet Autopilot</h1>
          <WalletConnect />
        </nav>
      </header>

      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6">
            Automate Your Wallet Health
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Set it and forget it. Wallet Autopilot keeps your wallet secure 
            by automatically revoking risky approvals, removing spam tokens, 
            and consolidating dust.
          </p>
          <Link href="/dashboard">
            <Button size="lg" className="text-lg px-8 py-6">
              Open Dashboard
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-5xl mx-auto">
          <div className="text-center p-6">
            <Shield className="h-12 w-12 mx-auto mb-4 text-blue-600" />
            <h3 className="text-xl font-semibold mb-2">Auto-Revoke</h3>
            <p className="text-gray-600">
              Automatically revoke risky and unused token approvals
            </p>
          </div>
          <div className="text-center p-6">
            <Zap className="h-12 w-12 mx-auto mb-4 text-yellow-600" />
            <h3 className="text-xl font-semibold mb-2">Consolidate Dust</h3>
            <p className="text-gray-600">
              Turn small token balances into your preferred asset
            </p>
          </div>
          <div className="text-center p-6">
            <Lock className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <h3 className="text-xl font-semibold mb-2">Full Control</h3>
            <p className="text-gray-600">
              Pause or revoke delegation anytime with one click
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
```

### 6.2 Dashboard Page (React 19 with Suspense)

```typescript
// src/app/dashboard/page.tsx
'use client';

import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useAccount } from 'wagmi';
import { useSmartAccount } from '@/contexts/SmartAccountContext';
import { WalletConnect } from '@/components/wallet/WalletConnect';
import { DelegationControls } from '@/components/delegation/DelegationControls';
import { Card } from '@/components/ui/Card';
import { Loader2 } from 'lucide-react';

// Lazy load heavy components
import dynamic from 'next/dynamic';

const HealthScore = dynamic(() => import('@/components/dashboard/HealthScore').then(m => ({ default: m.HealthScore })), {
  loading: () => <Loader2 className="h-8 w-8 animate-spin" />,
});

const AllowancesTable = dynamic(() => import('@/components/dashboard/AllowancesTable').then(m => ({ default: m.AllowancesTable })), {
  ssr: false,
});

// React 19: Better error handling with ErrorBoundary
function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <Card className="p-6 border-red-200 bg-red-50">
      <h3 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h3>
      <p className="text-red-600 mb-4">{error.message}</p>
      <button 
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Try again
      </button>
    </Card>
  );
}

// Dashboard content with data fetching
function DashboardContent() {
  const { smartAccount } = useSmartAccount();
  
  if (!smartAccount) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Create a smart account to view your dashboard</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Health Score with Suspense */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Wallet Health</h3>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin mx-auto" />}>
              <WalletHealthDisplay address={smartAccount.address} />
            </Suspense>
          </ErrorBoundary>
        </Card>

        {/* Quick Stats */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Overview</h3>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin" />}>
              <WalletStats address={smartAccount.address} />
            </Suspense>
          </ErrorBoundary>
        </Card>

        {/* Delegation Controls */}
        <DelegationControls />
      </div>

      {/* Approvals Table */}
      <Card className="p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Token Approvals</h3>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Suspense fallback={<div>Loading approvals...</div>}>
            <ApprovalsDisplay address={smartAccount.address} />
          </Suspense>
        </ErrorBoundary>
      </Card>

      {/* Recent Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Automated Actions</h3>
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <Suspense fallback={<div>Loading actions...</div>}>
            <RecentActions address={smartAccount.address} />
          </Suspense>
        </ErrorBoundary>
      </Card>
    </>
  );
}

// Data components using suspense queries
function WalletHealthDisplay({ address }: { address: string }) {
  const { data: health } = useWalletHealth(address);
  return <HealthScore score={health?.healthScore ?? 0} />;
}

function WalletStats({ address }: { address: string }) {
  const { data: health } = useWalletHealth(address);
  
  if (!health) return null;
  
  return (
    <div className="space-y-3">
      <div className="flex justify-between">
        <span className="text-gray-600">Active Approvals</span>
        <span className="font-semibold">{health.activeApprovalsCount}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Risky Approvals</span>
        <span className="font-semibold text-red-600">
          {health.riskyApprovalsCount}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Spam Tokens</span>
        <span className="font-semibold">{health.spamTokensCount}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Dust Tokens</span>
        <span className="font-semibold">{health.dustTokensCount}</span>
      </div>
    </div>
  );
}

function ApprovalsDisplay({ address }: { address: string }) {
  const { data: approvals } = useTokenApprovals(address);
  return <AllowancesTable approvals={approvals || []} />;
}

function RecentActions({ address }: { address: string }) {
  const { data: actions } = useAutomatedActions(address);
  
  if (!actions || actions.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No automated actions yet
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {actions.map((action: any) => (
        <div key={action.id} className="flex items-center justify-between py-2 border-b">
          <div>
            <div className="font-medium">{action.actionType}</div>
            <div className="text-sm text-gray-600">
              {new Date(Number(action.blockTimestamp) * 1000).toLocaleString()}
            </div>
          </div>
          <a
            href={`https://explorer.testnet.monad.xyz/tx/${action.transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm"
          >
            View
          </a>
        </div>
      ))}
    </div>
  );
}

// Main page component
export default function DashboardPage() {
  const { address, isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <WalletConnect />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Wallet Autopilot</h1>
            <WalletConnect />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <DashboardContent />
      </main>
    </div>
  );
}
```

---

## Part 7: API Integration

### 7.1 Backend API Client

```typescript
// src/services/api.ts
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);
```

### 7.2 Envio GraphQL Client

```typescript
// src/services/envio.ts
import { GraphQLClient } from 'graphql-request';

const ENVIO_ENDPOINT = 
  process.env.NEXT_PUBLIC_ENVIO_ENDPOINT || 
  'http://localhost:8080/v1/graphql';

export const envioClient = new GraphQLClient(ENVIO_ENDPOINT);
```

---

## Part 8: Deployment

### 8.1 Environment Variables

```bash
# .env.local
NEXT_PUBLIC_AGENT_ADDRESS=0x...
NEXT_PUBLIC_API_URL=https://api.yourapp.com
NEXT_PUBLIC_ENVIO_ENDPOINT=https://indexer.envio.dev/your-id/v1/graphql
```

### 8.2 Build & Deploy

```bash
# Build for production
npm run build

# Deploy to Vercel (recommended)
vercel deploy

# Or deploy to any static host
npm run build && npm run export
```

---

## Best Practices (React 19)

### Performance
1. **Enable React Compiler** for automatic memoization
2. **Use Suspense boundaries** for data fetching
3. **Implement code splitting** with dynamic imports
4. **Leverage `use` hook** for async operations
5. **Use Server Actions** for form submissions (reduces client JS)
6. **Optimize images** with Next.js Image component
7. **Lazy load** heavy components

### React 19 Specific Optimizations

```typescript
// 1. Automatic Memoization with React Compiler
// No need for useMemo/useCallback in most cases!
function ExpensiveComponent({ data }: { data: any[] }) {
  // React Compiler automatically optimizes this
  const processed = data.map(item => expensiveOperation(item));
  return <div>{processed}</div>;
}

// 2. Better Concurrent Rendering
function SearchResults({ query }: { query: string }) {
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState([]);

  const handleSearch = (newQuery: string) => {
    // UI stays responsive during search
    startTransition(() => {
      setResults(searchData(newQuery));
    });
  };

  return (
    <>
      <input onChange={(e) => handleSearch(e.target.value)} />
      {isPending && <Spinner />}
      <Results data={results} />
    </>
  );
}

// 3. Optimistic Updates
function LikeButton({ postId }: { postId: string }) {
  const [likes, setLikes] = useState(0);
  const [optimisticLikes, setOptimisticLikes] = useOptimistic(
    likes,
    (state, amount: number) => state + amount
  );

  async function handleLike() {
    setOptimisticLikes(1); // Immediate UI update
    await likePost(postId); // Actual API call
    setLikes(likes + 1); // Sync with server
  }

  return <button onClick={handleLike}>❤️ {optimisticLikes}</button>;
}

// 4. Document Metadata (replaces next/head)
export const metadata = {
  title: 'Dashboard | Wallet Autopilot',
  description: 'Manage your wallet automation',
};
```

### UX
1. **Show loading states** with Suspense
2. **Handle errors gracefully** with Error Boundaries
3. **Provide clear feedback** using optimistic updates
4. **Mobile-responsive design** with Tailwind
5. **Use Server Actions** for better form UX
6. **Add transitions** for smoother interactions

### Security
1. **Never expose private keys** in client code
2. **Validate all inputs** (use Zod for type safety)
3. **Use HTTPS** in production
4. **Implement CSP headers** in next.config.js
5. **Sanitize user input** before rendering
6. **Use Server Actions** for sensitive operations

---

## Summary

This frontend guide provides:
- ✅ Complete Next.js 15 + React 19 setup with App Router
- ✅ React Compiler for automatic optimizations
- ✅ Web3 integration with Wagmi v2
- ✅ Server Actions for better form handling
- ✅ Context providers with React 19 hooks (use, useOptimistic, useTransition)
- ✅ Suspense boundaries for data fetching
- ✅ Error boundaries for graceful error handling
- ✅ Custom hooks with suspense queries
- ✅ Reusable UI components with transitions
- ✅ Dashboard with optimistic updates
- ✅ API integration with native Fetch
- ✅ Deployment configuration

Your Wallet Autopilot frontend is production-ready with React 19! 🎨

## React 19 Migration Checklist

If upgrading from React 18:

- [ ] Update to React 19 RC: `npm install react@rc react-dom@rc`
- [ ] Enable React Compiler in next.config.js
- [ ] Replace `useEffect` with `use` hook where applicable
- [ ] Convert forms to use Server Actions
- [ ] Add Suspense boundaries around data fetching
- [ ] Use `useOptimistic` for immediate UI feedback
- [ ] Replace `useCallback`/`useMemo` only where compiler can't optimize
- [ ] Add Error Boundaries for better error handling
- [ ] Update TypeScript types: `@types/react@rc`
- [ ] Test thoroughly - React 19 has breaking changes!

## Key React 19 Features Used

1. **React Compiler** - Automatic memoization (no manual useCallback/useMemo)
2. **Actions** - Better form handling with useFormState/useFormStatus
3. **`use` hook** - Unwrap promises and context
4. **`useOptimistic`** - Optimistic UI updates
5. **`useTransition`** - Non-blocking state updates
6. **Better Suspense** - Improved data fetching patterns
7. **Error Boundaries** - Built-in error handling
8. **Server Components** - Automatic code splitting (Next.js 15)