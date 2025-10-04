import { createWalletClient, createPublicClient, http, encodeFunctionData, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monadTestnet } from '../config/monad.js';
import { redeemDelegations } from '@metamask/delegation-toolkit';

const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

export class TransactionExecutor {
  private agentAccount: ReturnType<typeof privateKeyToAccount>;
  private walletClient: ReturnType<typeof createWalletClient>;
  private publicClient: ReturnType<typeof createPublicClient>;

  constructor(privateKey: `0x${string}`) {
    this.agentAccount = privateKeyToAccount(privateKey);

    this.walletClient = createWalletClient({
      account: this.agentAccount,
      chain: monadTestnet,
      transport: http(),
    });

    this.publicClient = createPublicClient({
      chain: monadTestnet,
      transport: http(),
    });
  }

  async revokeApproval(
    smartAccount: Address,
    tokenAddress: Address,
    spenderAddress: Address,
    delegation: any
  ): Promise<string> {
    try {
      // Encode the revoke approval transaction (approve with 0 amount)
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spenderAddress, BigInt(0)],
      });

      // Execute via delegation using redeemDelegations
      // Note: This is a simplified version - full implementation requires proper delegation setup
      console.log(`Would revoke approval for ${tokenAddress} on ${smartAccount}`);
      console.log(`Delegation feature will be available once MetaMask Smart Accounts are set up`);

      // For now, return a placeholder hash
      return '0x' + '0'.repeat(64);
    } catch (error) {
      console.error('Error revoking approval:', error);
      throw error;
    }
  }

  async executeMultipleRevocations(
    smartAccount: Address,
    revocations: Array<{ token: Address; spender: Address }>,
    delegation: any
  ): Promise<string[]> {
    const results: string[] = [];

    for (const { token, spender } of revocations) {
      try {
        const txHash = await this.revokeApproval(smartAccount, token, spender, delegation);
        results.push(txHash);
      } catch (error) {
        console.error(`Failed to revoke ${token}:`, error);
      }
    }

    return results;
  }
}

// Export singleton instance
let executor: TransactionExecutor | null = null;

export function getExecutor(): TransactionExecutor {
  if (!executor) {
    const privateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}`;
    if (!privateKey) {
      throw new Error('AGENT_PRIVATE_KEY not set');
    }
    executor = new TransactionExecutor(privateKey);
  }
  return executor;
}
