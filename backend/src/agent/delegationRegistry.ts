import type { Address } from 'viem';

export interface DelegationRecord {
  id: string;
  delegator: Address;
  delegate: Address;
  scope: {
    type: 'functionCall';
    targets: Address[];
    selectors: string[];
  };
  createdAt: Date;
  isActive: boolean;
}

class DelegationRegistry {
  private delegations: Map<string, DelegationRecord> = new Map();

  async register(delegation: DelegationRecord): Promise<void> {
    this.delegations.set(delegation.id, delegation);
    console.log(`Delegation registered: ${delegation.id}`);
  }

  async revoke(delegationId: string): Promise<void> {
    const delegation = this.delegations.get(delegationId);
    if (delegation) {
      delegation.isActive = false;
      console.log(`Delegation revoked: ${delegationId}`);
    }
  }

  async getActiveDelegations(delegate: Address): Promise<DelegationRecord[]> {
    return Array.from(this.delegations.values()).filter(
      (d) => d.delegate === delegate && d.isActive
    );
  }

  async getDelegationsForWallet(delegator: Address): Promise<DelegationRecord[]> {
    return Array.from(this.delegations.values()).filter(
      (d) => d.delegator === delegator
    );
  }

  async hasDelegation(delegator: Address, delegate: Address): Promise<boolean> {
    return Array.from(this.delegations.values()).some(
      (d) => d.delegator === delegator && d.delegate === delegate && d.isActive
    );
  }
}

export const delegationRegistry = new DelegationRegistry();
