# Wallet Autopilot 🚀

**Automated wallet health management for Monad Testnet**

The Wallet Autopilot is a comprehensive wallet health management dashboard and automation system built for the Monad testnet hackathon. It allows users to monitor and automate wallet maintenance through MetaMask Smart Accounts and Delegations.

## 🎯 Core Features

- **Auto-Revoke**: Automatically revokes risky or unused token allowances
- **Spam Cleanup**: Detects and removes spam tokens from wallets
- **Dust Consolidation**: Consolidates small token balances into primary assets (ETH/USDC)
- **Delegated Execution**: Agent performs actions on behalf of users via scoped permissions
- **Health Score Dashboard**: Visual wallet health metrics and real-time monitoring

## 🏗️ Architecture

```
Frontend (Next.js 15 + React 19)
    ↓
Backend Agent Service (Node.js)
    ↓
Envio Indexer (Real-time blockchain events)
    ↓
Monad Testnet (Chain ID: 41454)
```

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 with React 19 RC
- **React 19 Features**: React Compiler, `useOptimistic`, `useTransition`, Server Actions
- **Styling**: Tailwind CSS
- **Web3**: Wagmi v2, Viem, MetaMask Delegation Toolkit
- **State**: TanStack Query (React Query)

### Backend
- **Runtime**: Node.js with TypeScript
- **Blockchain**: Viem, MetaMask Delegation Toolkit
- **Indexing**: Envio HyperIndex
- **Automation**: Node-cron for scheduled checks
- **API**: Express.js REST API

### Blockchain
- **Network**: Monad Testnet
- **Account Abstraction**: MetaMask Smart Accounts (Hybrid Implementation)
- **Indexer**: Envio for real-time event tracking

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/pnpm
- MetaMask wallet with Monad testnet configured
- Monad testnet tokens (MON) from faucet

### 1. Clone and Install

```bash
# Clone repository
git clone <your-repo-url>
cd wallet-autopilot

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 2. Configure Environment Variables

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_MONAD_RPC_URL=https://testnet.monad.xyz
NEXT_PUBLIC_MONAD_CHAIN_ID=41454
NEXT_PUBLIC_AGENT_ADDRESS=0x... # Your agent's address
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Backend** (`backend/.env`):
```env
MONAD_RPC_URL=https://testnet.monad.xyz
AGENT_PRIVATE_KEY=0x... # Your agent's private key
AGENT_ADDRESS=0x... # Your agent's address
ENVIO_API_URL=http://localhost:8080/v1/graphql
PORT=3001
```

### 3. Set Up Envio Indexer

```bash
cd backend
pnpm install envio
pnpm envio dev
```

This will start the Envio indexer locally with Hasura GraphQL API on port 8080.

### 4. Run the Application

**Terminal 1 - Backend Agent:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000` to see the app!

### 5. Using Docker (Alternative)

```bash
docker-compose up
```

## 📚 Project Structure

```
wallet-autopilot/
├── frontend/                 # Next.js 15 + React 19 app
│   ├── app/                 # Next.js app router
│   │   ├── page.tsx        # Main dashboard page
│   │   ├── layout.tsx      # Root layout with providers
│   │   └── providers.tsx   # Wagmi & React Query providers
│   ├── components/          # React components
│   │   ├── WalletConnect.tsx
│   │   ├── HealthScore.tsx
│   │   ├── DelegationControls.tsx
│   │   └── AllowancesTable.tsx
│   ├── hooks/              # Custom React hooks
│   │   ├── useSmartAccount.ts
│   │   ├── useDelegation.ts
│   │   └── useWalletHealth.ts
│   ├── lib/                # Utilities and configurations
│   │   ├── monad.ts       # Monad network config
│   │   ├── wagmi.ts       # Wagmi configuration
│   │   └── metamask.ts    # MetaMask integration
│   └── types/              # TypeScript types
│
├── backend/                 # Node.js agent service
│   ├── src/
│   │   ├── agent/          # Core agent logic
│   │   │   ├── delegationRegistry.ts
│   │   │   ├── monitor.ts
│   │   │   ├── executor.ts
│   │   │   └── ruleEngine.ts
│   │   ├── services/       # External services
│   │   │   └── envio.ts
│   │   ├── config/
│   │   │   └── monad.ts
│   │   └── index.ts        # Express server
│   ├── abis/               # Contract ABIs
│   ├── schema.graphql      # Envio GraphQL schema
│   └── envio.config.yaml   # Envio configuration
│
└── docs/                    # Documentation
    ├── claude.md           # Project context
    ├── Frontend.md         # React 19 guide
    ├── Metamask.md         # Smart Accounts guide
    ├── Envio.md            # Indexer setup
    ├── AgentService.md     # Backend guide
    ├── Monad.md            # Network guide
    └── Testing.md          # Testing guide
```

## 🔑 Key Features Implementation

