import cron from 'node-cron';
import { getRiskyApprovals, getAllApprovals } from '../services/envio.js';
import { delegationRegistry } from './delegationRegistry.js';
import { ruleEngine } from './ruleEngine.js';
import { getExecutor } from './executor.js';
import type { Address } from 'viem';

export class WalletMonitor {
  private isRunning = false;

  start() {
    if (this.isRunning) {
      console.log('Monitor already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting wallet monitor...');

    // Run every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      await this.checkAllWallets();
    });

    // Run immediately on start
    this.checkAllWallets();
  }

  stop() {
    this.isRunning = false;
    console.log('Stopping wallet monitor...');
  }

  async checkAllWallets() {
    console.log('Checking all wallets...');

    try {
      const executor = getExecutor();
      const agentAddress = process.env.AGENT_ADDRESS as Address;

      if (!agentAddress) {
        throw new Error('AGENT_ADDRESS not set');
      }

      // Get all active delegations
      const delegations = await delegationRegistry.getActiveDelegations(agentAddress);

      for (const delegation of delegations) {
        await this.checkWallet(delegation.delegator, delegation);
      }
    } catch (error) {
      console.error('Error checking wallets:', error);
    }
  }

  async checkWallet(walletAddress: Address, delegation: any) {
    console.log(`Checking wallet: ${walletAddress}`);

    try {
      // Get all approvals for this wallet
      const approvals = await getAllApprovals(walletAddress);

      // Evaluate rules
      const actions = ruleEngine.evaluateAllApprovals(approvals);

      if (actions.length === 0) {
        console.log(`No actions needed for ${walletAddress}`);
        return;
      }

      console.log(`Found ${actions.length} actions for ${walletAddress}`);

      // Execute revocations
      const executor = getExecutor();
      const revocations = actions
        .filter(a => a.action === 'revoke')
        .map(a => ({
          token: a.target as Address,
          spender: approvals.find(app => app.token === a.target)?.spender as Address,
        }))
        .filter(r => r.spender);

      if (revocations.length > 0) {
        const txHashes = await executor.executeMultipleRevocations(
          walletAddress,
          revocations,
          delegation
        );
        console.log(`Executed ${txHashes.length} revocations for ${walletAddress}`);
      }
    } catch (error) {
      console.error(`Error checking wallet ${walletAddress}:`, error);
    }
  }
}

export const walletMonitor = new WalletMonitor();
