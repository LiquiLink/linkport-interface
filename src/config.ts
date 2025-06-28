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
        address: "0x391e62e754caa820b606703d1920c34a35792dd6",
        pool: "0x748Ea283F44FbF2da72Abace4575CD8F57D706dd",
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
        id: 'sepoliaBNB',
        chainId: sepolia.id, 
        name: 'BNB',
        apy: '8.3%',
        isNative: false,
        address: "0xDC64753A100619a00aC950dA011c9eAB9B5aC870",
        pool: "0x88322f612dc9e0ed043f766de227bd7ada86d78e",
        volume24h: '$89K',
        tokens: ['BNB']
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
        address: "0xf11935eb67fe7c505e93ed7751f8c59fc3199121",
        pool: "0x70093330B51754edC72053CbA3bDF9208fC85547",
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