### 1. Smart Account Creation

Users create a MetaMask Hybrid Smart Account on Monad testnet:

```typescript
const smartAccount = await createSmartAccount(ownerAddress);
```

### 2. Delegation Granting

Users grant scoped delegation to the agent for specific actions:

```typescript
const delegation = createDelegation({
  scope: {
    type: 'functionCall',
    targets: [tokenAddress],
    selectors: ['approve(address,uint256)'],
  },
  to: agentAccount,
  from: userSmartAccount,
});
```

### 3. Automated Monitoring

The agent monitors wallets every 5 minutes using Envio indexer data:

```typescript
// Agent checks for risky approvals
const riskyApprovals = await getRiskyApprovals(walletAddress);
const actions = ruleEngine.evaluateAllApprovals(riskyApprovals);
```

### 4. Delegated Execution

Agent executes revocations without user signatures:

```typescript
await executeDelegatedTransaction({
  smartAccount,
  delegation,
  transaction: {
    to: tokenAddress,
    data: revokeApprovalCalldata,
  },
});
```

## 🧪 Testing

### Unit Tests

```bash
# Frontend
cd frontend
npm test

# Backend
cd backend
npm test
```

### E2E Tests

```bash
cd frontend
npm run test:e2e
```

## 📊 API Endpoints

### Backend REST API (`http://localhost:3001`)

- `GET /api/wallet/:address/health` - Get wallet health score
- `GET /api/wallet/:address/approvals` - Get all approvals
- `GET /api/wallet/:address/approvals/risky` - Get risky approvals
- `POST /api/delegation/register` - Register new delegation
- `GET /api/delegation/:address` - Get delegations for wallet

### Envio GraphQL API (`http://localhost:8080/v1/graphql`)

```graphql
query GetWalletHealth($address: String!) {
  WalletHealth(where: { walletAddress: { _eq: $address } }) {
    healthScore
    riskyApprovals
    spamTokens
  }
}
```

## 🔐 Security Considerations

1. **Private Keys**: Never commit `.env` files. Agent's private key must be secured.
2. **Delegation Scope**: Agent only has permissions for approved actions.
3. **User Control**: Users can revoke delegation instantly.
4. **Audit Trail**: All automated actions are logged.

## 🌐 Monad Testnet Configuration

- **Chain ID**: 41454
- **RPC**: https://testnet.monad.xyz
- **Explorer**: https://explorer.testnet.monad.xyz
- **Faucet**: Get MON tokens from the official faucet

### Add to MetaMask

```javascript
await window.ethereum.request({
  method: 'wallet_addEthereumChain',
  params: [{
    chainId: '0xa1f6',
    chainName: 'Monad Testnet',
    rpcUrls: ['https://testnet.monad.xyz'],
    nativeCurrency: {
      name: 'Monad',
      symbol: 'MON',
      decimals: 18
    },
    blockExplorerUrls: ['https://explorer.testnet.monad.xyz']
  }]
});
```

## 🎓 Learning Resources

- [React 19 Documentation](https://react.dev)
- [MetaMask Delegation Toolkit](https://docs.metamask.io/delegation-toolkit/)
- [Envio Documentation](https://docs.envio.dev)
- [Monad Developer Docs](https://docs.monad.xyz)
- [Viem Documentation](https://viem.sh)

## 📝 Development Workflow

1. **Start Envio Indexer**: `cd backend && pnpm envio dev`
2. **Start Backend Agent**: `cd backend && npm run dev`
3. **Start Frontend**: `cd frontend && npm run dev`
4. **Connect MetaMask** to Monad testnet
5. **Create Smart Account** in the UI
6. **Grant Delegation** to enable autopilot
7. **Monitor Dashboard** for automated actions

## 🐛 Troubleshooting

### Common Issues

**React Compiler Errors**:
- Ensure React 19 RC is installed
- Check ESLint plugin configuration

**Smart Account Not Deploying**:
- Check you have MON tokens for gas
- Verify Monad RPC URL is correct

**Envio Not Indexing**:
- Check contract addresses in `envio.config.yaml`
- Verify network configuration

**Delegation Failing**:
- Ensure delegation scope matches actions
- Check agent has proper permissions

## 🤝 Contributing

This project was built for the Monad Testnet Hackathon. Contributions are welcome!

## 📄 License

MIT

## 🏆 Hackathon Success Criteria

✅ **Functional Demo**:
- Working MetaMask Smart Accounts integration
- Delegation flow functional
- Deployed on Monad testnet

✅ **Automation Impact**:
- Successfully auto-revoke risky approvals
- Detect and act on spam/dust tokens
- Health score improvement demonstrated

✅ **User Experience**:
- Intuitive React 19 dashboard with instant feedback
- Clear delegation visibility and control
- Smooth transitions and optimistic updates

---

**Built with ❤️ for Monad Testnet Hackathon** 🚀
