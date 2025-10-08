import { Chain } from 'viem';

export const monadTestnet: Chain = {
  id: 41454,
  name: 'Monad Testnet',
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
};

export const MONAD_RPC_URL = process.env.MONAD_RPC_URL || 'https://testnet.monad.xyz';
export const ENVIO_API_URL = process.env.ENVIO_API_URL || 'http://localhost:8080/v1/graphql';
