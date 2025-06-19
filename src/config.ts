import { mainnet, sepolia } from 'wagmi/chains';
import { injected, walletConnect, metaMask  } from 'wagmi/connectors';
import { createConfig, http } from 'wagmi';

export const config = createConfig({
  chains: [mainnet, sepolia],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({ 
      projectId: "da13eca5a1becbf3a758f71e70d1a6a5",
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});

