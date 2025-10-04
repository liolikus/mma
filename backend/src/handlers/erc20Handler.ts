import { TokenApproval, TokenTransfer, WalletHealth } from '../../generated';

const UNLIMITED_APPROVAL = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
const RISK_CHECK_DAYS = 30;

export async function handleApproval(event: any) {
  const { owner, spender, value } = event.params;
  const { blockNumber, transactionHash, timestamp } = event;

  const isRisky = checkIfRisky(value.toString(), timestamp);

  const approval: TokenApproval = {
    id: `${transactionHash}-${event.logIndex}`,
    owner: owner.toLowerCase(),
    spender: spender.toLowerCase(),
    token: event.address.toLowerCase(),
    amount: value.toString(),
    timestamp: BigInt(timestamp),
    blockNumber: BigInt(blockNumber),
    transactionHash,
    isRisky,
    riskReason: isRisky ? 'Unlimited approval detected' : undefined,
    status: value.toString() === '0' ? 'REVOKED' : 'ACTIVE',
  };

  await TokenApproval.set(approval);

  // Update wallet health
  await updateWalletHealth(owner.toLowerCase());
}

export async function handleTransfer(event: any) {
  const { from, to, value } = event.params;
  const { blockNumber, transactionHash, timestamp } = event;

  const transfer: TokenTransfer = {
    id: `${transactionHash}-${event.logIndex}`,
    from: from.toLowerCase(),
    to: to.toLowerCase(),
    token: event.address.toLowerCase(),
    amount: value.toString(),
    timestamp: BigInt(timestamp),
    blockNumber: BigInt(blockNumber),
    transactionHash,
    isSpam: false, // TODO: Implement spam detection
  };

  await TokenTransfer.set(transfer);
}

function checkIfRisky(amount: string, timestamp: number): boolean {
  // Check if unlimited approval
  if (amount === UNLIMITED_APPROVAL) {
    return true;
  }
  // Add more risk heuristics here
  return false;
}

async function updateWalletHealth(walletAddress: string) {
  const approvals = await TokenApproval.getAll({
    where: {
      owner: { _eq: walletAddress },
      status: { _eq: 'ACTIVE' },
    },
  });

  const riskyApprovals = approvals.filter(a => a.isRisky).length;

  const healthScore = Math.max(0, 100 - (riskyApprovals * 10));

  const health: WalletHealth = {
    id: walletAddress,
    walletAddress,
    healthScore,
    riskyApprovals,
    spamTokens: 0, // TODO: Calculate spam tokens
    dustTokenCount: 0, // TODO: Calculate dust tokens
    lastUpdated: BigInt(Date.now()),
  };

  await WalletHealth.set(health);
}
