import { sepolia, bscTestnet } from 'wagmi/chains';
import { injected, walletConnect, metaMask  } from 'wagmi/connectors';
import { createConfig, http } from 'wagmi';

export const config = createConfig({
  chains: [bscTestnet, sepolia],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({ 
      projectId: "da13eca5a1becbf3a758f71e70d1a6a5",
    }),
  ],
  transports: {
    [bscTestnet.id]: http(),
    [sepolia.id]: http(),
  },
});


export const poolList = [
    {
        id: 'sepoliaLINK',
        chainId: sepolia.id, 
        name: 'LINK',
        apy: '8.3%',
        isNative: false,
        address: "0x391E62e754CaA820B606703D1920c34a35792dd6",
        pool: "0x38c10944d84fe991EFd600272470d0c1c7Cb237f",
        volume24h: '$89K',
        tokens: ['LINK']
    },
    {
        id: 'sepoliaUSDT',
        chainId: sepolia.id, 
        name: 'USDT',
        apy: '8.3%',
        isNative: false,
        address: "0xa28C606a33AF8175F3bBf71d74796aDa360f4C49",
        pool: "0x4C30d3F6aD1223A17DCceAC3F5b30CA023348556",
        volume24h: '$89K',
        tokens: ['USDT']
    },
    {
        id: 'sepoliaETH',
        chainId: sepolia.id, 
        name: 'ETH',
        apy: '8.3%',
        isNative: true,
        address: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
        pool: "0x470e9EF1701aCECb5E025bdCfad847A113995cbE",
        volume24h: '$89K',
        tokens: ['USDT']
    },
    {
        id: 'bscLink',
        chainId: bscTestnet.id, 
        name: 'LINK',
        apy: '8.3%',
        isNative: false,
        address: "0xf11935eb67FE7C505e93Ed7751f8c59Fc3199121",
        pool: "0x7C48AcB94e05bf287B6F15cCFD8AC9f5922b0D03",
        volume24h: '$89K',
        tokens: ['LINK']
    },
    {
        id: 'bscUSDT',
        chainId: bscTestnet.id, 
        name: 'USDT',
        apy: '8.3%',
        isNative: false,
        address: "0x5016F623414b344a5C26ffDa4e61956c9a41Ca1e",
        pool: "0x62A4a7Dee4eF742DB4BA14f3F92AD45164418Af5",
        volume24h: '$89K',
        tokens: ['USDT']
    },
    {
        id: 'bscBNB',
        chainId: bscTestnet.id, 
        name: 'BNB',
        apy: '8.3%',
        isNative: true,
        address: "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd",
        pool: "0xceEFa3Cc535aC86F7F4e7B8D0E677bd2f08E025d",
        volume24h: '$89K',
        tokens: ['BNB']
    },
];