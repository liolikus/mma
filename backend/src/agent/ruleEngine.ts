import type { TokenApprovalData } from '../services/envio.js';

export interface RuleResult {
  shouldExecute: boolean;
  reason: string;
  action: 'revoke' | 'cleanup' | 'consolidate';
  target: string;
}

export class RuleEngine {
  // Rule: Revoke unlimited approvals
  checkUnlimitedApproval(approval: TokenApprovalData): RuleResult | null {
    const UNLIMITED = '115792089237316195423570985008687907853269984665640564039457584007913129639935';

    if (approval.amount === UNLIMITED) {
      return {
        shouldExecute: true,
        reason: 'Unlimited approval detected',
        action: 'revoke',
        target: approval.token,
      };
    }
    return null;
  }

  // Rule: Revoke approvals older than 30 days
  checkStaleApproval(approval: TokenApprovalData, currentTime: number): RuleResult | null {
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    // TODO: Add timestamp check when available in schema
    return null;
  }

  // Rule: Check risky approvals
  checkRiskyApproval(approval: TokenApprovalData): RuleResult | null {
    if (approval.isRisky) {
      return {
        shouldExecute: true,
        reason: 'Risky approval detected',
        action: 'revoke',
        target: approval.token,
      };
    }
    return null;
  }

  // Evaluate all rules for an approval
  evaluateApproval(approval: TokenApprovalData): RuleResult | null {
    const currentTime = Date.now();

    // Check each rule in priority order
    const unlimitedResult = this.checkUnlimitedApproval(approval);
    if (unlimitedResult) return unlimitedResult;

    const riskyResult = this.checkRiskyApproval(approval);
    if (riskyResult) return riskyResult;

    const staleResult = this.checkStaleApproval(approval, currentTime);
    if (staleResult) return staleResult;

    return null;
  }

  // Evaluate all approvals for a wallet
  evaluateAllApprovals(approvals: TokenApprovalData[]): RuleResult[] {
    return approvals
      .map(approval => this.evaluateApproval(approval))
      .filter((result): result is RuleResult => result !== null);
  }
}

export const ruleEngine = new RuleEngine();
