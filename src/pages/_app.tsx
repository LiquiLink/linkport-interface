import '../styles/globals.css';
import { AppProps } from 'next/app';
import Layout from '../components/Layout';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { injected, walletConnect, metaMask  } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const config = createConfig({
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


function MyApp({ Component, pageProps }: AppProps) {
  const queryClient = new QueryClient();
  
  return (
       <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>
          <Layout>
                <Component {...pageProps} />
          </Layout>
        </WagmiProvider>
      </QueryClientProvider>
  );
}

export default MyApp;