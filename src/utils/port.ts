import { readContract, writeContract } from 'wagmi/actions';
import linkPortABI from '../abi/LinkPort.json';
import { config, linkPorts, chainSelector } from '../config';
import { BigNumberish } from 'ethers';
import { sepolia, bscTestnet } from 'wagmi/chains';
import { getBalance, getTotalSupply } from './balance';
import { sep } from 'path';


export async function getMapToken(chainId: any, targetChainId: any, token: string) : Promise<string> {

    const linkPort = chainId == sepolia.id ? linkPorts[sepolia.id] : linkPorts[bscTestnet.id];
    const destChainSelector = targetChainId == sepolia.id ? chainSelector[sepolia.id] : chainSelector[bscTestnet.id];

    const destToken = await readContract(config, {
        address: linkPort as `0x${string}`,
        abi: linkPortABI,
        functionName: 'tokenList',
        args: [token, destChainSelector],
        chainId: chainId == sepolia.id ? sepolia.id : bscTestnet.id,
    }) as string

    return destToken;
}
