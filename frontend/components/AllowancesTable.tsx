'use client';

import type { TokenApproval } from '@/types';
import { AlertTriangle } from 'lucide-react';

interface Props {
  approvals: TokenApproval[];
}

export function AllowancesTable({ approvals }: Props) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold">Token Allowances</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Token
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Spender
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {approvals.map((approval) => (
              <tr key={approval.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {approval.token.slice(0, 8)}...
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {approval.spender.slice(0, 8)}...
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {approval.amount === '115792089237316195423570985008687907853269984665640564039457584007913129639935'
                    ? 'Unlimited'
                    : 'Limited'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    {approval.isRisky && (
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    )}
                    <span className={approval.status === 'active' ? 'text-green-600' : 'text-gray-500'}>
                      {approval.status}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
