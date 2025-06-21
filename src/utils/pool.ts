import { readContract } from 'wagmi/actions';
import LiquidityPoolABI from '../abi/LiquidityPool.json';
import { config } from '../config';
import { BigNumberish } from 'ethers';
import { getBalance, getTotalSupply } from './balance';


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

