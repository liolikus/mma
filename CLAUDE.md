# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Always document any modified patterns or snippets after making changes.
See `/docs` folder for comprehensive guides:
- `AgentService.md` - Backend architecture and implementation
- `Envio.md` - Indexer setup and schema design
- `Frontend.md` - React 19 patterns and components
- `Metamask.md` - Smart Accounts and delegation integration
- `Monad.md` - Network configuration and deployment
- `claude.md` - Original project context (more detailed than this file)

## Project Overview

**Wallet Autopilot** is a wallet health management dashboard and automation system for Monad testnet that uses MetaMask Smart Accounts with Delegations to automatically manage wallet hygiene. The agent performs maintenance tasks (revoking risky approvals, cleaning spam tokens, consolidating dust) on behalf of users through scoped delegations.


## Architecture

This is a **monorepo** with three main components:

```
Frontend (Next.js 15 + React 19) ← REST API → Backend Agent (Node.js) ← GraphQL → Envio Indexer ← Events → Monad Testnet
```

### Data Flow
1. User connects wallet → creates Smart Account on Monad → grants delegation to agent
2. Envio indexes blockchain events (Approval, Transfer) in real-time
3. Agent monitors wallets every 5 minutes via Envio GraphQL API
4. Rule engine evaluates conditions → executor performs delegated transactions
5. Frontend displays health metrics and automation history

## Tech Stack

**Frontend**: Next.js 15, React 19, Wagmi v2, Viem, MetaMask Delegation Toolkit, TanStack Query, Tailwind CSS

**Backend**: Node.js (ESM), Express, TypeScript, Viem, MetaMask Delegation Toolkit, graphql-request, node-cron, winston

**Blockchain**: Monad Testnet (Chain ID: 41454), Envio HyperIndex for event tracking

## Documentation

See `/docs` folder for comprehensive guides:
- `AgentService.md` - Backend architecture and implementation
- `Envio.md` - Indexer setup and schema design
- `Frontend.md` - React 19 patterns and components
- `Metamask.md` - Smart Accounts and delegation integration
- `Monad.md` - Network configuration and deployment
- `claude.md` - Original project context (more detailed than this file)

**Testing**: Jest (unit), Playwright (E2E), React Testing Library

## Development Commands

### Frontend
```bash
cd frontend
npm install
npm run dev        # Start Next.js dev server on http://localhost:3000
npm run build      # Production build
npm test           # Run Jest unit tests
npm run test:e2e   # Run Playwright E2E tests
npm run lint       # ESLint
```

### Backend
```bash
cd backend
npm install
npm run dev        # Start agent service with tsx watch on port 3001
npm run build      # Compile TypeScript
npm start          # Run compiled JS
npm test           # Run Jest tests
pnpm envio dev     # Start local Envio indexer (requires pnpm)
```

### Full Stack
```bash
# Terminal 1: Envio indexer (required first)
cd backend && pnpm envio dev

# Terminal 2: Backend agent
cd backend && npm run dev

# Terminal 3: Frontend
cd frontend && npm run dev
```

### Docker
```bash
docker-compose up  # Run entire stack
```

## Project Structure

```
/frontend/
  app/              # Next.js App Router pages
    page.tsx        # Main dashboard
    layout.tsx      # Root layout with providers
    providers.tsx   # Wagmi & React Query setup
  components/       # React components (WalletConnect, HealthScore, DelegationControls, AllowancesTable)
  hooks/            # Custom hooks (useSmartAccount, useDelegation, useWalletHealth)
  lib/              # Utils (monad config, wagmi config)
  types/            # TypeScript types
  __tests__/        # Jest tests
  e2e/              # Playwright tests

/backend/
  src/
    agent/          # Core agent logic
      delegationRegistry.ts  # Delegation storage
      monitor.ts             # Cron-based wallet monitoring (every 5 min)
      executor.ts            # Delegated transaction execution
      ruleEngine.ts          # Risk evaluation rules
    services/
      envio.ts      # GraphQL client for Envio queries
    config/
      monad.ts      # Monad testnet provider setup
    handlers/
      erc20Handler.ts  # Envio event handler
    index.ts        # Express REST API server
  abis/             # Contract ABIs (ERC20.json)
  tests/            # Jest tests
  config.yaml       # Envio indexer configuration
  generated/        # Envio auto-generated code

/docs/              # Comprehensive integration guides
  AgentService.md   # Backend architecture
  Envio.md          # Indexer setup
  Frontend.md       # React 19 patterns
  Metamask.md       # Smart Accounts & Delegations
  Monad.md          # Network configuration
```

