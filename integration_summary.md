# Wallet Autopilot - Integration Guides

## 📚 Documentation Structure

Your project now has comprehensive integration guides for all key components with **React 19** support:

```
docs/
├── claude.md           # Main context file for Claude Code
├── Metamask.md        # Smart Accounts & Delegation integration
├── Envio.md           # HyperIndex blockchain indexer setup
├── AgentService.md    # Backend automation service guide
├── Monad.md           # Monad testnet integration
├── Frontend.md        # Next.js 15 + React 19 implementation ⭐ UPDATED
├── Testing.md         # Comprehensive testing with React 19 ⭐ UPDATED
├── PRD.md             # Product Requirements Document
└── diagram.md         # Technical Architecture Diagram
```

---

## 🎯 Quick Reference

### 1. **claude.md** - Project Overview
**Use for**: Understanding the entire project architecture and getting started

**Contains**:
- Project overview and goals
- Complete tech stack (Now with React 19!)
- Key feature implementations
- User flows and file structure
- Development setup and success criteria
- Network configuration (Monad testnet)

### 2. **Metamask.md** - Smart Accounts Integration
**Use for**: Implementing wallet features and delegation system

**Contains**:
- Creating smart accounts (Hybrid, Multisig, 7702)
- Deploying smart accounts (automatic & manual)
- Creating delegations with different scopes:
  - Function call scope (for auto-revoke)
  - Spending limit scopes (safety constraints)
  - ERC20/ERC721 transfer scopes
- Executing delegated transactions
- Frontend React hooks and components
- Backend agent setup
- Security best practices

**Key Code Examples**:
```typescript
// Create user's smart account
const smartAccount = await toMetaMaskSmartAccount({
  client: publicClient,
  implementation: Implementation.Hybrid,
  deployParams: [ownerAddress, [], [], []],
  signer: { walletClient },
});

// Grant delegation for auto-revoke
const delegation = createDelegation({
  scope: {
    type: "functionCall",
    targets: [tokenAddress],
    selectors: ["approve(address,uint256)"],
  },
  to: agentAccount,
  from: userSmartAccount,
});
```

### 3. **Envio.md** - Blockchain Indexing
**Use for**: Setting up real-time event monitoring and data indexing

**Contains**:
- Initializing indexer (contract import method)
- Configuration file (config.yaml) setup
- GraphQL schema definitions:
  - TokenApproval entity (for revocations)
  - TokenTransfer entity (spam detection)
  - WalletHealth entity (health scores)
  - TokenMetadata entity
- Event handler implementation
- Local development and deployment
- Integration with agent service
- Real-time subscriptions

**Key Components**:
```yaml
# config.yaml structure
name: WalletAutopilot
contracts:
  - name: ERC20Token
    events:
      - event: "Approval(...)"
      - event: "Transfer(...)"
networks:
  - id: 41454  # Monad Testnet
```

```graphql
# Schema entities
type TokenApproval @entity {
  owner: String!
  spender: String!
  isRisky: Boolean!
  status: ApprovalStatus!
}
```

### 4. **AgentService.md** - Automation Backend
**Use for**: Building the autonomous agent that executes actions

**Contains**:
- Complete backend service architecture
- Delegation registry (storage & management)
- Wallet monitoring service
- Rule engine (decision logic)
- Transaction executor
- REST API endpoints
- Testing strategies
- Deployment configuration

**Key Services**:
```typescript
// Main agent service
class AgentService {
  - DelegationRegistry
  - WalletMonitor
  - RuleEngine
  - TransactionExecutor
}

// Monitor checks wallets periodically
WalletMonitor → queries Envio → evaluates rules → executes actions
```

### 5. **Monad.md** - Network Integration ⭐ NEW
**Use for**: Setting up and working with Monad testnet

**Contains**:
- Network configuration and details
- Faucet usage for testnet tokens
- MetaMask setup (manual & programmatic)
- Transaction management and gas settings
- Block explorer integration
- WebSocket subscriptions
- Error handling and retry logic
- Performance optimization

### 6. **Frontend.md** - React 19 Implementation ⭐ UPDATED
**Use for**: Building modern, performant UI with latest React

**Contains**:
- **React 19 features**:
  - React Compiler (automatic optimization)
  - Server Actions (form handling)
  - `use` hook (promises & context)
  - `useOptimistic` (optimistic UI)
  - `useTransition` (non-blocking updates)
  - Better Suspense support
- Next.js 15 + App Router setup
- Web3 integration with Wagmi v2
- Context providers with React 19 hooks
- Custom hooks with suspense
- Reusable UI components
- Dashboard with error boundaries

