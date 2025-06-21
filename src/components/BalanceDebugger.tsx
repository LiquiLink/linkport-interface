import React, { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { getUserAssetBalance } from '../utils/balance';
import { poolList } from '../config';
import { formatUnits } from 'ethers';
import { readContract } from 'wagmi/actions';
import { config } from '../config';
import ERC20ABI from '../abi/ERC20.json';

const BalanceDebugger: React.FC = () => {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const [balances, setBalances] = useState<{[key: string]: any}>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isClient, setIsClient] = useState(false);

    // 防止hydration错误，只在客户端渲染
    useEffect(() => {
        setIsClient(true);
    }, []);

    const getNetworkName = (id: number) => {
        switch (id) {
            case 11155111: return 'Sepolia Testnet';
            case 97: return 'BSC Testnet';
            case 1: return 'Ethereum Mainnet';
            case 56: return 'BSC Mainnet';
            default: return `未知网络 (${id})`;
        }
    };

    const checkAllBalances = async () => {
        if (!address || !chainId) return;
        
        setIsLoading(true);
        const newBalances: {[key: string]: any} = {};
        
        console.log("🔥 开始详细检查所有余额...");
        console.log("用户地址:", address);
        console.log("当前网络:", chainId);
        
        // 检查当前网络的所有资产
        const currentNetworkPools = poolList.filter(pool => pool.chainId === chainId);
        console.log("当前网络的资产池:", currentNetworkPools);
        
        for (const pool of currentNetworkPools) {
            try {
                console.log(`📊 正在检查 ${pool.name}...`);
                console.log(`  - 合约地址: ${pool.address}`);
                console.log(`  - 是否原生代币: ${pool.isNative}`);
                console.log(`  - 链ID: ${pool.chainId}`);
                
                // 获取原始余额
                const rawBalance = await getUserAssetBalance(pool.address, address, pool.chainId, pool.isNative);
                console.log(`  - 原始余额 (bigint): ${rawBalance.toString()}`);
                
                let decimals = 18; // 默认decimals
                let symbol = pool.name;
                
                // 如果不是原生代币，尝试获取token信息
                if (!pool.isNative) {
                    try {
                        const tokenDecimals = await readContract(config, {
                            address: pool.address as `0x${string}`,
                            abi: ERC20ABI,
                            functionName: 'decimals',
                            chainId: chainId as 11155111 | 97,
                        });
                        
                        const tokenSymbol = await readContract(config, {
                            address: pool.address as `0x${string}`,
                            abi: ERC20ABI,
                            functionName: 'symbol',
                            chainId: chainId as 11155111 | 97,
                        });
                        
                        decimals = Number(tokenDecimals);
                        symbol = tokenSymbol as string;
                        
                        console.log(`  - 代币精度 (decimals): ${decimals}`);
                        console.log(`  - 代币符号: ${symbol}`);
                    } catch (error) {
                        console.warn(`  - 无法获取代币信息，使用默认值:`, error);
                    }
                }
                
                const formattedBalance = formatUnits(rawBalance, decimals);
                console.log(`  - 格式化余额: ${formattedBalance}`);
                
                newBalances[pool.id] = {
                    raw: rawBalance.toString(),
                    formatted: formattedBalance,
                    decimals: decimals,
                    symbol: symbol,
                    contractAddress: pool.address,
                    isNative: pool.isNative,
                    error: null
                };
                
                console.log(`✅ ${pool.name} 检查完成`);
            } catch (error: any) {
                console.error(`❌ ${pool.name} 检查失败:`, error);
                newBalances[pool.id] = {
                    raw: '0',
                    formatted: 'Error',
                    decimals: 18,
                    symbol: pool.name,
                    contractAddress: pool.address,
                    isNative: pool.isNative,
                    error: error?.message || 'Unknown error'
                };
            }
        }
        
        console.log("📋 最终余额结果:", newBalances);
        setBalances(newBalances);
        setIsLoading(false);
    };

    useEffect(() => {
        if (isClient && isConnected && address && chainId) {
            checkAllBalances();
        }
    }, [isClient, isConnected, address, chainId]);

    // 防止hydration错误，服务器端不渲染
    if (!isClient) {
        return null;
    }

    if (!isConnected) {
        return (
            <div style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                background: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                fontSize: '14px',
                maxWidth: '400px',
                zIndex: 1000
            }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>🔍 余额调试器</div>
                <div style={{ color: '#ef4444' }}>❌ 钱包未连接</div>
            </div>
        );
    }

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            fontSize: '11px',
            maxWidth: '450px',
            maxHeight: '500px',
            overflowY: 'auto',
            zIndex: 1000
        }}>
            <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '14px' }}>
                🔍 余额调试器 (详细版)
            </div>
            
            <div style={{ marginBottom: '12px' }}>
                <div><strong>钱包地址:</strong></div>
                <div style={{ 
                    wordBreak: 'break-all', 
                    fontSize: '9px', 
                    background: '#f3f4f6', 
                    padding: '4px 6px', 
                    borderRadius: '4px',
                    marginTop: '2px'
                }}>
                    {address}
                </div>
                <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                    <a href={`https://testnet.bscscan.com/address/${address}`} target="_blank" rel="noopener noreferrer">
                        📋 在区块浏览器中查看
                    </a>
                </div>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
                <div><strong>当前网络:</strong></div>
                <div style={{ color: chainId === 11155111 || chainId === 97 ? '#10b981' : '#ef4444' }}>
                    {getNetworkName(chainId)} (ID: {chainId})
                </div>
                {chainId !== 11155111 && chainId !== 97 && (
                    <div style={{ color: '#f59e0b', fontSize: '10px', marginTop: '2px' }}>
                        ⚠️ 请切换到 Sepolia 或 BSC 测试网
                    </div>
                )}
            </div>

            <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong>详细余额信息:</strong>
                    <button 
                        onClick={checkAllBalances}
                        disabled={isLoading}
                        style={{
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '10px',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.6 : 1
                        }}
                    >
                        {isLoading ? '检查中...' : '刷新'}
                    </button>
                </div>
                
                {Object.keys(balances).length === 0 ? (
                    <div style={{ color: '#6b7280' }}>暂无数据</div>
                ) : (
                    <div>
                        {poolList
                            .filter(pool => pool.chainId === chainId)
                            .map(pool => {
                                const balance = balances[pool.id];
                                if (!balance) return null;
                                
                                return (
                                    <div key={pool.id} style={{ 
                                        marginBottom: '12px',
                                        padding: '8px',
                                        background: pool.isNative ? '#dbeafe' : '#f9fafb',
                                        borderRadius: '6px',
                                        border: balance.error ? '1px solid #ef4444' : '1px solid #e5e7eb'
                                    }}>
                                        <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between',
                                            marginBottom: '4px',
                                            fontWeight: 'bold'
                                        }}>
                                            <span>{pool.name} {pool.isNative && '(原生)'}</span>
                                            <span style={{ 
                                                color: balance.error ? '#ef4444' : '#059669'
                                            }}>
                                                {balance.formatted}
                                            </span>
                                        </div>
                                        
                                        <div style={{ fontSize: '9px', color: '#6b7280' }}>
                                            <div>合约: {balance.contractAddress.slice(0, 8)}...{balance.contractAddress.slice(-6)}</div>
                                            <div>原始值: {balance.raw.slice(0, 20)}{balance.raw.length > 20 ? '...' : ''}</div>
                                            <div>精度: {balance.decimals} | 符号: {balance.symbol}</div>
                                            {balance.error && (
                                                <div style={{ color: '#ef4444', marginTop: '2px' }}>
                                                    错误: {balance.error}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        }
                    </div>
                )}
            </div>

            <div style={{ 
                fontSize: '9px', 
                color: '#6b7280',
                borderTop: '1px solid #e5e7eb',
                paddingTop: '8px'
            }}>
                💡 提示: 打开浏览器开发者工具 (F12) 查看详细日志
            </div>
        </div>
    );
};

export default BalanceDebugger; 