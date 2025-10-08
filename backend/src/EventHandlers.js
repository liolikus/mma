const { ERC20Token } = require("generated");

// Maximum approval amount (2^256 - 1)
const MAX_UINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

// Threshold for unlimited approval
const UNLIMITED_THRESHOLD = BigInt("0xffffffffffffffffffffffffffffffffffffffffffff"); // ~10^72

/**
 * Handle ERC20 Approval events
 * Tracks token approvals for auto-revoke feature
 */
ERC20Token.Approval.handler(async ({ event, context }) => {
  const { owner, spender, value } = event.params;
  const tokenAddress = event.srcAddress.toLowerCase();

  // Create unique ID: owner-spender-token
  const approvalId = `${owner}-${spender}-${tokenAddress}`.toLowerCase();

  // Check if unlimited approval
  const isUnlimited = value >= UNLIMITED_THRESHOLD;

  // Assess risk (you can expand this logic)
  const isRisky = isUnlimited || await isSpenderRisky(spender, context);

  // Upsert TokenApproval entity
  const approval = {
    id: approvalId,
    owner: owner.toLowerCase(),
    spender: spender.toLowerCase(),
    tokenAddress,
    amount: value,

    blockNumber: BigInt(event.block.number),
    blockTimestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash,

    isUnlimited,
    isRisky,
    lastUsedAt: undefined,

    status: value > 0n ? "ACTIVE" : "REVOKED",
    revokedAt: value === 0n ? BigInt(event.block.timestamp) : undefined,
    revokedTxHash: value === 0n ? event.transaction.hash : undefined,
  };

  context.TokenApproval.set(approval);

  // Update wallet health metrics
  await updateWalletHealth(owner.toLowerCase(), context);

  // Update token metadata
  await updateTokenMetadata(tokenAddress, event.block.number, context);
});

/**
 * Handle ERC20 Transfer events
 * Detects spam tokens and tracks balances
 */
ERC20Token.Transfer.handler(async ({ event, context }) => {
  const { from, to, value } = event.params;
  const tokenAddress = event.srcAddress.toLowerCase();

  // Create transfer record
  const transferId = `${event.transaction.hash}-${event.logIndex}`;

  // Detect potential spam (received without interaction)
  const isAirdrop = from === "0x0000000000000000000000000000000000000000";
  const isPotentialSpam =
    isAirdrop ||
    await isAirdropTransfer(to, event.transaction.from, context);

  const transfer = {
    id: transferId,
    from: from.toLowerCase(),
    to: to.toLowerCase(),
    tokenAddress,
    amount: value,
    blockNumber: BigInt(event.block.number),
    blockTimestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash,
    isPotentialSpam,
    isAirdrop,
  };

  context.TokenTransfer.set(transfer);

  // Update token balances for dust tracking
  if (from !== "0x0000000000000000000000000000000000000000") {
    await updateWalletBalance(from.toLowerCase(), tokenAddress, event.block, context);
  }
  if (to !== "0x0000000000000000000000000000000000000000") {
    await updateWalletBalance(to.toLowerCase(), tokenAddress, event.block, context);
  }

  // Update token metadata
  await updateTokenMetadata(tokenAddress, event.block.number, context);
});

/**
 * Check if spender is risky
 * Placeholder - implement actual risk logic
 */
async function isSpenderRisky(spender, context) {
  // TODO: Check against known risky protocols
  // TODO: Check if contract is verified
  // TODO: Check recent exploit history
  return false;
}

/**
 * Check if transfer is an airdrop (unsolicited)
 */
async function isAirdropTransfer(recipient, txFrom, context) {
  // If recipient didn't initiate the transaction, it's likely an airdrop
  return recipient.toLowerCase() !== txFrom.toLowerCase();
}

/**
 * Update wallet health score
 */
async function updateWalletHealth(walletAddress, context) {
  // Get all active approvals for this wallet
  const approvals = await context.TokenApproval.getWhere.owner.eq(walletAddress);

  if (!approvals) {
    return;
  }

  const activeApprovals = approvals.filter(a => a.status === "ACTIVE");
  const activeCount = activeApprovals.length;
  const riskyCount = activeApprovals.filter(a => a.isRisky).length;

  // Calculate health score (0-100)
  let healthScore = 100;
  healthScore -= riskyCount * 10;  // -10 points per risky approval
  healthScore -= activeCount * 2;   // -2 points per approval
  healthScore = Math.max(0, Math.min(100, healthScore));

  const health = {
    id: walletAddress,
    walletAddress,
    activeApprovalsCount: activeCount,
    riskyApprovalsCount: riskyCount,
    spamTokensCount: 0,  // Updated by transfer handler
    dustTokensCount: 0,   // Updated by balance tracker
    healthScore,
    lastCalculatedAt: BigInt(Date.now()),
    lastActionAt: undefined,
  };

  context.WalletHealth.set(health);
}

/**
 * Update token metadata
 */
async function updateTokenMetadata(tokenAddress, blockNumber, context) {
  let metadata = await context.TokenMetadata.get(tokenAddress);

  if (!metadata) {
    // Create new metadata entry
    metadata = {
      id: tokenAddress,
      address: tokenAddress,
      name: undefined,
      symbol: undefined,
      decimals: 18,  // Default
      isVerified: false,
      isSpam: false,
      hasLiquidity: false,
      totalHolders: 0,
      totalTransfers: 0n,
      firstSeenBlock: BigInt(blockNumber),
    };
  }

  metadata.totalTransfers = (metadata.totalTransfers || 0n) + 1n;

  context.TokenMetadata.set(metadata);
}

/**
 * Update wallet token balance
 */
async function updateWalletBalance(walletAddress, tokenAddress, block, context) {
  const balanceId = `${walletAddress}-${tokenAddress}`;

  // TODO: Query actual balance from contract
  // For now, just track that wallet has this token

  const balance = {
    id: balanceId,
    walletAddress,
    tokenAddress,
    balance: 0n,  // Would need to query contract
    estimatedValueUSD: undefined,
    isDust: false,
    lastUpdatedBlock: BigInt(block.number),
    lastUpdatedTimestamp: BigInt(block.timestamp),
  };

  context.WalletTokenBalance.set(balance);
}
