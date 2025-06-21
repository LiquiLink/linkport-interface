import { readContract } from 'wagmi/actions';
import ERC20ABI from '../abi/ERC20.json';
import { config } from '../config';
import { BigNumberish } from 'ethers';
import { getPublicClient } from 'wagmi/actions';

export async function getBalance(token: any, user: any, chainId: any) : Promise<BigNumberish> {
    console.log("getBalance", token, user);
    
    // Return 0 if user address is not available (not connected)
    if (!user || user === 'undefined') {
        console.log("User not connected, returning 0 balance");
        return BigInt(0);
    }
    
    try {
        const shares  = await readContract(config, {
            address: token,
            abi: ERC20ABI,
            functionName: 'balanceOf',
            args: [user],
            chainId: chainId,
        })
        console.log("getBalance", token, user, shares);
        return shares as BigNumberish
    } catch (error) {
        console.error("Error getting balance:", error);
        return BigInt(0);
    }
}

// 获取用户的原始资产余额（包括原生ETH）
export async function getUserAssetBalance(assetAddress: string, userAddress: string, chainId: number, isNative: boolean = false): Promise<BigNumberish> {
    console.log("getUserAssetBalance", assetAddress, userAddress, chainId, isNative);
    
    // Return 0 if user address is not available (not connected)
    if (!userAddress || userAddress === 'undefined') {
        console.log("User not connected, returning 0 balance");
        return BigInt(0);
    }
    
    try {
        if (isNative) {
            // 获取原生ETH/BNB余额
            const publicClient = getPublicClient(config, { chainId: chainId as 11155111 | 97 });
            if (publicClient) {
                const balance = await publicClient.getBalance({ 
                    address: userAddress as `0x${string}` 
                });
                console.log("Native balance:", balance);
                return balance;
            } else {
                console.error("Public client not available");
                return BigInt(0);
            }
        } else {
            // 获取ERC20代币余额
            const balance = await readContract(config, {
                address: assetAddress as `0x${string}`,
                abi: ERC20ABI,
                functionName: 'balanceOf',
                args: [userAddress],
                chainId: chainId as 11155111 | 97,
            });
            console.log("ERC20 balance:", balance);
            return balance as BigNumberish;
        }
    } catch (error) {
        console.error("Error getting user asset balance:", error);
        return BigInt(0);
    }
}

export async function getTotalSupply(token: any, chainId: any) : Promise<BigNumberish> {
    const shares  = await readContract(config, {
        address: token,
        abi: ERC20ABI,
        functionName: 'totalSupply',
        args: [],
        chainId: chainId,
    })
    return shares as BigNumberish
}