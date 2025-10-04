# Wallet Autopilot - Project Context for Claude Code

## Project Overview

**Wallet Autopilot** is a wallet health management dashboard and automation system built for the Monad testnet hackathon. It allows users to monitor and automate wallet maintenance through MetaMask Smart Accounts and Delegations.

**Core Value Proposition**: "Set it and forget it" autopilot for wallet hygiene, improving security and usability.

### Key Capabilities
- **Auto-Revoke**: Automatically revokes risky or unused token allowances
- **Spam Cleanup**: Detects and removes spam tokens from wallets
- **Dust Consolidation**: Consolidates small token balances into primary assets (ETH/USDC)
- **Delegated Execution**: Agent performs actions on behalf of users via scoped permissions

## Architecture

### High-Level Component Structure

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                        │
│  - React + Next.js + Tailwind                           │
│  - Wallet Health Dashboard                              │
│  - MetaMask Smart Accounts Integration                  │
│  - Delegation Configuration Interface                   │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                   BACKEND / AGENT LAYER                  │
│  - Node.js Service                                      │
│  - Monitors wallets via Envio indexer                   │
│  - Executes delegated transactions                      │
│  - Rule engine for automation triggers                  │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│                  BLOCKCHAIN LAYER                        │
│  - Monad Testnet (primary deployment)                  │
│  - MetaMask Smart Accounts + Delegation Toolkit         │
│  - Envio Indexer (event tracking)                       │
│  - Optional: Cross-chain for stablecoin consolidation   │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Setup**: User connects MetaMask → Creates Smart Account on Monad → Grants delegation to Agent
2. **Monitoring**: Envio tracks approvals, transfers, dust balances, spam tokens
3. **Automation**: Agent evaluates rules → Executes transactions via delegated authority
4. **Execution**: Monad processes delegated transactions → Updates reflected in dashboard

## Tech Stack

### Frontend
- **Framework**: Next.js (React)
- **Styling**: Tailwind CSS
- **Wallet Integration**: MetaMask SDK + Smart Accounts
- **State Management**: React hooks / Context API (or your choice)

### Backend / Agent Service
- **Runtime**: Node.js
- **Key Libraries**:
  - `@metamask/delegation-toolkit` - For delegation management
  - `viem` or `ethers.js` - Blockchain interactions
  - Web3 provider for Monad testnet

### Blockchain & Indexing
- **Network**: Monad Testnet
  - Chain ID: 41454
  - RPC: `https://testnet.monad.xyz`
  - Explorer: `https://explorer.testnet.monad.xyz`
- **Indexer**: Envio (tracks events in real-time)
- **Account Abstraction**: MetaMask Smart Accounts with Delegation

## Critical Integration Points

### 1. MetaMask Smart Accounts

**Creating Smart Accounts**:
- Reference: https://docs.metamask.io/delegation-toolkit/guides/smart-accounts/create-smart-account
- Use `@metamask/delegation-toolkit` SDK
- Deploy on Monad testnet
- Smart Account = user's delegatable account

**Key Implementation**:
```javascript
import { createSmartAccount } from '@metamask/delegation-toolkit';

// Create smart account on Monad
const smartAccount = await createSmartAccount({
  chain: monadTestnet,
  owner: userAddress,
  // ... configuration
});
```

### 2. Delegation System

**Executing on Behalf of Users**:
- Reference: https://docs.metamask.io/delegation-toolkit/guides/delegation/execute-on-smart-accounts-behalf
- Agent needs explicit delegation permissions
- Scoped permissions (not full wallet control)
- Users can revoke anytime

**Key Implementation**:
```javascript
import { executeDelegatedTransaction } from '@metamask/delegation-toolkit';

// Agent executes transaction with delegation
await executeDelegatedTransaction({
  smartAccount: userSmartAccount,
  delegation: userDelegation,
  transaction: {
    to: tokenContract,
    data: revokeApprovalCalldata,
    // ... transaction params
  }
});
```

### 3. Monad Network Configuration

