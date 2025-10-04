# Testing Guide - Wallet Autopilot

## Overview

Comprehensive testing strategy for Wallet Autopilot covering unit tests, integration tests, end-to-end tests, and testnet validation. This ensures reliability, security, and correct functionality across all components.

## Testing Pyramid

```
         /\
        /E2E\       (Few, expensive, realistic)
       /------\
      /  INT   \    (Some, moderate cost, API/DB)
     /----------\
    /    UNIT    \  (Many, fast, isolated)
   /--------------\
```

---

## Part 1: Testing Setup

### 1.1 Install Testing Dependencies

```bash
# Frontend testing (React 19)
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev @testing-library/user-event
npm install --save-dev jest-environment-jsdom
npm install --save-dev @types/react@rc @types/react-dom@rc

# Backend testing
npm install --save-dev jest ts-jest @types/jest
npm install --save-dev supertest @types/supertest

# E2E testing
npm install --save-dev @playwright/test

# Blockchain testing
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install --save-dev viem/test
```

**Important for React 19**: Ensure @testing-library/react is version 15+ for proper React 19 support.

### 1.2 Jest Configuration

```javascript
// jest.config.js (Frontend)
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
};

module.exports = createJestConfig(customJestConfig);
```

```javascript
// jest.config.js (Backend)
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

### 1.3 Test Setup Files

```typescript
// jest.setup.js (Frontend)
import '@testing-library/jest-dom';

// Mock environment variables
process.env.NEXT_PUBLIC_AGENT_ADDRESS = '0x1234567890123456789012345678901234567890';
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';

// Mock window.ethereum
global.window.ethereum = {
  request: jest.fn(),
  on: jest.fn(),
  removeListener: jest.fn(),
};
```

---

## Part 2: Unit Tests

### 2.1 Frontend Component Tests (React 19)

```typescript
// src/components/__tests__/HealthScore.test.tsx
import { render, screen } from '@testing-library/react';
import { HealthScore } from '../dashboard/HealthScore';

describe('HealthScore Component', () => {
  it('renders excellent health score', () => {
    render(<HealthScore score={90} />);
    
    expect(screen.getByText('90')).toBeInTheDocument();
    expect(screen.getByText('Excellent')).toBeInTheDocument();
  });

  it('renders poor health score', () => {
    render(<HealthScore score={30} />);
    
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('Poor')).toBeInTheDocument();
  });

  it('applies correct color for good health', () => {
    const { container } = render(<HealthScore score={75} />);
    
    const scoreElement = screen.getByText('75');
    expect(scoreElement).toHaveClass('text-yellow-600');
  });
});
```

### 2.1.1 Testing React 19 Server Actions

```typescript
// src/app/__tests__/actions.test.ts
import { updateAutomationSettings } from '../actions';

describe('Server Actions', () => {
  it('should update automation settings', async () => {
    const formData = new FormData();
    formData.append('smartAccountAddress', '0xTest');
    formData.append('autoRevoke', 'on');
    formData.append('dustConsolidation', 'on');

    const result = await updateAutomationSettings({}, formData);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Settings updated successfully');
  });

  it('should handle errors gracefully', async () => {
    const formData = new FormData();
    formData.append('smartAccountAddress', 'invalid');

    const result = await updateAutomationSettings({}, formData);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed');
  });
});
```

### 2.1.2 Testing Components with useOptimistic

```typescript
// src/components/__tests__/DelegationControls.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DelegationControls } from '../delegation/DelegationControls';
import { SmartAccountProvider } from '@/contexts/SmartAccountContext';
import { DelegationProvider } from '@/contexts/DelegationContext';

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <SmartAccountProvider>
    <DelegationProvider>
      {children}
    </DelegationProvider>
  </SmartAccountProvider>
);