## Key Implementation Details

### Monad Testnet Configuration
- **Chain ID**: 10143 (NOT 41454!)
- **RPC**: https://testnet-rpc.monad.xyz
- **HyperSync** (for Envio indexing): https://monad-testnet.hypersync.xyz
- **Explorer**: https://explorer.testnet.monad.xyz
- **Native Token**: MON
- Get testnet MON from official faucet

### MetaMask Smart Accounts & Delegations
The project uses MetaMask's Delegation Toolkit (`@metamask/delegation-toolkit`) for:
- Creating Hybrid Smart Accounts on Monad
- Granting scoped delegations to the agent (function-level permissions)
- Executing delegated transactions without user signatures

**Key files**:
- `frontend/hooks/useSmartAccount.ts` - Smart account creation
- `frontend/hooks/useDelegation.ts` - Delegation management with React 19 `useOptimistic`
- `backend/src/agent/executor.ts` - Executes transactions via delegation

### Envio Indexer Integration
Envio tracks ERC20 events in real-time:
- **Config**: `backend/config.yaml` - Defines contracts, events, network (Chain ID: 10143, HyperSync URL)
- **Handler**: `backend/src/EventHandlers.js` - Processes Approval/Transfer events
- **Service**: `backend/src/services/envio.ts` - GraphQL queries to fetch approvals
- **GraphQL API**: Runs locally on `http://localhost:8080/v1/graphql` when using `pnpm envio dev`

**Key entities tracked**:
- `TokenApproval` - Tracks approvals with risk flags
- `TokenTransfer` - Monitors transfers for spam detection
- `WalletHealth` - Aggregated health metrics

**Event Handler Structure** (IMPORTANT):
Event objects use nested fields:
- `event.block.number` (NOT `event.blockNumber`)
- `event.block.timestamp` (NOT `event.timestamp`)
- `event.transaction.hash` (NOT `event.transactionHash`)
- `event.params` - Event-specific parameters
- `event.srcAddress` - Contract address

### Agent Monitoring & Execution
The agent runs autonomously:
1. **Monitor** (`backend/src/agent/monitor.ts`): Cron job checks all delegated wallets every 5 minutes
2. **Rule Engine** (`backend/src/agent/ruleEngine.ts`): Evaluates approvals for risks (unlimited approvals, risky contracts)
3. **Executor** (`backend/src/agent/executor.ts`): Performs revocations via delegated transactions

**Automation rules**:
- Revoke unlimited approvals (`2^256-1`)
- Revoke approvals marked as risky by heuristics
- Future: Revoke stale approvals (>30 days)

### React 19 Features Used
The frontend leverages React 19 RC:
- **React Compiler**: Automatic optimization (no manual `useMemo`/`useCallback` needed)
- **`useOptimistic`**: Instant UI feedback for delegation grants/revokes
- **`useTransition`**: Non-blocking state updates
- **Suspense**: Loading states for async data

### REST API Endpoints
Backend exposes Express API on port 3001:
- `GET /api/wallet/:address/health` - Get wallet health score
- `GET /api/wallet/:address/approvals` - Get all approvals
- `GET /api/wallet/:address/approvals/risky` - Get risky approvals
- `POST /api/delegation/register` - Register new delegation
- `GET /api/delegation/:address` - Get delegations for wallet

