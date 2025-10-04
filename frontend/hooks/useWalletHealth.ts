'use client';

import { useState, useEffect } from 'react';
import type { WalletHealth } from '@/types';

async function fetchWalletHealth(address: string): Promise<WalletHealth> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  try {
    const response = await fetch(`${apiUrl}/api/wallet/${address}/health`);
    if (!response.ok) {
      // Return mock data if backend is not available
      console.warn('Backend not available, using mock data');
      return {
        score: 85,
        riskyApprovals: 2,
        spamTokens: 1,
        dustTokenCount: 3,
        lastUpdated: new Date(),
      };
    }
    return response.json();
  } catch (error) {
    // Return mock data on error
    console.warn('Error fetching wallet health:', error);
    return {
      score: 85,
      riskyApprovals: 2,
      spamTokens: 1,
      dustTokenCount: 3,
      lastUpdated: new Date(),
    };
  }
}

export function useWalletHealth(address: string | undefined) {
  const [health, setHealth] = useState<WalletHealth | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (address) {
      setIsLoading(true);
      fetchWalletHealth(address)
        .then(setHealth)
        .finally(() => setIsLoading(false));
    }
  }, [address]);

  const refresh = () => {
    if (address) {
      setIsLoading(true);
      fetchWalletHealth(address)
        .then(setHealth)
        .finally(() => setIsLoading(false));
    }
  };

  return { health, refresh, isLoading };
}
