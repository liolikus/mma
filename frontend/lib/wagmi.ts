import { createConfig, http } from 'wagmi';
import { monadTestnet } from './monad';
import { injected } from 'wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(),
  },
  connectors: [
    injected({
      target: 'metaMask',
    }),
  ],
  ssr: true,
});