**Network Details** (from https://docs.monad.xyz/developer-essentials/network-information):
- **Chain ID**: 41454
- **RPC Endpoint**: `https://testnet.monad.xyz`
- **Block Explorer**: `https://explorer.testnet.monad.xyz`
- **Currency**: MON (native token)

**Provider Setup**:
```javascript
import { createPublicClient, http } from 'viem';

const monadTestnet = {
  id: 41454,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet.monad.xyz'] },
    public: { http: ['https://testnet.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://explorer.testnet.monad.xyz' },
  },
};
```

### 4. Envio Indexer Integration

**Purpose**: Real-time event monitoring
- Track `Approval` events (ERC20 allowances)
- Monitor token transfers (spam detection)
- Track balance changes (dust detection)
- Feed data to Agent service

**Events to Index**:
- `Approval(address indexed owner, address indexed spender, uint256 value)`
- `Transfer(address indexed from, address indexed to, uint256 value)`
- Custom spam token patterns (0 liquidity, suspicious contracts)

## Key Features Implementation Guide

### Feature 1: Dashboard (Health Score)

**Components Needed**:
- `WalletHealthDashboard.tsx` - Main dashboard view
- `AllowancesTable.tsx` - Display token approvals with risk flags
- `SpamTokensList.tsx` - Show detected spam tokens
- `DustBalances.tsx` - Display tokens < $1 value
- `HealthScore.tsx` - Visual metric (0-100)

**Health Score Calculation Logic**:
```javascript
// Pseudocode
healthScore = 100 
  - (riskyApprovals * 10)
  - (spamTokens * 5)
  - (dustTokenCount * 2)
  + (recentAutoActions * 3)
```

### Feature 2: Auto-Revoke Allowances

**Agent Logic**:
1. Query Envio for all active approvals
2. Check against risk criteria:
   - Unused for > 30 days
   - Protocol flagged as risky
   - Unlimited approval amount
3. Execute `approve(spender, 0)` via delegation

**Risk Heuristics**:
- Approval to unknown/unverified contracts
- Unlimited (`2^256 - 1`) approvals
- Approvals to contracts with no recent activity

### Feature 3: Spam Token Cleanup

**Detection Heuristics**:
- Token has 0 liquidity on DEXs
- Contract address on spam blacklist
- Received without user interaction
- Suspicious token name/symbol patterns

**Cleanup Actions**:
- Mark as spam in UI (hide from view)
- Optional: Send to burn address (`0x000...000`)
- Log action in dashboard

### Feature 4: Dust Consolidation

**Flow**:
1. Identify tokens with balance < $1
2. Check if token has DEX liquidity
3. If yes: Swap to target asset (ETH/USDC) via DEX aggregator
4. If no: Just track/hide in UI

**DEX Integration**:
- Use DEX router contracts on Monad
- May need cross-chain bridge for stablecoin consolidation
- Slippage protection essential

## User Flows

### Initial Setup Flow
```
1. User visits app → Connect MetaMask
2. App detects no Smart Account → Prompt to create one
3. User creates Smart Account on Monad testnet
4. Dashboard loads → Shows wallet state
5. User clicks "Enable Autopilot"
6. Modal explains delegation permissions
7. User grants delegation to Agent
8. Confirmation → Autopilot active
```

### Automation Trigger Flow
```
1. Envio detects new risky approval event
2. Agent receives event notification
3. Agent checks user's automation rules
4. If conditions met → Prepare revoke transaction
5. Execute via delegation (no user signature needed)
6. Transaction confirmed → Update dashboard
7. User sees notification: "Auto-revoked approval to XYZ"
```

### Emergency Stop Flow
```
1. User clicks "Pause Delegation" button
2. Frontend calls revoke delegation function
3. Transaction submitted → User signs
4. Delegation revoked on-chain
5. Agent can no longer execute on behalf
6. Dashboard shows "Autopilot Paused"
```

## File Structure (Suggested)

```
wallet-autopilot/
├── frontend/
│   ├── app/                    # Next.js app directory
│   │   ├── page.tsx           # Landing/dashboard page
│   │   ├── dashboard/         # Dashboard routes
│   │   └── layout.tsx
│   ├── components/
│   │   ├── WalletConnect.tsx
│   │   ├── HealthDashboard.tsx
│   │   ├── AllowancesTable.tsx
│   │   ├── SpamTokensList.tsx
│   │   ├── DustBalances.tsx
│   │   ├── DelegationControls.tsx
│   │   └── HealthScore.tsx
│   ├── lib/
│   │   ├── metamask.ts        # MetaMask SDK integration
│   │   ├── delegation.ts      # Delegation toolkit wrapper
│   │   ├── monad.ts          # Monad network config
│   │   └── utils.ts
│   └── hooks/
│       ├── useSmartAccount.ts
│       ├── useDelegation.ts
│       └── useWalletHealth.ts
├── backend/
│   ├── src/
│   │   ├── agent/
│   │   │   ├── index.ts       # Main agent service
│   │   │   ├── monitor.ts     # Envio event monitoring
│   │   │   ├── executor.ts    # Delegation execution
│   │   │   └── rules.ts       # Automation rule engine
│   │   ├── services/
│   │   │   ├── envio.ts       # Envio client
│   │   │   ├── revoke.ts      # Revocation logic
│   │   │   ├── spam.ts        # Spam detection
│   │   │   └── dust.ts        # Dust consolidation
│   │   └── server.ts          # API server (optional)
│   └── config/
│       └── monad.ts
├── contracts/                  # Optional: custom contracts
├── docs/
│   ├── PRD.md
│   ├── diagram.md
│   └── claude.md              # This file!
└── README.md
```

## Development Setup

### Prerequisites
- Node.js 18+
- MetaMask wallet with Monad testnet configured
- Monad testnet tokens (MON) - get from faucet

### Environment Variables

**Frontend (.env.local)**:
```env
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet.monad.xyz
NEXT_PUBLIC_MONAD_CHAIN_ID=41454
NEXT_PUBLIC_AGENT_ADDRESS=0x...  # Agent's wallet address
```

**Backend (.env)**:
```env
MONAD_RPC_URL=https://testnet.monad.xyz
AGENT_PRIVATE_KEY=0x...          # Agent's private key (secure!)
ENVIO_API_KEY=...                # If required
DATABASE_URL=...                 # Optional: for storing user preferences
```

### Installation & Running

```bash
# Frontend
cd frontend
npm install
npm run dev  # http://localhost:3000

# Backend/Agent
cd backend
npm install
npm run dev  # Starts agent service
```

## Important Implementation Notes

### Security Considerations
1. **Delegation Scope**: Agent should have minimum necessary permissions
2. **Private Key Management**: Agent's private key must be secured (use env vars, KMS in production)
3. **User Control**: Always allow instant delegation revocation
4. **Transaction Limits**: Consider adding spending limits to delegations
5. **Audit Trail**: Log all automated actions for user review

### Testing Strategy
1. **Unit Tests**: Test rule engine, risk detection, transaction builders
2. **Integration Tests**: Test delegation flow end-to-end
3. **Testnet Demo**: Deploy fully on Monad testnet
4. **User Scenarios**: Test all user flows from PRD section 6

### Performance Optimization
- Cache Envio data to reduce API calls
- Batch multiple token operations when possible
- Use efficient queries for wallet state
- Optimize dashboard re-renders

### Error Handling
- Handle failed delegated transactions gracefully
- Retry logic for transient network errors
- User-friendly error messages in dashboard
- Fallback if Envio indexer is down

## Success Criteria (from PRD)

✅ **Functional Demo**:
- Working MetaMask Smart Accounts integration
- Delegation flow functional
- Deployed on Monad testnet

✅ **Automation Impact**:
- Successfully auto-revoke risky approvals
- Consolidate 2+ dust tokens into ETH/USDC
- Detect and act on spam tokens

✅ **User Experience**:
- Intuitive dashboard
- Clear delegation visibility
- Health score improves after automation

## Resources & References

### Official Documentation
- [MetaMask Delegation Toolkit - Create Smart Account](https://docs.metamask.io/delegation-toolkit/guides/smart-accounts/create-smart-account)
- [MetaMask Delegation Toolkit - Execute on Behalf](https://docs.metamask.io/delegation-toolkit/guides/delegation/execute-on-smart-accounts-behalf)
- [Monad Network Information](https://docs.monad.xyz/developer-essentials/network-information)

### Additional Resources
- Envio Documentation: Check for Monad integration guides
- ERC20 Approval Pattern: For revoking allowances
- DEX Integration: For dust consolidation swaps

## Common Development Tasks

### Adding a New Automation Rule
1. Define rule in `backend/src/agent/rules.ts`
2. Add UI toggle in `frontend/components/DelegationControls.tsx`
3. Implement detection logic in relevant service
4. Add executor function in `backend/src/agent/executor.ts`
5. Test on testnet
6. Update dashboard to show rule status

### Debugging Delegation Issues
1. Check Smart Account deployment on Monad explorer
2. Verify delegation was granted (check contract state)
3. Ensure Agent has sufficient MON for gas
4. Review transaction revert reason on explorer
5. Check delegation permissions scope

### Adding New Dashboard Metrics
1. Define metric calculation in `frontend/lib/utils.ts`
2. Create component in `frontend/components/`
3. Fetch data from backend or on-chain
4. Integrate into main dashboard view
5. Update health score algorithm if needed

## Hackathon Demo Video Script

**Opening (0:00-0:30)**:
- Show messy wallet: many approvals, spam tokens, dust
- Health Score: 65/100 (yellow/orange)

**Setup (0:30-1:30)**:
- Connect MetaMask → Create Smart Account on Monad
- Dashboard displays wallet issues
- Enable "Wallet Autopilot" → Grant delegation

**Automation in Action (1:30-3:00)**:
- Agent detects risky approval → Auto-revokes
- Spam token detected → Cleaned up
- 2 dust tokens → Consolidated into USDC
- Health Score improves: 65 → 90 (green)

**User Control (3:00-3:30)**:
- Show delegation settings
- Demonstrate "Pause Autopilot" button
- Confirm instant revocation

**Closing (3:30-4:00)**:
- Recap benefits: security, cleanliness, automation
- Show final healthy wallet state

## Quick Start Checklist

- [ ] Set up Monad testnet in MetaMask
- [ ] Get MON tokens from faucet
- [ ] Install dependencies (frontend + backend)
- [ ] Configure environment variables
- [ ] Deploy or reference Smart Account contracts
- [ ] Set up Envio indexer for event tracking
- [ ] Test Smart Account creation flow
- [ ] Test delegation grant/revoke
- [ ] Implement core agent logic
- [ ] Build dashboard UI
- [ ] Test end-to-end automation
- [ ] Prepare demo video
- [ ] Document setup in README

## Notes for Claude Code

When working on this project:
- **Always check integration docs** before implementing MetaMask or Monad features
- **Test on Monad testnet** - don't use mainnet
- **Security first**: Be cautious with private keys and delegations
- **User control**: Never make automation mandatory; always allow opt-in/opt-out
- **Clear error messages**: Users need to understand what's happening
- **Responsive UI**: Dashboard should work on mobile

Good luck building Wallet Autopilot! 🚀