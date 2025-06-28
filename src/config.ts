import { sepolia, bscTestnet } from 'wagmi/chains';
import { injected, metaMask } from 'wagmi/connectors';
import { createConfig, http } from 'wagmi';

export const config = createConfig({
  chains: [bscTestnet, sepolia],
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [bscTestnet.id]: http(),
    [sepolia.id]: http(),
  },
});

export const linkPorts = {
    [sepolia.id]: "0x110B273c4DB995188602492599a583B9eAfD74d0",
    [bscTestnet.id]: "0x24F81DA0aBBD2a88605E4B140880647F26178744",
} 

export const chainSelector = {
    [sepolia.id]: `16015286601757825753`,
    [bscTestnet.id]: `13264668187771770619`,

}


export const poolList = [
    {
        id: 'sepoliaLINK',
        chainId: sepolia.id, 
        name: 'LINK',
        apy: '8.3%',
        isNative: false,
        address: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
        pool: "0xAc285c231b766BbE0b7964125fb01f808775CB0a",
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
        pool: "0x33e0Eee584352f61490F91951B162E38d0a6EeD7",
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
        pool: "0x3812A2D9925bA5FD8915d8B0b8cc6A00fe0ed808",
        volume24h: '$89K',
        tokens: ['USDT']
    },
    {
        id: 'bscLink',
        chainId: bscTestnet.id, 
        name: 'LINK',
        apy: '8.3%',
        isNative: false,
        address: "0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06",
        pool: "0x3aA26101A8b4Dc77A0467a5B9aF0702d57621D16",
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
        pool: "0x8dd2DeDd22C63667b82575E9E59DC43612CE1758",
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
        pool: "0x6a2C375d743382eB7ee79A8cEBA8aB8dA3e9d99a",
        volume24h: '$89K',
        tokens: ['BNB']
    },
];