describe('DelegationControls Component (React 19)', () => {
  it('shows optimistic UI update when enabling autopilot', async () => {
    render(<DelegationControls />, { wrapper: Wrapper });
    
    const enableButton = screen.getByText('Enable Autopilot');
    fireEvent.click(enableButton);
    
    // React 19: Optimistic update should be immediate
    await waitFor(() => {
      expect(screen.getByText('Autopilot Active')).toBeInTheDocument();
    }, { timeout: 100 }); // Should be very fast with optimistic update
  });

  it('handles transition state correctly', async () => {
    render(<DelegationControls />, { wrapper: Wrapper });
    
    const enableButton = screen.getByText('Enable Autopilot');
    fireEvent.click(enableButton);
    
    // Should show pending state
    expect(screen.getByText('Enabling...')).toBeInTheDocument();
  });
});
```

### 2.1.3 Testing Suspense Boundaries

```typescript
// src/components/__tests__/DashboardContent.test.tsx
import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('Dashboard with Suspense', () => {
  it('shows loading state while data is fetching', () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div>Loading...</div>}>
          <WalletHealthDisplay address="0xTest" />
        </Suspense>
      </QueryClientProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders data after suspense resolves', async () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div>Loading...</div>}>
          <WalletHealthDisplay address="0xTest" />
        </Suspense>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });
});
```

```typescript
// src/components/__tests__/DelegationControls.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DelegationControls } from '../delegation/DelegationControls';
import { SmartAccountProvider } from '@/contexts/SmartAccountContext';
import { DelegationProvider } from '@/contexts/DelegationContext';

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <SmartAccountProvider>
    <DelegationProvider>
      {children}
    </DelegationProvider>
  </SmartAccountProvider>
);

describe('DelegationControls Component', () => {
  it('shows create smart account button when no account exists', () => {
    render(<DelegationControls />, { wrapper: Wrapper });
    
    expect(screen.getByText('Create Smart Account')).toBeInTheDocument();
  });

  it('shows enable autopilot button after smart account is created', async () => {
    // Mock smart account context
    render(<DelegationControls />, { wrapper: Wrapper });
    
    // TODO: Mock smart account creation
    // Verify enable button appears
  });

  it('handles autopilot activation', async () => {
    render(<DelegationControls />, { wrapper: Wrapper });
    
    const enableButton = screen.getByText('Enable Autopilot');
    fireEvent.click(enableButton);
    
    await waitFor(() => {
      expect(screen.getByText('Enabling...')).toBeInTheDocument();
    });
  });
});
```

### 2.2 Backend Unit Tests

```typescript
// backend/tests/RuleEngine.test.ts
import { RuleEngine } from '../src/agent/RuleEngine';

describe('RuleEngine', () => {
  const ruleEngine = new RuleEngine();

  describe('shouldRevokeApproval', () => {
    it('should revoke unlimited approvals after threshold', async () => {
      const approval = {
        spender: '0xSpender',
        tokenAddress: '0xToken',
        amount: BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
        isUnlimited: true,
        blockTimestamp: BigInt(Math.floor(Date.now() / 1000) - 86400 * 31),
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
        blockTimestamp: BigInt(Math.floor(Date.now() / 1000) - 86400),
      };

      const rules = {
        revokeThresholdDays: 30,
      };

      const shouldRevoke = await ruleEngine.shouldRevokeApproval(approval, rules);
      expect(shouldRevoke).toBe(false);
    });

    it('should revoke risky protocol approvals', async () => {
      const approval = {
        spender: '0xRiskyProtocol',
        tokenAddress: '0xToken',
        amount: 1000n,
        isUnlimited: false,
        blockTimestamp: BigInt(Math.floor(Date.now() / 1000) - 86400 * 35),
      };

      const rules = {
        revokeThresholdDays: 30,
      };

      // Mock isRiskySpender to return true
      jest.spyOn(ruleEngine as any, 'isRiskySpender').mockResolvedValue(true);

      const shouldRevoke = await ruleEngine.shouldRevokeApproval(approval, rules);
      expect(shouldRevoke).toBe(true);
    });
  });

  describe('isDustToken', () => {
    it('should identify dust tokens', () => {
      const isDust = ruleEngine.isDustToken(
        100n,
        0.5,  // $0.50 USD
        1.0   // $1.00 threshold
      );
      expect(isDust).toBe(true);
    });

    it('should not identify non-dust tokens', () => {
      const isDust = ruleEngine.isDustToken(
        1000n,
        5.0,  // $5.00 USD
        1.0   // $1.00 threshold
      );
      expect(isDust).toBe(false);
    });
  });
});
```

```typescript
// backend/tests/DelegationRegistry.test.ts
import { DelegationRegistry, DelegationRecord } from '../src/agent/DelegationRegistry';
import fs from 'fs/promises';

