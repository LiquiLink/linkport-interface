import { readContract, writeContract } from 'wagmi/actions';
import LiquidityPoolABI from '../abi/LiquidityPool.json';
import linkPortABI from '../abi/LinkPort.json';
import { config, linkPorts, chainSelector } from '../config';
import { BigNumberish } from 'ethers';
import { sepolia, bscTestnet } from 'wagmi/chains';
import { getBalance, getTotalSupply } from './balance';
import ERC20ABI from '../abi/ERC20.json';
import { sep } from 'path';


export async function getPoolTvl(pool: any) : Promise<BigNumberish> {

    const balance = await getBalance(pool.address, pool.pool, pool.chainId);
    const totalLoans  = await readContract(config, {
        address: pool.pool,
        abi: LiquidityPoolABI,
        functionName: 'totalLoans',
        args: [],
    }) as BigNumberish;

    const tvl = (balance as bigint) + (totalLoans as bigint);
    return  tvl as BigNumberish;
}

export async function getUserPosition(pool: any, user: any) : Promise<BigNumberish> {
    console.log("getUserPosition", pool.name, pool, user);
    const shares  = await getBalance(pool.pool, user, pool.chainId);

    console.log("shares", pool.name, shares);
    const totalSupply  = await getTotalSupply(pool.pool, pool.chainId);

    const tvl = await getPoolTvl(pool);

    const userPosition = tvl ? ((shares as bigint) * (tvl as bigint) / (totalSupply as bigint)) : BigInt(0); 

    return userPosition as BigNumberish;
}


export async function loan(chainId: any, targetChainId: any, collateralToken: string, collateralAmount: BigNumberish, loanToken: string[], loanAmount: BigNumberish[]) : Promise<void> {
    console.log("loan", chainId, collateralToken, collateralAmount, loanToken, loanAmount);

    const linkPort = chainId == sepolia.id ? linkPorts[sepolia.id] : linkPorts[bscTestnet.id];
    const destChainSelector = targetChainId == sepolia.id ? chainSelector[sepolia.id] : chainSelector[bscTestnet.id];
    console.log("linkPort", linkPort, "destChainSelector", destChainSelector);
    try {
        const tx = await writeContract(config, {
            address: linkPort as `0x${string}`,
            abi: linkPortABI,
            functionName: 'loan',
            args: [destChainSelector, collateralToken, collateralAmount, loanToken, loanAmount],
            chainId: chainId == sepolia.id ? sepolia.id : bscTestnet.id,
        });
        
        console.log("Loan transaction sent:", tx);
    } catch (error) {
        console.error("Error executing loan:", error);
    }
}

export async function bridge(chainId: any, targetChainId: any, collateralToken: string, collateralAmount: BigNumberish, loanToken: string[], loanAmount: BigNumberish[]) : Promise<void> {
    console.log("bridge", chainId, targetChainId, collateralToken, collateralAmount, loanToken, loanAmount);


    const linkPort = chainId == sepolia.id ? linkPorts[sepolia.id] : linkPorts[bscTestnet.id];
    const destChainSelector = targetChainId== sepolia.id ? chainSelector[sepolia.id] : chainSelector[bscTestnet.id];
    console.log("linkPort", linkPort, "destChainSelector", destChainSelector);
    try {
        await writeContract(config, {
            address: collateralToken as `0x${string}`,
            abi: ERC20ABI,
            functionName: 'approve',
            args: [linkPort, collateralAmount],
        }); 

        const tx = await writeContract(config, {
            address: linkPort as `0x${string}`,
            abi: linkPortABI,
            functionName: 'bridge',
            args: [destChainSelector, collateralToken, collateralAmount, loanToken, loanAmount],
            chainId: chainId == sepolia.id ? sepolia.id : bscTestnet.id,
        });

        console.log("Bridge transaction sent:", tx);
    } catch (error) {
        console.error("Error executing loan:", error);
    }
}