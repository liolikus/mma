'use client';

import { useState, useOptimistic, useTransition } from 'react';
import { grantDelegation } from '@/lib/metamask';
import type { Delegation, DelegationScope } from '@/types';
import type { Address } from 'viem';

export function useDelegation() {
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [optimisticDelegations, setOptimisticDelegations] = useOptimistic(
    delegations,
    (state, newDelegation: Delegation) => [...state, newDelegation]
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const grant = async (
    smartAccountAddress: Address,
    agentAddress: Address,
    scope: DelegationScope
  ) => {
    const tempDelegation: Delegation = {
      id: `temp-${Date.now()}`,
      delegator: smartAccountAddress,
      delegate: agentAddress,
      scope,
      createdAt: new Date(),
      isActive: true,
    };

    // Optimistic update
    setOptimisticDelegations(tempDelegation);

    startTransition(async () => {
      try {
        setError(null);
        const delegation = await grantDelegation(smartAccountAddress, agentAddress, {
          type: 'functionCall',
          targets: scope.targets || [],
          selectors: scope.selectors || [],
        });

        // Replace temp with real delegation
        setDelegations(prev => [
          ...prev.filter(d => d.id !== tempDelegation.id),
          {
            ...tempDelegation,
            id: `${smartAccountAddress}-${agentAddress}-${Date.now()}`,
          },
        ]);
      } catch (err) {
        // Revert optimistic update on error
        setDelegations(prev => prev.filter(d => d.id !== tempDelegation.id));
        setError(err instanceof Error ? err.message : 'Failed to grant delegation');
      }
    });
  };

  const revoke = async (delegationId: string) => {
    startTransition(async () => {
      try {
        setError(null);
        // TODO: Implement revocation
        setDelegations(prev => prev.filter(d => d.id !== delegationId));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to revoke delegation');
      }
    });
  };

  return {
    delegations: optimisticDelegations,
    grant,
    revoke,
    isPending,
    error,
  };
}
