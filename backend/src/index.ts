import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { walletMonitor } from './agent/monitor.js';
import { delegationRegistry } from './agent/delegationRegistry.js';
import { getWalletHealth, getRiskyApprovals, getAllApprovals } from './services/envio.js';
import type { Address } from 'viem';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Wallet Autopilot Agent is running' });
});

// Get wallet health
app.get('/api/wallet/:address/health', async (req, res) => {
  try {
    const { address } = req.params;
    const health = await getWalletHealth(address);

    if (!health) {
      return res.status(404).json({ error: 'Wallet health not found' });
    }

    res.json(health);
  } catch (error) {
    console.error('Error fetching wallet health:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get risky approvals
app.get('/api/wallet/:address/approvals/risky', async (req, res) => {
  try {
    const { address } = req.params;
    const approvals = await getRiskyApprovals(address);
    res.json(approvals);
  } catch (error) {
    console.error('Error fetching risky approvals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all approvals
app.get('/api/wallet/:address/approvals', async (req, res) => {
  try {
    const { address } = req.params;
    const approvals = await getAllApprovals(address);
    res.json(approvals);
  } catch (error) {
    console.error('Error fetching approvals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register delegation
app.post('/api/delegation/register', async (req, res) => {
  try {
    const { delegator, delegate, scope } = req.body;

    const delegation = {
      id: `${delegator}-${delegate}-${Date.now()}`,
      delegator: delegator as Address,
      delegate: delegate as Address,
      scope,
      createdAt: new Date(),
      isActive: true,
    };

    await delegationRegistry.register(delegation);
    res.json({ success: true, delegation });
  } catch (error) {
    console.error('Error registering delegation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get delegations for wallet
app.get('/api/delegation/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const delegations = await delegationRegistry.getDelegationsForWallet(address as Address);
    res.json(delegations);
  } catch (error) {
    console.error('Error fetching delegations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Agent service running on port ${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);

  // Start wallet monitor
  walletMonitor.start();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  walletMonitor.stop();
  process.exit(0);
});