jest.mock('fs/promises');

describe('DelegationRegistry', () => {
  let registry: DelegationRegistry;

  beforeEach(() => {
    registry = new DelegationRegistry();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new delegation', async () => {
      const record: DelegationRecord = {
        id: 'test-1',
        userAddress: '0xUser',
        smartAccountAddress: '0xSmartAccount',
        delegation: {},
        permissions: {
          canRevokeApprovals: true,
          canConsolidateDust: true,
          canRemoveSpam: true,
          tokenAddresses: [],
        },
        rules: {
          autoRevokeEnabled: true,
          revokeThresholdDays: 30,
          dustConsolidationEnabled: true,
          dustThresholdUSD: 1,
          spamRemovalEnabled: true,
        },
        createdAt: new Date(),
        lastActiveAt: new Date(),
        status: 'active',
      };

      await registry.register(record);
      
      const retrieved = registry.get('0xSmartAccount');
      expect(retrieved).toBeDefined();
      expect(retrieved?.userAddress).toBe('0xUser');
    });
  });

  describe('getActive', () => {
    it('should return only active delegations', async () => {
      const active: DelegationRecord = {
        id: 'active-1',
        smartAccountAddress: '0xActive',
        status: 'active',
        // ... other fields
      } as DelegationRecord;

      const paused: DelegationRecord = {
        id: 'paused-1',
        smartAccountAddress: '0xPaused',
        status: 'paused',
        // ... other fields
      } as DelegationRecord;

      await registry.register(active);
      await registry.register(paused);

      const activeDelegations = registry.getActive();
      expect(activeDelegations).toHaveLength(1);
      expect(activeDelegations[0].status).toBe('active');
    });
  });
});
```

### 2.3 Smart Contract Tests

```typescript
// contracts/test/SmartAccount.test.ts
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('SmartAccount', () => {
  let smartAccount: any;
  let owner: any;
  let delegate: any;

  beforeEach(async () => {
    [owner, delegate] = await ethers.getSigners();
    
    const SmartAccount = await ethers.getContractFactory('HybridAccount');
    smartAccount = await SmartAccount.deploy(
      owner.address,
      [], [], [] // No passkeys initially
    );
  });

  describe('Deployment', () => {
    it('should set the correct owner', async () => {
      const accountOwner = await smartAccount.owner();
      expect(accountOwner).to.equal(owner.address);
    });
  });

  describe('Delegation', () => {
    it('should allow owner to create delegation', async () => {
      // Create delegation
      const tx = await smartAccount.connect(owner).createDelegation(
        delegate.address,
        [] // Caveats
      );
      
      await tx.wait();
      
      // Verify delegation exists
      const hasDelegation = await smartAccount.hasDelegation(delegate.address);
      expect(hasDelegation).to.be.true;
    });

    it('should not allow non-owner to create delegation', async () => {
      await expect(
        smartAccount.connect(delegate).createDelegation(
          delegate.address,
          []
        )
      ).to.be.revertedWith('Not authorized');
    });
  });
});
```

---

## Part 3: Integration Tests

### 3.1 API Integration Tests

```typescript
// backend/tests/integration/api.test.ts
import request from 'supertest';
import app from '../../src/index';
import { DelegationRegistry } from '../../src/agent/DelegationRegistry';

