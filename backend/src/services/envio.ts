import { GraphQLClient } from 'graphql-request';
import { ENVIO_API_URL } from '../config/monad.js';

const client = new GraphQLClient(ENVIO_API_URL);

export interface WalletHealthData {
  walletAddress: string;
  healthScore: number;
  riskyApprovals: number;
  spamTokens: number;
  dustTokenCount: number;
  lastUpdated: string;
}

export interface TokenApprovalData {
  id: string;
  owner: string;
  spender: string;
  token: string;
  amount: string;
  isRisky: boolean;
  status: string;
}

export async function getWalletHealth(address: string): Promise<WalletHealthData | null> {
  const query = `
    query GetWalletHealth($address: String!) {
      WalletHealth(where: { walletAddress: { _eq: $address } }) {
        walletAddress
        healthScore
        riskyApprovals
        spamTokens
        dustTokenCount
        lastUpdated
      }
    }
  `;

  try {
    const data = await client.request<{ WalletHealth: WalletHealthData[] }>(query, {
      address: address.toLowerCase(),
    });
    return data.WalletHealth[0] || null;
  } catch (error) {
    console.error('Error fetching wallet health:', error);
    return null;
  }
}

export async function getRiskyApprovals(owner: string): Promise<TokenApprovalData[]> {
  const query = `
    query GetRiskyApprovals($owner: String!) {
      TokenApproval(
        where: {
          owner: { _eq: $owner }
          isRisky: { _eq: true }
          status: { _eq: "ACTIVE" }
        }
      ) {
        id
        owner
        spender
        token
        amount
        isRisky
        status
      }
    }
  `;

  try {
    const data = await client.request<{ TokenApproval: TokenApprovalData[] }>(query, {
      owner: owner.toLowerCase(),
    });
    return data.TokenApproval;
  } catch (error) {
    console.error('Error fetching risky approvals:', error);
    return [];
  }
}

export async function getAllApprovals(owner: string): Promise<TokenApprovalData[]> {
  const query = `
    query GetAllApprovals($owner: String!) {
      TokenApproval(
        where: {
          owner: { _eq: $owner }
          status: { _eq: "ACTIVE" }
        }
      ) {
        id
        owner
        spender
        token
        amount
        isRisky
        status
      }
    }
  `;

  try {
    const data = await client.request<{ TokenApproval: TokenApprovalData[] }>(query, {
      owner: owner.toLowerCase(),
    });
    return data.TokenApproval;
  } catch (error) {
    console.error('Error fetching approvals:', error);
    return [];
  }
}
