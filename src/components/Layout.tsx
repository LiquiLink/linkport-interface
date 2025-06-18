import React from 'react';
import Head from 'next/head';
import Navigation from './Navigation';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <>
            <Head>
                <title>LinkPort - Cross-chain DeFi Platform</title>
                <meta name="description" content="Cross-chain DeFi lending and liquidity platform powered by Chainlink CCIP" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            </Head>
            <Navigation />
            <main>
                {children}
            </main>
        </>
    );
};

export default Layout;