describe('API Integration Tests', () => {
  let server: any;

  beforeAll(() => {
    server = app.listen(0); // Random port
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('POST /api/delegations', () => {
    it('should register a new delegation', async () => {
      const delegation = {
        userAddress: '0xUser',
        smartAccountAddress: '0xSmartAccount',
        delegation: { signature: '0x...' },
        rules: {
          autoRevokeEnabled: true,
          revokeThresholdDays: 30,
        },
      };

      const response = await request(server)
        .post('/api/delegations')
        .send(delegation)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.delegation).toBeDefined();
    });

    it('should reject invalid delegation', async () => {
      const invalidDelegation = {
        userAddress: 'invalid',
      };

      await request(server)
        .post('/api/delegations')
        .send(invalidDelegation)
        .expect(400);
    });
  });

  describe('GET /api/delegations/:address', () => {
    it('should return delegation for valid address', async () => {
      // First create a delegation
      const delegation = {
        userAddress: '0xUser',
        smartAccountAddress: '0xSmartAccount123',
        delegation: {},
        rules: {},
      };

      await request(server)
        .post('/api/delegations')
        .send(delegation);

      // Then retrieve it
      const response = await request(server)
        .get('/api/delegations/0xSmartAccount123')
        .expect(200);

      expect(response.body.delegation).toBeDefined();
      expect(response.body.delegation.smartAccountAddress).toBe('0xSmartAccount123');
    });

    it('should return 404 for non-existent delegation', async () => {
      await request(server)
        .get('/api/delegations/0xNonExistent')
        .expect(404);
    });
  });

  describe('POST /api/delegations/:address/pause', () => {
    it('should pause active delegation', async () => {
      // Setup: Create active delegation
      const delegation = {
        userAddress: '0xUser',
        smartAccountAddress: '0xSmartAccountPause',
        delegation: {},
        rules: {},
      };

      await request(server).post('/api/delegations').send(delegation);

      // Pause it
      const response = await request(server)
        .post('/api/delegations/0xSmartAccountPause/pause')
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify status changed
      const getResponse = await request(server)
        .get('/api/delegations/0xSmartAccountPause');

      expect(getResponse.body.delegation.status).toBe('paused');
    });
  });
});
```

### 3.2 Database Integration Tests

```typescript
// backend/tests/integration/database.test.ts
import { envioClient } from '../../src/services/envio';

describe('Envio Database Integration', () => {
  it('should query wallet health', async () => {
    const query = `
      query GetHealth($wallet: String!) {
        WalletHealth(where: { walletAddress: { _eq: $wallet } }) {
          healthScore
          activeApprovalsCount
        }
      }
    `;

    const result = await envioClient.request(query, {
      wallet: '0xTestWallet',
    });

    expect(result).toBeDefined();
    expect(result.WalletHealth).toBeInstanceOf(Array);
  });

  it('should query token approvals', async () => {
    const query = `
      query GetApprovals($wallet: String!) {
        TokenApproval(
          where: { 
            owner: { _eq: $wallet },
            status: { _eq: "ACTIVE" }
          }
        ) {
          id
          spender
          isRisky
        }
      }
    `;

    const result = await envioClient.request(query, {
      wallet: '0xTestWallet',
    });

    expect(result.TokenApproval).toBeInstanceOf(Array);
  });
});
```

### 3.3 Blockchain Integration Tests

```typescript
// tests/integration/blockchain.test.ts
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monadTestnet } from '../../src/lib/monad';

