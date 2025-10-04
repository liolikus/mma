Product Requirements Document (PRD)

Project Name: Wallet Autopilot – Health Dashboard + Delegations
Hackathon Track: Best On-Chain Automation on Monad

1. Overview

The Wallet Autopilot is a personal wallet health management dashboard that allows users to monitor and automate wallet maintenance. Through MetaMask Smart Accounts and Delegations, users grant an agent the ability to take automated actions on their behalf, such as:

Revoking risky token allowances

Removing spam tokens

Consolidating dust tokens into a primary asset (e.g., ETH or stablecoin)

This creates a “set it and forget it” autopilot for wallet hygiene, improving security and usability for everyday crypto users.

2. Goals & Objectives

Simplify Wallet Security: Automate revocations and reduce risks from malicious allowances.

Reduce Wallet Clutter: Auto-detect and hide/remove spam tokens.

Improve Usability: Automatically consolidate dust tokens into a preferred token.

User Empowerment with Delegation: Users explicitly grant and revoke permissions, ensuring safe automation.

Deployable Demo on Monad Testnet: Showcase working integration with MetaMask Smart Accounts + Delegation.

3. Key Features
3.1 Dashboard

View wallet allowances (protocols + amounts + risks).

See spam tokens flagged by heuristics (e.g., 0 liquidity, blacklisted contract).

Identify dust balances (tokens <$1).

“Health Score” metric summarizing wallet status.

3.2 Delegated Automations

Auto-Revoke: Agent automatically revokes unused/risky approvals.

Spam Cleanup: Agent hides or burns spam tokens when detected.

Dust Consolidation: Agent swaps dust tokens into a primary token (e.g., ETH/USDC).

3.3 Controls

Users configure rules:

Thresholds for auto-revocation

Target asset for consolidation

Frequency of automation checks (daily, weekly, event-triggered)

Emergency “Pause Delegation” button

4. Architecture & Tech Stack
4.1 Core Components

Frontend (React + Next.js + Tailwind)

Wallet Health Dashboard UI

MetaMask Smart Accounts integration flow

Delegation configuration interface

Backend / Agent Service (Node.js)

Runs delegated tasks on behalf of users

Monitors wallets via Envio event indexing

Executes transactions on Monad using delegated permissions

Blockchain Layer

Monad Testnet: Primary deployment

MetaMask Smart Accounts + Delegation Toolkit: User account abstraction + delegation permissions

Optional Cross-Chain Support: Consolidation to stablecoins via another EVM chain

4.2 Data Sources

Envio (indexer) for event tracking:

Monitor token approvals, transfers, spam patterns

Detect dust and allowances in real-time

4.3 Delegation Flow (High-Level)

User connects wallet → Creates MetaMask Smart Account on Monad testnet.

User grants delegation permissions to Wallet Autopilot Agent.

Agent monitors wallet activity via Envio indexer.

When rule conditions are met (e.g., risky approval detected):

Agent executes transaction on behalf of the user via delegation.

User can revoke delegation at any time from dashboard.

5. Success Metrics

Functional Demo:

Working integration with MetaMask Smart Accounts + Delegation

Deployment on Monad testnet

Automation Impact:

Successfully revoke risky approvals automatically

Successfully consolidate at least 2 dust tokens into ETH/USDC

Detect and act on spam token events

User Experience:

Intuitive dashboard

Clear visibility of delegations and actions

6. User Flow (Demo Video Script)

User connects MetaMask → creates Smart Account on Monad testnet.

Dashboard displays:

Current approvals (with risk flags)

Spam tokens in wallet

Dust balances

Health Score = 65/100

User enables delegation to Wallet Autopilot Agent.

Agent runs in background → finds unused risky approval → auto-revokes it.

Agent consolidates two dust tokens into USDC.

Health Score improves to 90/100.

User shows ability to pause delegation instantly.

7. Risks & Mitigations

Over-automation risk: Ensure users can define thresholds and limits.

Delegation abuse: Transparent permissions + easy revoke from dashboard.

Indexing delays: Use Envio for real-time event monitoring.

8. Deliverables for Hackathon

✅ Deployed dApp on Monad testnet

✅ Demo video showing:

MetaMask Smart Accounts creation + delegation flow

Automated revocation, spam cleanup, and dust consolidation

✅ GitHub repo with frontend + backend + agent service

✅ Documentation (README + setup guide)


check Technical Architecture Diagram /home/liolik/p/mma/PRD.md