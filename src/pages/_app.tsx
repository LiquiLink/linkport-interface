import '../styles/globals.css';
import type { AppProps } from 'next/app';
import Layout from '../components/Layout';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '../config';


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