**React 19 Key Features**:
```typescript
// Automatic optimization - no manual memoization needed!
function Component({ data }) {
  // React Compiler handles optimization
  const result = expensiveOperation(data);
  return <div>{result}</div>;
}

// Optimistic updates
const [optimisticState, setOptimisticState] = useOptimistic(
  state,
  (prev, update) => ({ ...prev, ...update })
);

// Server Actions for forms
async function updateSettings(formData: FormData) {
  'use server';
  // Server-side form handling
}
```

### 7. **Testing.md** - Comprehensive Testing ⭐ UPDATED
**Use for**: Ensuring code quality and reliability with React 19

**Contains**:
- Unit tests (components, hooks, backend)
- Integration tests (API, database, blockchain)
- E2E tests with Playwright
- **React 19 testing**:
  - Testing Server Actions
  - Testing `useOptimistic` hooks
  - Testing Suspense boundaries
  - Testing transitions
- Testnet validation checklist
- Performance and security tests
- CI/CD integration

---

## 🚀 Getting Started Workflow

### Phase 1: Setup (Day 1)
1. **Read `claude.md`** - Understand project scope
2. **Review `PRD.md`** - Understand features and goals
3. **Study `diagram.md`** - Visualize architecture
4. **Read `Monad.md`** - Set up testnet

### Phase 2: Frontend (Days 2-3) ⭐ React 19
1. **Follow `Frontend.md`** - React 19 Integration
   - Set up Next.js 15 + React 19
   - Enable React Compiler
   - Implement wallet connection
   - Create smart account UI with Suspense
   - Build delegation controls with optimistic updates
   - Use Server Actions for forms

### Phase 3: Smart Accounts (Day 3)
1. **Follow `Metamask.md` Part 5** - Frontend Integration
   - Implement wallet connection
   - Create smart account UI
   - Build delegation controls
   - Set up React hooks

### Phase 4: Indexer (Days 3-4)
1. **Follow `Envio.md` Parts 1-4** - Indexer Setup
   - Initialize indexer
   - Configure for Monad
   - Define schema
   - Implement event handlers
2. **Run locally** with `pnpm dev`
3. **Test queries** in Hasura console

### Phase 5: Backend Agent (Days 4-5)
1. **Follow `AgentService.md` Parts 1-4** - Core Service
   - Set up project structure
   - Implement delegation registry
   - Build wallet monitor
   - Create rule engine
2. **Follow Part 6** - Transaction Executor
   - Implement revoke logic
   - Add dust consolidation

### Phase 6: Integration (Day 6)
1. Connect frontend to backend API
2. Connect agent to Envio indexer
3. Test end-to-end flow:
   - User creates smart account
   - User grants delegation
   - Agent detects risky approval
   - Agent executes revocation

### Phase 7: Testing & Demo (Day 7)
1. Run tests (unit, integration, E2E)
2. Test all user flows from PRD
3. Record demo video
4. Deploy to Monad testnet
5. Prepare presentation

---

## 🆕 React 19 Highlights

### Why React 19?

1. **React Compiler** - Automatic optimization, no manual `useMemo`/`useCallback`
2. **Better UX** - Optimistic updates, smooth transitions
3. **Server Actions** - Cleaner form handling, less client JS
4. **Simpler Code** - `use` hook, better async patterns
5. **Performance** - Faster rendering, better Suspense

### Migration from React 18

```bash
# Update dependencies
npm install react@rc react-dom@rc next@latest
npm install @types/react@rc @types/react-dom@rc

# Enable React Compiler
# In next.config.js:
experimental: {
  reactCompiler: true,
}
```

### Key Differences

| React 18 | React 19 |
|----------|----------|
| Manual `useMemo`/`useCallback` | Automatic via Compiler |
| `useEffect` for async | `use` hook |
| Form libs needed | Server Actions built-in |
| Basic Suspense | Enhanced Suspense |
| No optimistic updates | `useOptimistic` hook |

---

## 🔑 Key Integration Points

### Frontend ↔ Backend (React 19)
```typescript
// Server Action (runs on server)
async function grantDelegation(formData: FormData) {
  'use server';
  // Server-side logic
}

// Component (runs on client)
function DelegationForm() {
  const [state, formAction] = useFormState(grantDelegation, null);
  const { pending } = useFormStatus();
  
  return <form action={formAction}>...</form>;
}
```

### Backend ↔ Envio
```typescript
// Query wallet health
const health = await envioClient.request(`
  query GetHealth($wallet: String!) {
    WalletHealth(where: { walletAddress: { _eq: $wallet } }) { ... }
  }
`)

// Get risky approvals
const approvals = await getRiskyApprovals(wallet)
```

### Backend ↔ Monad
```typescript
// Execute delegated transaction
const txHash = await executeDelegatedTransaction({
  smartAccount,
  delegation,
  transaction: { to, data, value }
})
```

---

## 🛠️ Development Commands

