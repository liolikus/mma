import {
  toMetaMaskSmartAccount,
  Implementation,
  createDelegation
} from '@metamask/delegation-toolkit';
import { createPublicClient, createWalletClient, custom, type Address } from 'viem';
import { monadTestnet } from './monad';

export async function createSmartAccount(ownerAddress: Address) {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not installed');
  }

  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: custom(window.ethereum),
  });

  const walletClient = createWalletClient({
    chain: monadTestnet,
    transport: custom(window.ethereum),
  });

  const smartAccount = await toMetaMaskSmartAccount({
    client: publicClient,
    implementation: Implementation.Hybrid,
    deployParams: [ownerAddress, [], [], []],
    signer: { walletClient },
  });

  return smartAccount;
}

export async function grantDelegation(
  smartAccountAddress: Address,
  agentAddress: Address,
  scope: {
    type: 'functionCall';
    targets: Address[];
    selectors: string[];
  }
) {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not installed');
  }

  const delegation = createDelegation({
    scope,
    to: agentAddress,
    from: smartAccountAddress,
  });

  return delegation;
}

export async function checkSmartAccountDeployment(address: Address): Promise<boolean> {
  if (typeof window === 'undefined' || !window.ethereum) {
    return false;
  }

  const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: custom(window.ethereum),
  });

  const code = await publicClient.getBytecode({ address });
  return code !== undefined && code !== '0x';
}
