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
    [sepolia.id]: "0xD03BAe9d0367ad9241243408D1137AfC92F2efe6",
    [bscTestnet.id]: "0xDC64753A100619a00aC950dA011c9eAB9B5aC870",
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
        pool: "0x74B4A8Da407ba782B60a0B8d46f4C461457AA33a",
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
        pool: "0xC5519895693F99c2Dad42d2553613FD171A5eE99",
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
        pool: "0xEBF6D13F1F1B25bf994328cB7F8809e657b8DBe8",
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
        pool: "0xa551b8dBbFE5f82159C3e4ea16D98b790B522038",
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
        pool: "0x8E40A704Bdfa53B621D6A2F30B8F13dCaA8b8196",
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
        pool: "0x8a227Fa6368A2745358F85ccdEA105048119e9fD",
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
        pool: "0xD5dA88e7aa61291D0f03e2A73eE58C46A49ae605",
        volume24h: '$89K',
        tokens: ['BNB']
    },
];