describe('Monad Blockchain Integration', () => {
  let publicClient: any;
  let walletClient: any;
  let testAccount: any;

  beforeAll(() => {
    publicClient = createPublicClient({
      chain: monadTestnet,
      transport: http(),
    });

    testAccount = privateKeyToAccount(process.env.TEST_PRIVATE_KEY!);
    
    walletClient = createWalletClient({
      account: testAccount,
      chain: monadTestnet,
      transport: http(),
    });
  });

  it('should connect to Monad testnet', async () => {
    const blockNumber = await publicClient.getBlockNumber();
    expect(blockNumber).toBeGreaterThan(0n);
  });

  it('should get account balance', async () => {
    const balance = await publicClient.getBalance({
      address: testAccount.address,
    });
    
    expect(balance).toBeGreaterThanOrEqual(0n);
  });

  it('should submit transaction', async () => {
    const hash = await walletClient.sendTransaction({
      to: '0x1234567890123456789012345678901234567890',
      value: 1n, // 1 wei
    });

    expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    expect(receipt.status).toBe('success');
  });
});
```

---

## Part 4: End-to-End Tests

### 4.1 Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 4.2 E2E Test Scenarios

```typescript
// e2e/wallet-autopilot.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Wallet Autopilot E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display landing page', async ({ page }) => {
    await expect(page.getByText('Wallet Autopilot')).toBeVisible();
    await expect(page.getByText('Automate Your Wallet Health')).toBeVisible();
  });

  test('should navigate to dashboard', async ({ page }) => {
    await page.click('text=Open Dashboard');
    await expect(page).toHaveURL('/dashboard');
  });

  test('complete user flow: connect wallet → create smart account → enable autopilot', async ({ page, context }) => {
    // Mock MetaMask
    await context.addInitScript(() => {
      (window as any).ethereum = {
        request: async ({ method }: any) => {
          if (method === 'eth_requestAccounts') {
            return ['0x1234567890123456789012345678901234567890'];
          }
          if (method === 'eth_chainId') {
            return '0xa1f6'; // Monad testnet
          }
          return null;
        },
        on: () => {},
        removeListener: () => {},
      };
    });

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Connect wallet
    await page.click('text=Connect Wallet');
    await expect(page.getByText('0x1234...7890')).toBeVisible();

    // Create smart account
    await page.click('text=Create Smart Account');
    await expect(page.getByText('Creating...')).toBeVisible();
    
    // Wait for smart account creation
    await page.waitForSelector('text=Enable Autopilot', { timeout: 10000 });

    // Enable autopilot
    await page.click('text=Enable Autopilot');
    await expect(page.getByText('Autopilot Active')).toBeVisible();

    // Verify delegation is active
    await expect(page.getByText('Pause Autopilot')).toBeVisible();
  });

  test('should display wallet health metrics', async ({ page }) => {
    // Mock wallet connection
    await page.goto('/dashboard');
    
    // Check for health score
    await expect(page.getByText(/\d+/)).toBeVisible(); // Score number
    
    // Check for metric cards
    await expect(page.getByText('Active Approvals')).toBeVisible();
    await expect(page.getByText('Risky Approvals')).toBeVisible();
  });

  test('should display token approvals table', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for table headers
    await expect(page.getByText('Token')).toBeVisible();
    await expect(page.getByText('Spender')).toBeVisible();
    await expect(page.getByText('Amount')).toBeVisible();
  });

  test('should allow pausing autopilot', async ({ page }) => {
    // Assuming autopilot is active
    await page.goto('/dashboard');
    
    await page.click('text=Pause Autopilot');
    await expect(page.getByText('Enable Autopilot')).toBeVisible();
  });
});
```

---

## Part 5: Test Coverage

### 5.1 Coverage Configuration

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:all": "npm run test:coverage && npm run test:e2e"
  }
}
```

### 5.2 Coverage Thresholds

```javascript
// jest.config.js
module.exports = {
  // ... other config
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    './src/agent/': {
      branches: 80,
      functions: 80,
      lines: 80,
    },
    './src/lib/': {
      branches: 75,
      functions: 75,
      lines: 75,
    },
  },
};
```

---

## Part 6: Testnet Testing Checklist

### 6.1 Manual Testing Scenarios

**Scenario 1: First-Time User Flow**
- [ ] User lands on homepage
- [ ] User clicks "Open Dashboard"
- [ ] User connects MetaMask
- [ ] User switches to Monad testnet
- [ ] User creates smart account
- [ ] Smart account address displayed
- [ ] User enables autopilot
- [ ] Delegation signed successfully
- [ ] "Autopilot Active" status shown

**Scenario 2: Approval Revocation**
- [ ] User has risky approval in wallet
- [ ] Approval appears in dashboard table
- [ ] Marked as "Risky" in UI
- [ ] Agent detects risky approval
- [ ] Agent revokes approval automatically
- [ ] Transaction appears in "Recent Actions"
- [ ] Health score improves
- [ ] Approval removed from table

**Scenario 3: Dust Consolidation**
- [ ] User has dust tokens (<$1)
- [ ] Dust tokens listed in dashboard
- [ ] Agent detects dust tokens
- [ ] Agent swaps dust to USDC
- [ ] Transaction confirmed on-chain
- [ ] Action logged in dashboard
- [ ] Wallet balance updated

**Scenario 4: Spam Token Detection**
- [ ] User receives spam token
- [ ] Spam token flagged in UI
- [ ] Agent detects spam pattern
- [ ] Agent removes spam token
- [ ] Action logged
- [ ] Spam count decreases

**Scenario 5: Emergency Stop**
- [ ] User clicks "Pause Autopilot"
- [ ] Delegation paused immediately
- [ ] Agent stops monitoring wallet
- [ ] User can resume autopilot
- [ ] All settings preserved

