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
    console.log("🔍 getUserAssetBalance 调试信息:");
    console.log("  - assetAddress:", assetAddress);
    console.log("  - userAddress:", userAddress);
    console.log("  - chainId:", chainId);
    console.log("  - isNative:", isNative);
    
    // Return 0 if user address is not available (not connected)
    if (!userAddress || userAddress === 'undefined') {
        console.log("❌ 用户未连接，返回0余额");
        return BigInt(0);
    }
    
    // 验证地址格式
    if (!userAddress.startsWith('0x') || userAddress.length !== 42) {
        console.error("❌ 用户地址格式错误:", userAddress);
        return BigInt(0);
    }
    
    // 检查链ID是否支持
    const supportedChains = [11155111, 97]; // Sepolia, BSC Testnet
    if (!supportedChains.includes(chainId)) {
        console.error("❌ 不支持的链ID:", chainId);
        return BigInt(0);
    }
    
    try {
        if (isNative) {
            console.log("🔄 读取原生代币余额 (ETH/BNB)...");
            // 获取原生ETH/BNB余额
            const publicClient = getPublicClient(config, { chainId: chainId as 11155111 | 97 });
            if (publicClient) {
                const balance = await publicClient.getBalance({ 
                    address: userAddress as `0x${string}` 
                });
                console.log("✅ 原生代币余额 (Wei):", balance.toString());
                console.log("✅ 原生代币余额 (ETH/BNB):", (Number(balance) / 1e18).toFixed(6));
                return balance;
            } else {
                console.error("❌ 无法获取公共客户端");
                return BigInt(0);
            }
        } else {
            console.log("🔄 读取 ERC20 代币余额...");
            
            // 验证合约地址格式
            if (!assetAddress.startsWith('0x') || assetAddress.length !== 42) {
                console.error("❌ 合约地址格式错误:", assetAddress);
                return BigInt(0);
            }
            
            // 获取ERC20代币余额
            const balance = await readContract(config, {
                address: assetAddress as `0x${string}`,
                abi: ERC20ABI,
                functionName: 'balanceOf',
                args: [userAddress],
                chainId: chainId as 11155111 | 97,
            });
            console.log("✅ ERC20 代币余额 (最小单位):", (balance as bigint).toString());
            console.log("✅ ERC20 代币余额 (格式化):", (Number(balance as bigint) / 1e18).toFixed(6));
            return balance as BigNumberish;
        }
    } catch (error: any) {
        console.error("❌ 获取资产余额时出错:");
        console.error("  - 错误类型:", error?.name);
        console.error("  - 错误信息:", error?.message);
        console.error("  - 完整错误:", error);
        
        // 提供更具体的错误信息
        if (error?.message?.includes('execution reverted')) {
            console.error("💡 可能的原因: 合约地址不存在或函数调用失败");
        } else if (error?.message?.includes('network')) {
            console.error("💡 可能的原因: 网络连接问题");
        } else if (error?.message?.includes('insufficient funds')) {
            console.error("💡 可能的原因: 账户余额不足");
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