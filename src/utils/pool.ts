import { readContract, writeContract } from 'wagmi/actions';
import LiquidityPoolABI from '../abi/LiquidityPool.json';
import linkPortABI from '../abi/LinkPort.json';
import { config, linkPorts, chainSelector } from '../config';
import { BigNumberish } from 'ethers';
import { sepolia, bscTestnet } from 'wagmi/chains';
import { getBalance, getTotalSupply } from './balance';
import ERC20ABI from '../abi/ERC20.json';
import { getAssetPriceFromPort } from './priceService';
import { sep } from 'path';


export async function getLoan(pool: any, asset: string, user: string, source: number) : Promise<any> {
    try {
        const chainId = source == sepolia.id ? chainSelector[sepolia.id] : chainSelector[bscTestnet.id];
        console.log(`Getting loan for asset ${asset} in pool ${pool.pool} on chain ${chainId} for user ${user}`);
        const loan = await readContract(config, {
            address: pool.pool,
            abi: LiquidityPoolABI,
            functionName: 'loans',
            args: [user, chainId, asset],
            chainId: pool.chainId,
        });

        return loan;
    } catch (error) {
        console.error(`Error getting loan for asset ${asset} in pool ${pool.name}:`, error);
        return null;
    }
}

export async function getUserIntrest(pool: any, asset: string, user: string, source: number) : Promise<any> {
    try {
        const chainId = source == sepolia.id ? chainSelector[sepolia.id] : chainSelector[bscTestnet.id];
        console.log(`Getting loan for asset ${asset} in pool ${pool.pool} on chain ${chainId} for user ${user}`);
        const loan = await readContract(config, {
            address: pool.pool,
            abi: LiquidityPoolABI,
            functionName: 'getUserInterest',
            args: [user, chainId, asset],
            chainId: pool.chainId,
        });

        return loan;
    } catch (error) {
        console.error(`Error getting loan for asset ${asset} in pool ${pool.name}:`, error);
        return null;
    }
}


export async function getPoolTvl(pool: any) : Promise<BigNumberish> {
    try {
        const balance = await getBalance(pool.address, pool.pool, pool.chainId);
        
        // Try to get totalLoans, but handle gracefully if contract doesn't have this function
        let totalLoans: BigNumberish = BigInt(0);
        try {
            totalLoans = await readContract(config, {
                address: pool.pool,
                abi: LiquidityPoolABI,
                functionName: 'totalLoans',
                args: [],
                chainId: pool.chainId,
            }) as BigNumberish;
        } catch (error) {
            console.warn(`totalLoans function not available for pool ${pool.name}, using balance only for TVL`);
            // If totalLoans function doesn't exist, just use the balance
            totalLoans = BigInt(0);
        }

        const tvl = (balance as bigint) + (totalLoans as bigint);
        return tvl as BigNumberish;
    } catch (error) {
        console.error(`Error getting TVL for pool ${pool.name}:`, error);
        // Return 0 as fallback
        return BigInt(0);
    }
}

export async function getUserPosition(pool: any, user: any) : Promise<BigNumberish> {
    try {
        const shares = await getBalance(pool.pool, user, pool.chainId);

        
        // If user has no shares, return 0 early
        if (!shares || shares === BigInt(0)) {
            return BigInt(0);
        }

        const totalSupply = await getTotalSupply(pool.pool, pool.chainId);
        
        // If no total supply, return 0
        if (!totalSupply || totalSupply === BigInt(0)) {
            return BigInt(0);
        }

        const tvl = await getPoolTvl(pool);

        const userPosition = tvl && tvl !== BigInt(0) ? 
            ((shares as bigint) * (tvl as bigint) / (totalSupply as bigint)) : 
            BigInt(0); 

        return userPosition as BigNumberish;
    } catch (error) {
        console.warn(`Error getting user position for pool ${pool.name}:`, error instanceof Error ? error.message : error);
        return BigInt(0);
    }
}


