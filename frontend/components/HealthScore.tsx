'use client';

import type { WalletHealth } from '@/types';

interface Props {
  health: WalletHealth;
}

export function HealthScore({ health }: Props) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/20';
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  return (
    <div className={`p-6 rounded-lg ${getScoreBg(health.score)}`}>
      <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
        Wallet Health Score
      </h2>
      <div className="flex items-baseline gap-2">
        <span className={`text-5xl font-bold ${getScoreColor(health.score)}`}>
          {health.score}
        </span>
        <span className="text-2xl text-gray-500">/100</span>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Risky Approvals:</span>
          <span className="font-semibold">{health.riskyApprovals}</span>
        </div>
        <div className="flex justify-between">
          <span>Spam Tokens:</span>
          <span className="font-semibold">{health.spamTokens}</span>
        </div>
        <div className="flex justify-between">
          <span>Dust Tokens:</span>
          <span className="font-semibold">{health.dustTokenCount}</span>
        </div>
      </div>
    </div>
  );
}