### 6.2 Automated Testnet Tests

```typescript
// tests/testnet/integration.test.ts
import { test, expect } from '@jest/globals';
import { setupTestAccount, waitForBalance } from './helpers';

test.describe('Testnet Integration Tests', () => {
  let userAddress: string;
  let smartAccountAddress: string;

  test.beforeAll(async () => {
    userAddress = await setupTestAccount();
  });

  test('should create smart account on Monad', async () => {
    // Create smart account
    smartAccountAddress = await createSmartAccountOnMonad(userAddress);
    
    expect(smartAccountAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  test('should grant delegation to agent', async () => {
    const delegation = await grantDelegation(smartAccountAddress);
    
    expect(delegation.signature).toBeDefined();
  });

  test('should detect and revoke risky approval', async () => {
    // Setup: Create risky approval
    await createRiskyApproval(smartAccountAddress);
    
    // Wait for agent to process
    await new Promise(resolve => setTimeout(resolve, 60000)); // 1 min
    
    // Verify approval was revoked
    const approvals = await getActiveApprovals(smartAccountAddress);
    expect(approvals.length).toBe(0);
  });
});
```

---

## Part 7: Performance Testing

### 7.1 Load Testing

```typescript
// tests/performance/load.test.ts
import { test } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('dashboard should load within 2 seconds', async ({ page }) => {
    const start = Date.now();
    
    await page.goto('/dashboard');
    await page.waitForSelector('text=Wallet Health');
    
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(2000);
  });

  test('should handle 100 concurrent API requests', async () => {
    const requests = Array.from({ length: 100 }, (_, i) =>
      fetch(`http://localhost:3001/api/delegations/0xTest${i}`)
    );

    const start = Date.now();
    const responses = await Promise.all(requests);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(5000); // All requests in 5s
    expect(responses.every(r => r.ok || r.status === 404)).toBe(true);
  });
});
```

---

## Part 8: Security Testing

### 8.1 Security Test Cases

```typescript
// tests/security/vulnerabilities.test.ts
describe('Security Tests', () => {
  test('should reject invalid signatures', async () => {
    const invalidDelegation = {
      signature: '0xinvalid',
      // ... other fields
    };

    await expect(
      apiClient.post('/delegations', invalidDelegation)
    ).rejects.toThrow();
  });

  test('should prevent unauthorized delegation revocation', async () => {
    const otherUserAddress = '0xOtherUser';
    
    await expect(
      apiClient.delete(`/delegations/${otherUserAddress}`)
    ).rejects.toThrow('Unauthorized');
  });

  test('should sanitize user inputs', async () => {
    const maliciousInput = {
      userAddress: '<script>alert("xss")</script>',
    };

    const response = await apiClient.post('/delegations', maliciousInput);
    
    expect(response.data.userAddress).not.toContain('<script>');
  });

  test('should enforce gas limits', async () => {
    // Attempt transaction with excessive gas
    await expect(
      submitTransaction({
        gas: 10_000_000n, // Way too high
      })
    ).rejects.toThrow('Gas limit exceeded');
  });
});
```

---

## Part 9: CI/CD Integration

### 9.1 GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run integration tests
        run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
```

---

## Best Practices

### Testing Strategy
1. **Write tests first** (TDD approach)
2. **Test behavior, not implementation**
3. **Keep tests isolated** and independent
4. **Use descriptive test names**
5. **Mock external dependencies**

### Test Organization
1. **Group related tests** in describe blocks
2. **Use beforeEach/afterEach** for setup/cleanup
3. **Separate unit/integration/e2e** tests
4. **Keep test files close** to source files

### Performance
1. **Run unit tests frequently** (they're fast)
2. **Run integration tests** before commits
3. **Run E2E tests** before deployment
4. **Parallelize** when possible

---

## Summary

This testing guide provides:
- ✅ Complete testing setup (Jest, Playwright)
- ✅ Unit tests for components and logic
- ✅ Integration tests for APIs and DB
- ✅ E2E tests for user flows
- ✅ Testnet validation checklist
- ✅ Performance and security tests
- ✅ CI/CD integration

Comprehensive testing ensures Wallet Autopilot works reliably! 🧪