## Environment Variables

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_MONAD_CHAIN_ID=10143
NEXT_PUBLIC_AGENT_ADDRESS=0x...  # Agent's address
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Backend (`backend/.env`)
```env
# Monad Network
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
AGENT_PRIVATE_KEY=0x...  # Agent's private key (keep secure!)
AGENT_ADDRESS=0x...      # Agent's address

# Envio Configuration
ENVIO_API_TOKEN=your-api-token-here  # Get from https://envio.dev/app/api-tokens
ENVIO_API_URL=http://localhost:8080/v1/graphql

# Server
PORT=3001
```

## Testing Strategy

### Unit Tests
```bash
# Frontend components and hooks
cd frontend && npm test

# Backend rule engine and services
cd backend && npm test
```

### E2E Tests
```bash
# Full user flows with Playwright
cd frontend && npm run test:e2e
```

### Manual Testing on Monad Testnet
1. Get MON tokens from faucet
2. Run full stack (Envio + Backend + Frontend)
3. Create Smart Account in UI
4. Grant delegation to agent
5. Create test token approval
6. Wait 5 minutes for agent to detect and revoke

## Important Notes for Development

### Security Considerations
- **Agent private key**: Never commit `.env` files. Use secure key management in production.
- **Delegation scope**: Agent only has permissions for approved actions (currently ERC20 approvals).
- **User control**: Users can revoke delegation instantly via UI.
- **Audit trail**: All automated actions are logged.

### Common Issues & Solutions

**Smart Account not deploying:**
- Ensure user has MON tokens for gas
- Check Monad RPC is accessible
- Verify MetaMask Delegation Toolkit version compatibility

**Envio not indexing events:**
- Verify contract addresses in `backend/config.yaml` match deployed tokens
- Check RPC URL in config matches Monad testnet
- Ensure `pnpm envio dev` is running before agent starts

**Agent not executing revocations:**
- Verify delegation was granted on-chain (check explorer)
- Ensure agent has MON for gas fees
- Check delegation scope matches the action (ERC20 approve function)
- Review agent logs for errors

**React 19 errors:**
- Ensure `react@^19.2.0` and `react-dom@^19.2.0` are installed
- Check Next.js version is `^15.0.0`
- Verify TypeScript types are `@types/react@^19.2.0`

### Adding New Automation Rules

To add a new rule (e.g., "revoke approvals older than 30 days"):

1. Add rule logic in `backend/src/agent/ruleEngine.ts`:
   ```typescript
   checkStaleApproval(approval: TokenApprovalData, currentTime: number): RuleResult | null {
     const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
     if (currentTime - approval.timestamp > THIRTY_DAYS) {
       return {
         shouldExecute: true,
         reason: 'Approval older than 30 days',
         action: 'revoke',
         target: approval.token,
       };
     }
     return null;
   }
   ```

2. Add to evaluation chain in `evaluateApproval()` method

3. Update Envio schema if new data fields needed

4. Add UI toggle in `frontend/components/DelegationControls.tsx`

5. Test on testnet

### Debugging Tips

**Check agent is monitoring:**
```bash
# Look for "Checking all wallets..." logs every 5 minutes
cd backend && npm run dev
```

**Query Envio directly:**
Visit `http://localhost:8080` for Hasura console, run GraphQL queries manually

**Check transaction on Monad:**
Copy tx hash from logs, search on https://explorer.testnet.monad.xyz

**Verify delegation on-chain:**
Check Smart Account contract state on explorer for delegation registry

## Additional Resources

- **MetaMask Delegation Toolkit**: https://docs.metamask.io/delegation-toolkit/
- **Monad Developer Docs**: https://docs.monad.xyz/
- **Envio Documentation**: https://docs.envio.dev/
- **Viem Documentation**: https://viem.sh/
- **React 19 Docs**: https://react.dev/

## Documentation

See `/docs` folder for comprehensive guides:
- `AgentService.md` - Backend architecture and implementation
- `Envio.md` - Indexer setup and schema design
- `Frontend.md` - React 19 patterns and components
- `Metamask.md` - Smart Accounts and delegation integration
- `Monad.md` - Network configuration and deployment
- `claude.md` - Original project context (more detailed than this file)