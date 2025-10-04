'use client';

import { useState, useTransition } from 'react';
import { useAccount } from 'wagmi';
import { createSmartAccount, checkSmartAccountDeployment } from '@/lib/metamask';
import type { SmartAccount } from '@/types';

export function useSmartAccount() {
  const { address } = useAccount();
  const [smartAccount, setSmartAccount] = useState<SmartAccount | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const createAccount = async () => {
    if (!address) {
      setError('No wallet connected');
      return;
    }

    startTransition(async () => {
      try {
        setError(null);
        const account = await createSmartAccount(address);
        const isDeployed = await checkSmartAccountDeployment(account.address);

        setSmartAccount({
          address: account.address,
          owner: address,
          implementation: 'Hybrid',
          isDeployed,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create smart account');
      }
    });
  };

  return {
    smartAccount,
    createAccount,
    isPending,
    error,
  };
}
