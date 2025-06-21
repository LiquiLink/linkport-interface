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

// Get user's raw asset balance (including native ETH)
export async function getUserAssetBalance(assetAddress: string, userAddress: string, chainId: number, isNative: boolean = false): Promise<BigNumberish> {
    console.log("🔍 getUserAssetBalance debug info:");
    console.log("  - assetAddress:", assetAddress);
    console.log("  - userAddress:", userAddress);
    console.log("  - chainId:", chainId);
    console.log("  - isNative:", isNative);
    
    // Return 0 if user address is not available (not connected)
    if (!userAddress || userAddress === 'undefined') {
        console.log("❌ User not connected, returning 0 balance");
        return BigInt(0);
    }
    
    // Validate address format
    if (!userAddress.startsWith('0x') || userAddress.length !== 42) {
        console.error("❌ Invalid user address format:", userAddress);
        return BigInt(0);
    }
    
    // Check if chain ID is supported
    const supportedChains = [11155111, 97]; // Sepolia, BSC Testnet
    if (!supportedChains.includes(chainId)) {
        console.error("❌ Unsupported chain ID:", chainId);
        return BigInt(0);
    }
    
    try {
        if (isNative) {
            console.log("🔄 Reading native token balance (ETH/BNB)...");
            // Get native ETH/BNB balance
            const publicClient = getPublicClient(config, { chainId: chainId as 11155111 | 97 });
            if (publicClient) {
                const balance = await publicClient.getBalance({ 
                    address: userAddress as `0x${string}` 
                });
                console.log("✅ Native token balance (Wei):", balance.toString());
                console.log("✅ Native token balance (ETH/BNB):", (Number(balance) / 1e18).toFixed(6));
                return balance;
            } else {
                console.error("❌ Unable to get public client");
                return BigInt(0);
            }
        } else {
            console.log("🔄 Reading ERC20 token balance...");
            
            // Validate contract address format
            if (!assetAddress.startsWith('0x') || assetAddress.length !== 42) {
                console.error("❌ Invalid contract address format:", assetAddress);
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
            console.log("✅ ERC20 token balance (smallest unit):", (balance as bigint).toString());
            console.log("✅ ERC20 token balance (formatted):", (Number(balance as bigint) / 1e18).toFixed(6));
            return balance as BigNumberish;
        }
    } catch (error: any) {
        console.error("❌ Error getting asset balance:");
        console.error("  - Error type:", error?.name);
        console.error("  - Error message:", error?.message);
        console.error("  - Full error:", error);
        
        // Provide more specific error information
        if (error?.message?.includes('execution reverted')) {
            console.error("💡 Possible cause: Contract address does not exist or function call failed");
        } else if (error?.message?.includes('network')) {
            console.error("💡 Possible cause: Network connection issue");
        } else if (error?.message?.includes('insufficient funds')) {
            console.error("💡 Possible cause: Insufficient account balance");
        }
        
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