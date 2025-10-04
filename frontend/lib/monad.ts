import { Chain } from 'viem';

export const monadTestnet = {
  id: 41454,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.monad.xyz'],
    },
    public: {
      http: ['https://testnet.monad.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://explorer.testnet.monad.xyz',
    },
  },
  testnet: true,
} as const satisfies Chain;

export const MONAD_CHAIN_ID = 41454;
export const MONAD_RPC_URL = 'https://testnet.monad.xyz';
export const MONAD_EXPLORER_URL = 'https://explorer.testnet.monad.xyz';
