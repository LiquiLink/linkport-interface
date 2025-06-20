import { readContract } from 'wagmi/actions';
import ERC20ABI from '../abi/ERC20.json';
import { config } from '../config';
import { BigNumberish } from 'ethers';

export async function getBalance(token: any, user: any) : Promise<BigNumberish> {
    console.log("getBalance", token, user);
    const shares  = await readContract(config, {
        address: token,
        abi: ERC20ABI,
        functionName: 'balanceOf',
        args: [user],
    })
    console.log("getBalance", token, user, shares);
    return shares as BigNumberish
}

export async function getTotalSupply(token: any) : Promise<BigNumberish> {
    const shares  = await readContract(config, {
        address: token,
        abi: ERC20ABI,
        functionName: 'totalSupply',
        args: [],
    })
    return shares as BigNumberish
}