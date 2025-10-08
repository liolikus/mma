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

    blockNumber: BigInt(event.block?.number || 0),
    blockTimestamp: BigInt(event.block?.timestamp || 0),
    transactionHash: event.transaction?.hash || `${event.srcAddress}-${event.logIndex}`,

    isUnlimited,
    isRisky,
    lastUsedAt: undefined,

    status: value > 0n ? "ACTIVE" : "REVOKED",
    revokedAt: value === 0n ? BigInt(event.block?.timestamp || 0) : undefined,
    revokedTxHash: value === 0n ? (event.transaction?.hash || `${event.srcAddress}-${event.logIndex}`) : undefined,
  };

  context.TokenApproval.set(approval);

  // Update wallet health metrics
  await updateWalletHealth(owner.toLowerCase(), context);

  // Update token metadata
  await updateTokenMetadata(tokenAddress, event.block?.number || 0, context);
});

/**
 * Handle ERC20 Transfer events
 * Detects spam tokens and tracks balances
 */
ERC20Token.Transfer.handler(async ({ event, context }) => {
  const { from, to, value } = event.params;
  const tokenAddress = event.srcAddress.toLowerCase();

  // Debug: Log event structure to understand available fields
  console.log("Event keys:", Object.keys(event));
  console.log("Event:", JSON.stringify(event, (key, val) => typeof val === 'bigint' ? val.toString() : val, 2));

  // Create transfer record - use logIndex as fallback if no transaction hash
  const transferId = `${event.srcAddress}-${event.logIndex}-${event.chainId}`;

  // Detect potential spam (received without interaction)
  const isAirdrop = from === "0x0000000000000000000000000000000000000000";

  const transfer = {
    id: transferId,
    from: from.toLowerCase(),
    to: to.toLowerCase(),
    tokenAddress,
    amount: value,
    blockNumber: BigInt(event.block?.number || 0),
    blockTimestamp: BigInt(event.block?.timestamp || 0),
    transactionHash: event.transaction?.hash || `${event.srcAddress}-${event.logIndex}`,
    isPotentialSpam: isAirdrop,
    isAirdrop,
  };

  context.TokenTransfer.set(transfer);

  // Update token balances for dust tracking
  if (from !== "0x0000000000000000000000000000000000000000") {
    await updateWalletBalance(from.toLowerCase(), tokenAddress, event.block?.number || 0, event.block?.timestamp || 0, context);
  }
  if (to !== "0x0000000000000000000000000000000000000000") {
    await updateWalletBalance(to.toLowerCase(), tokenAddress, event.block?.number || 0, event.block?.timestamp || 0, context);
  }

  // Update token metadata
  await updateTokenMetadata(tokenAddress, event.block?.number || 0, context);
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
async function updateWalletBalance(walletAddress, tokenAddress, blockNumber, blockTimestamp, context) {
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
    lastUpdatedBlock: BigInt(blockNumber),
    lastUpdatedTimestamp: BigInt(blockTimestamp),
  };

  context.WalletTokenBalance.set(balance);
}
