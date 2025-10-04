'use client';

import { useAccount } from 'wagmi';
import { WalletConnect } from '@/components/WalletConnect';
import { DelegationControls } from '@/components/DelegationControls';
import { HealthScore } from '@/components/HealthScore';
import { AllowancesTable } from '@/components/AllowancesTable';
import { useWalletHealth } from '@/hooks/useWalletHealth';

const AGENT_ADDRESS = process.env.NEXT_PUBLIC_AGENT_ADDRESS as `0x${string}` || '0x0000000000000000000000000000000000000000';

function Dashboard() {
  const { address } = useAccount();
  const { health, isLoading } = useWalletHealth(address);

  if (!address) {
    return (
      <div className="max-w-md mx-auto">
        <WalletConnect />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <WalletConnect />

      {isLoading ? (
        <div className="p-6 text-center text-gray-500">Loading health data...</div>
      ) : health ? (
        <HealthScore health={health} />
      ) : null}

      <DelegationControls
        smartAccountAddress={address}
        agentAddress={AGENT_ADDRESS}
      />

      <AllowancesTable approvals={[]} />
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Wallet Autopilot</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Automated wallet health management for Monad
          </p>
        </header>

        <Dashboard />
      </div>
    </main>
  );
}
