export interface WalletHealth {
  score: number;
  riskyApprovals: number;
  spamTokens: number;
  dustTokenCount: number;
  lastUpdated: Date;
}

export interface TokenApproval {
  id: string;
  owner: string;
  spender: string;
  token: string;
  amount: string;
  timestamp: Date;
  isRisky: boolean;
  riskReason?: string;
  status: 'active' | 'revoked';
}

export interface SpamToken {
  id: string;
  address: string;
  name: string;
  symbol: string;
  balance: string;
  detectionReason: string;
  timestamp: Date;
}

export interface DustToken {
  address: string;
  name: string;
  symbol: string;
  balance: string;
  valueUsd: number;
}

export interface Delegation {
  id: string;
  delegator: string;
  delegate: string;
  scope: DelegationScope;
  createdAt: Date;
  isActive: boolean;
}

export interface DelegationScope {
  type: 'functionCall' | 'spendingLimit' | 'transfer';
  targets?: string[];
  selectors?: string[];
  limit?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  type: 'auto-revoke' | 'spam-cleanup' | 'dust-consolidation';
  conditions: Record<string, any>;
}

export interface SmartAccount {
  address: string;
  owner: string;
  implementation: 'Hybrid' | 'Multisig' | '7702';
  isDeployed: boolean;
}
