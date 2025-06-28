import { readContract } from 'wagmi/actions';
import ERC20ABI from '../abi/ERC20.json';
import { config } from '../config';
import { BigNumberish } from 'ethers';
import { getPublicClient } from 'wagmi/actions';

export async function getBalance(token: any, user: any, chainId: any) : Promise<BigNumberish> {
    // Return 0 if user address is not available (not connected)
    if (!user || user === 'undefined') {
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
        return shares as BigNumberish
    } catch (error) {
        console.warn("Error getting balance for", token, ":", error instanceof Error ? error.message : error);
        return BigInt(0);
    }
}

// Get user's raw asset balance (including native ETH)
export async function getUserAssetBalance(assetAddress: string, userAddress: string, chainId: number, isNative: boolean = false): Promise<BigNumberish> {
    // Return 0 if user address is not available (not connected)
    if (!userAddress || userAddress === 'undefined') {
        return BigInt(0);
    }
    
    // Validate address format
    if (!userAddress.startsWith('0x') || userAddress.length !== 42) {
        console.warn("Invalid user address format:", userAddress);
        return BigInt(0);
    }
    
    // Check if chain ID is supported
    const supportedChains = [11155111, 97]; // Sepolia, BSC Testnet
    if (!supportedChains.includes(chainId)) {
        console.warn("Unsupported chain ID:", chainId);
        return BigInt(0);
    }
    
    try {
        if (isNative) {
            // Get native ETH/BNB balance
            const publicClient = getPublicClient(config, { chainId: chainId as 11155111 | 97 });
            if (publicClient) {
                const balance = await publicClient.getBalance({ 
                    address: userAddress as `0x${string}` 
                });
                return balance;
            } else {
                console.warn("Unable to get public client");
                return BigInt(0);
            }
        } else {
            // Validate contract address format
            if (!assetAddress.startsWith('0x') || assetAddress.length !== 42) {
                console.warn("Invalid contract address format:", assetAddress);
                return BigInt(0);
            }
            
            // Get ERC20 token balance
            const balance = await readContract(config, {
                address: assetAddress as `0x${string}`,
                abi: ERC20ABI,
                functionName: 'balanceOf',
                args: [userAddress],
                chainId: chainId as 11155111 | 97,
            });
            return balance as BigNumberish;
        }
    } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Error getting ${isNative ? 'native' : 'ERC20'} balance:`, errorMessage);
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