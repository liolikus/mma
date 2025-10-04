Technical Architecture Diagram – Wallet Autopilot
Components:

User (Wallet Owner)

MetaMask Smart Account (Monad Testnet)

Delegation Toolkit

Wallet Autopilot Agent (Backend Service)

Envio Indexer

Monad Testnet Blockchain

(Optional) Other EVM Chain (for dust consolidation into stablecoin)

                        ┌─────────────────────┐
                        │      User (UI)      │
                        │ Wallet Health Dash  │
                        └─────────┬───────────┘
                                  │
                                  ▼
                        ┌─────────────────────┐
                        │ MetaMask Smart Acc. │
                        │  (on Monad Testnet) │
                        └───────┬─────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
                ▼                               ▼
     ┌───────────────────┐           ┌─────────────────────┐
     │ Delegation Module │ <───────▶ │ Wallet Autopilot    │
     │ (Toolkit SDK)     │  Grants   │ Agent Service (BE)  │
     └───────────────────┘  Rights   └─────────────────────┘
                                         │
                                         │ Watches events
                                         ▼
                                ┌─────────────────────┐
                                │  Envio Indexer      │
                                │ (Approvals, spam,   │
                                │ dust balances, etc.)│
                                └─────────┬───────────┘
                                          │
                                          ▼
                                ┌─────────────────────┐
                                │   Monad Testnet     │
                                │  (Executes txs via  │
                                │ delegated authority)│
                                └─────────────────────┘
                                          │
                               ┌──────────┴───────────┐
                               ▼                      ▼
                 ┌───────────────────────┐  ┌───────────────────────┐
                 │   Auto-Revoke txs     │  │ Dust Consolidation txs │
                 │ Spam Cleanup Actions  │  │   (optional x-chain)   │
                 └───────────────────────┘  └───────────────────────┘



🔹 Key Flows Explained

User Setup:

User connects via MetaMask Smart Account on Monad testnet.

Grants delegation permissions to Wallet Autopilot Agent using the Delegation Toolkit.

Monitoring (Envio):

Envio continuously tracks approvals, token transfers, dust balances, and spam tokens.

Data is fed to the Wallet Autopilot Agent.

Automation (Agent):

Based on rules (revocation thresholds, dust consolidation, spam detection), the agent executes transactions on Monad on behalf of the user.

Transactions are delegated, so the agent has no full control, only scoped permissions.

Execution (Monad Testnet):

Monad executes transactions triggered by the delegated agent.

Wallet state updates → reflected back in Dashboard UI.