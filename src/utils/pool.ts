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

    const tvl = BigInt(balance.toString()) + BigInt(totalLoans.toString())
    return  tvl as BigNumberish;
}

export async function getUserPosition(pool: any, user: any) : Promise<BigNumberish> {
    console.log("getUserPosition", pool.name, pool, user);
    
    if (!user) {
        return BigInt(0) as BigNumberish;
    }
    
    const shares  = await getBalance(pool.pool, user, pool.chainId);

    console.log("shares", pool.name, shares);
    const totalSupply  = await getTotalSupply(pool.pool, pool.chainId);

    const tvl = await getPoolTvl(pool);

    // Handle division by zero and null values
    if (!shares || !totalSupply || !tvl || BigInt(totalSupply.toString()) === BigInt(0)) {
        return BigInt(0) as BigNumberish;
    }

    // Convert to BigInt for calculation
    const sharesBigInt = BigInt(shares.toString());
    const tvlBigInt = BigInt(tvl.toString());
    const totalSupplyBigInt = BigInt(totalSupply.toString());

    const userPosition = (sharesBigInt * tvlBigInt) / totalSupplyBigInt;

    return userPosition as BigNumberish;
}