```bash
# Frontend (React 19)
cd frontend
npm install react@rc react-dom@rc  # Install React 19
npm run dev                          # Start Next.js dev server

# Envio Indexer
cd backend
pnpm install
pnpm dev          # Start local indexer + Hasura

# Agent Service
cd backend
npm install
npm run dev       # Start agent service

# Full Stack
docker-compose up  # Run everything together

# Testing (React 19 compatible)
npm test          # Unit tests
npm run test:e2e  # E2E tests with Playwright
```

---

## 📋 Checklist for Implementation

### Smart Accounts (Metamask.md)
- [ ] Configure Monad testnet
- [ ] Implement smart account creation
- [ ] Add delegation granting UI (with React 19 optimistic updates)
- [ ] Build delegation controls component (with Server Actions)
- [ ] Test smart account deployment
- [ ] Test delegation signing

### Frontend (Frontend.md - React 19) ⭐ NEW CHECKLIST
- [ ] Install React 19 RC
- [ ] Enable React Compiler
- [ ] Set up Server Actions
- [ ] Implement Suspense boundaries
- [ ] Add error boundaries
- [ ] Use `useOptimistic` for immediate feedback
- [ ] Use `useTransition` for smooth updates
- [ ] Test with React 19 testing library
- [ ] Remove unnecessary `useMemo`/`useCallback`

### Indexer (Envio.md)
- [ ] Initialize indexer with contract import
- [ ] Configure config.yaml for Monad
- [ ] Define GraphQL schema
- [ ] Implement Approval event handler
- [ ] Implement Transfer event handler
- [ ] Test queries in Hasura
- [ ] Deploy to hosted service

### Agent Service (AgentService.md)
- [ ] Set up backend project
- [ ] Implement delegation registry
- [ ] Build wallet monitor
- [ ] Create rule engine
- [ ] Implement transaction executor
- [ ] Add REST API endpoints
- [ ] Test with mock data
- [ ] Deploy agent service

### Integration
- [ ] Connect frontend to backend
- [ ] Connect agent to Envio
- [ ] Test end-to-end flow
- [ ] Add error handling
- [ ] Add logging
- [ ] Create demo video

---

## 🎓 Learning Path

If you're new to any of these technologies:

1. **React 19**: Start with Frontend.md sections 1-4
2. **Account Abstraction**: Start with MetaMask.md Part 1 & 2
3. **Blockchain Indexing**: Start with Envio.md Part 1 & 2
4. **Delegation System**: Read MetaMask.md Part 3 carefully
5. **Backend Services**: Follow AgentService.md Parts 1-3
6. **Monad Testnet**: Read Monad.md for network setup

---

## 🐛 Troubleshooting Guide

### Common Issues by Component

**React 19 (Frontend.md)**:
- Issue: React Compiler errors
- Solution: Check ESLint plugin configuration, ensure no dynamic requires

**Smart Accounts (Metamask.md)**:
- Issue: Smart account not deploying
- Solution: Check Part 2.2 - Manual deployment

**Indexer (Envio.md)**:
- Issue: Events not indexing
- Solution: Check config.yaml contract addresses

**Agent Service (AgentService.md)**:
- Issue: Delegated transactions failing
- Solution: Verify delegation permissions match actions

---

## 📞 Quick Help

**For Claude Code users**:
All files are optimized for Claude Code context. Just reference:
- `@claude.md` for general questions
- `@Frontend.md` for React 19 questions ⭐
- `@Metamask.md` for wallet integration
- `@Envio.md` for indexing questions
- `@AgentService.md` for backend logic
- `@Monad.md` for testnet questions
- `@Testing.md` for testing with React 19 ⭐

---

## 🎯 Success Criteria

Your Wallet Autopilot is complete when:

✅ User can create smart account on Monad
✅ User can grant delegation to agent
✅ Dashboard shows wallet health score (with React 19 Suspense)
✅ Agent automatically revokes risky approvals
✅ Agent consolidates dust tokens
✅ User can pause/resume autopilot (with optimistic updates)
✅ All actions are logged and visible
✅ Forms use Server Actions
✅ UI feels instant (optimistic updates)
✅ Demo video shows full flow

---

## 📚 Additional Resources

- [React 19 Release Notes](https://react.dev/blog)
- [React Compiler Docs](https://react.dev/learn/react-compiler)
- [MetaMask Delegation Toolkit](https://docs.metamask.io/delegation-toolkit/)
- [Envio Documentation](https://docs.envio.dev)
- [Monad Developer Docs](https://docs.monad.xyz)
- [Viem Documentation](https://viem.sh)
- [Next.js 15 Docs](https://nextjs.org/docs)

---

**Ready to build with React 19?** Start with `claude.md` for the big picture, then check out `Frontend.md` for the latest React 19 patterns. The future of web development is here! 🚀