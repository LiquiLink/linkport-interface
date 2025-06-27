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
    [sepolia.id]: "0xACe486949165FE8d2E088359AFB03C49f5Ec870A",
    [bscTestnet.id]: "0x911e2008BDd299e99555dBdbb8f7ba1053C670F9",
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
        pool: "0x0F17F74daCb8c535d518f4445449f72c0585413B",
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
        pool: "0x015D59616616b23Aee7e1253d312Ced038a57832",
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
        pool: "0x23f726Ef0A41A4688D63E232d88f1EC5b947D3E0",
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
        pool: "0x513E39C2bAb3bC4D6604241EB60A635EfDb8Ee63",
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
        pool: "0x06c1DcEec34a8811Ad52F0fEfBcBA0991FdFB5B6",
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
        pool: "0x2c5841B545487d4F4C44d0b732141dd3D03d05fD",
        volume24h: '$89K',
        tokens: ['BNB']
    },
];