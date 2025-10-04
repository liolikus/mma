'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useSmartAccount } from '@/hooks/useSmartAccount';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { smartAccount, createAccount, isPending, error } = useSmartAccount();

  if (isConnected && address) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <p className="text-sm">
            Connected: {address.slice(0, 6)}...{address.slice(-4)}
          </p>
          <button
            onClick={() => disconnect()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Disconnect
          </button>
        </div>

        {!smartAccount && (
          <button
            onClick={createAccount}
            disabled={isPending}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Creating Smart Account...' : 'Create Smart Account'}
          </button>
        )}

        {smartAccount && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm font-semibold">Smart Account Created</p>
            <p className="text-xs mt-1">
              {smartAccount.address.slice(0, 8)}...{smartAccount.address.slice(-6)}
            </p>
            <p className="text-xs mt-1">
              Status: {smartAccount.isDeployed ? 'Deployed' : 'Not Deployed'}
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Connect your MetaMask wallet to get started
      </p>
      {connectors.map((connector) => (
        <button
          key={connector.uid}
          onClick={() => connect({ connector })}
          className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
        >
          Connect MetaMask
        </button>
      ))}
    </div>
  );
}
