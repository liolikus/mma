import { RuleEngine } from '../src/agent/ruleEngine';
import type { TokenApprovalData } from '../src/services/envio';

describe('RuleEngine', () => {
  let ruleEngine: RuleEngine;

  beforeEach(() => {
    ruleEngine = new RuleEngine();
  });

  describe('checkUnlimitedApproval', () => {
    it('should detect unlimited approvals', () => {
      const approval: TokenApprovalData = {
        id: '1',
        owner: '0x123',
        spender: '0x456',
        token: '0x789',
        amount: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
        isRisky: true,
        status: 'ACTIVE',
      };

      const result = ruleEngine.checkUnlimitedApproval(approval);

      expect(result).not.toBeNull();
      expect(result?.shouldExecute).toBe(true);
      expect(result?.action).toBe('revoke');
      expect(result?.reason).toBe('Unlimited approval detected');
    });

    it('should not flag limited approvals', () => {
      const approval: TokenApprovalData = {
        id: '1',
        owner: '0x123',
        spender: '0x456',
        token: '0x789',
        amount: '1000000',
        isRisky: false,
        status: 'ACTIVE',
      };

      const result = ruleEngine.checkUnlimitedApproval(approval);
      expect(result).toBeNull();
    });
  });

  describe('checkRiskyApproval', () => {
    it('should detect risky approvals', () => {
      const approval: TokenApprovalData = {
        id: '1',
        owner: '0x123',
        spender: '0x456',
        token: '0x789',
        amount: '1000000',
        isRisky: true,
        status: 'ACTIVE',
      };

      const result = ruleEngine.checkRiskyApproval(approval);

      expect(result).not.toBeNull();
      expect(result?.shouldExecute).toBe(true);
      expect(result?.action).toBe('revoke');
    });
  });

  describe('evaluateAllApprovals', () => {
    it('should evaluate multiple approvals', () => {
      const approvals: TokenApprovalData[] = [
        {
          id: '1',
          owner: '0x123',
          spender: '0x456',
          token: '0x789',
          amount: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
          isRisky: true,
          status: 'ACTIVE',
        },
        {
          id: '2',
          owner: '0x123',
          spender: '0x457',
          token: '0x790',
          amount: '1000000',
          isRisky: false,
          status: 'ACTIVE',
        },
      ];

      const results = ruleEngine.evaluateAllApprovals(approvals);

      expect(results).toHaveLength(1);
      expect(results[0].action).toBe('revoke');
    });
  });
});
