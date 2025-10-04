'use client';

import { useState } from 'react';
import { useDelegation } from '@/hooks/useDelegation';
import type { Address } from 'viem';

interface Props {
  smartAccountAddress: Address;
  agentAddress: Address;
}

export function DelegationControls({ smartAccountAddress, agentAddress }: Props) {
  const { delegations, grant, revoke, isPending, error } = useDelegation();
  const [selectedTokens, setSelectedTokens] = useState<Address[]>([]);

  const handleGrantDelegation = async () => {
    await grant(smartAccountAddress, agentAddress, {
      type: 'functionCall',
      targets: selectedTokens,
      selectors: ['0x095ea7b3'], // approve(address,uint256)
    });
  };

  return (
    <div className="space-y-4">
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Delegation Controls</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2">
              Grant Auto-Revoke Permission
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              Allow the agent to automatically revoke risky token approvals
            </p>
            <button
              onClick={handleGrantDelegation}
              disabled={isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Granting...' : 'Enable Autopilot'}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {delegations.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Active Delegations</h4>
              <div className="space-y-2">
                {delegations.map((delegation) => (
                  <div
                    key={delegation.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded"
                  >
                    <div>
                      <p className="text-sm">
                        Delegate: {delegation.delegate.slice(0, 8)}...
                      </p>
                      <p className="text-xs text-gray-500">
                        {delegation.scope.type}
                      </p>
                    </div>
                    <button
                      onClick={() => revoke(delegation.id)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
