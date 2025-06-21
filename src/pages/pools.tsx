import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { BigNumberish, ethers, formatUnits } from 'ethers';
import { useAccount, useChainId, useReadContract, useWriteContract } from 'wagmi';
import LiquidityPoolABI  from '../abi/LiquidityPool.json';
import ERC20ABI from '../abi/ERC20.json';
import { poolList } from  '../config';
import { getBalance, getUserAssetBalance } from '../utils/balance';
import { getPoolTvl, getUserPosition } from '../utils/pool';
import { useTransactionCreator } from '../hooks/useTransactions';
import { getMultipleAssetPrices } from '../utils/priceService';

interface Pool {
    id: string;
    name: string;
    address: string;
    pool: string;
    chainId: number;
    isNative: boolean;
    apy: string;
}

const Pools: React.FC = () => {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const [isClient, setIsClient] = useState(false);
    const [pools, setPools] = useState<Pool[]>([]);
    const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
    const [depositAmount, setDepositAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [poolTvls, setPoolTvls] = useState<{[key: string]: number}>({});
    const [userPositions, setUserPositions] = useState<{[key: string]: string}>({});
    const [userBalances, setUserBalances] = useState<{[key: string]: string}>({});
    const [assetPrices, setAssetPrices] = useState<{[key: string]: any}>({});

    // 使用交易创建Hook
    const { 
        createDepositTransaction, 
        createWithdrawTransaction 
    } = useTransactionCreator();

    const { writeContract: writeContractDeposit, isPending: isPendingDeposit } = useWriteContract();
    const { writeContract: writeContractWithdraw, isPending: isPendingWithdraw } = useWriteContract();

    // 防止hydration错误
    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        async function fetchPools() {
            if (!isClient || !chainId) return;
            
            try {
                const chainPools = poolList.filter(pool => pool.chainId === chainId);
                setPools(chainPools);
                
                // 获取价格数据
                const symbols = ['ETH', 'LINK', 'USDT', 'BNB'];
                const prices = await getMultipleAssetPrices(symbols, chainId);
                setAssetPrices(prices);
                
                console.log('📊 链上池子数据:', chainPools);
                console.log('💰 价格数据:', prices);
                
                // 获取TVL和用户持仓数据
                const tvlData: {[key: string]: number} = {};
                const positionData: {[key: string]: string} = {};
                const balanceData: {[key: string]: string} = {};
                
                for (const pool of chainPools) {
                    try {
                        // 获取TVL
                        const tvl = await getPoolTvl(pool);
                        tvlData[pool.id] = tvl ? parseFloat(formatUnits(tvl, 18)) : 0;
                        
                        if (address) {
                            // 获取用户在池子中的份额
                            const userPos = await getUserPosition(pool, address);
                            positionData[pool.id] = userPos ? formatUnits(userPos, 18) : '0';
                            
                            // 获取用户余额
                            const userBal = await getUserAssetBalance(pool.address, address, pool.chainId, pool.isNative);
                            balanceData[pool.id] = formatUnits(userBal, 18);
                        }
                    } catch (error) {
                        console.error(`获取 ${pool.name} 数据失败:`, error);
                        tvlData[pool.id] = 0;
                        positionData[pool.id] = '0';
                        balanceData[pool.id] = '0';
                    }
                }
                
                setPoolTvls(tvlData);
                setUserPositions(positionData);
                setUserBalances(balanceData);
                
            } catch (error) {
                console.error('获取池子数据失败:', error);
            }
        }
        
        fetchPools();
    }, [isClient, chainId, address]);

    const formatCurrency = (value: number) => {
        return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const calculateUSDValue = (amount: string, tokenName: string): string => {
        const priceData = assetPrices[tokenName];
        if (!priceData || !amount) return '$0.00';
        
        const value = parseFloat(amount) * priceData.price;
        return formatCurrency(value);
    };

    const handleDeposit = async () => {
        if (!selectedPool || !depositAmount || !address) return;
        
        try {
            const amount = ethers.parseUnits(depositAmount, 18);
            const usdValue = calculateUSDValue(depositAmount, selectedPool.name);
            
            console.log('🏊‍♂️ 开始存款操作:', {
                pool: selectedPool.name,
                amount: depositAmount,
                value: usdValue,
                address: selectedPool.pool
            });

            if (selectedPool.isNative) {
                // 原生代币存款（ETH/BNB）
                await writeContractDeposit({
                    address: selectedPool.pool as `0x${string}`,
                    abi: LiquidityPoolABI,
                    functionName: 'deposit',
                    value: amount
                }, {
                    onSuccess: async (txHash) => {
                        console.log('✅ 原生代币存款交易提交:', txHash);
                        
                        // 创建交易记录
                        try {
                            await createDepositTransaction(
                                selectedPool.name,
                                depositAmount,
                                usdValue,
                                selectedPool.pool,
                                txHash
                            );
                            console.log('📝 交易记录已创建');
                        } catch (error) {
                            console.error('❌ 创建交易记录失败:', error);
                        }
                        
                        setIsDepositModalOpen(false);
                        setDepositAmount('');
                        
                        // 刷新数据
                        window.location.reload();
                    },
                    onError: (error) => {
                        console.error('❌ 存款交易失败:', error);
                        alert('存款交易失败: ' + error.message);
                    }
                });
            } else {
                // ERC20代币存款
                await writeContractDeposit({
                    address: selectedPool.pool as `0x${string}`,
                    abi: LiquidityPoolABI,
                    functionName: 'deposit',
                    args: [amount]
                }, {
                    onSuccess: async (txHash) => {
                        console.log('✅ ERC20存款交易提交:', txHash);
                        
                        // 创建交易记录
                        try {
                            await createDepositTransaction(
                                selectedPool.name,
                                depositAmount,
                                usdValue,
                                selectedPool.pool,
                                txHash
                            );
                            console.log('📝 交易记录已创建');
                        } catch (error) {
                            console.error('❌ 创建交易记录失败:', error);
                        }
                        
                        setIsDepositModalOpen(false);
                        setDepositAmount('');
                        
                        // 刷新数据
                        window.location.reload();
                    },
                    onError: (error) => {
                        console.error('❌ 存款交易失败:', error);
                        alert('存款交易失败: ' + error.message);
                    }
                });
            }
        } catch (error) {
            console.error('❌ 存款操作失败:', error);
            alert('存款操作失败: ' + (error as Error).message);
        }
    };

    const handleWithdraw = async () => {
        if (!selectedPool || !withdrawAmount || !address) return;
        
        try {
            const amount = ethers.parseUnits(withdrawAmount, 18);
            const usdValue = calculateUSDValue(withdrawAmount, selectedPool.name);
            
            console.log('🏃‍♂️ 开始提取操作:', {
                pool: selectedPool.name,
                amount: withdrawAmount,
                value: usdValue,
                address: selectedPool.pool
            });

            await writeContractWithdraw({
                address: selectedPool.pool as `0x${string}`,
                abi: LiquidityPoolABI,
                functionName: 'withdraw',
                args: [amount]
            }, {
                onSuccess: async (txHash) => {
                    console.log('✅ 提取交易提交:', txHash);
                    
                    // 创建交易记录
                    try {
                        await createWithdrawTransaction(
                            selectedPool.name,
                            withdrawAmount,
                            usdValue,
                            selectedPool.pool,
                            txHash
                        );
                        console.log('📝 交易记录已创建');
                    } catch (error) {
                        console.error('❌ 创建交易记录失败:', error);
                    }
                    
                    setIsWithdrawModalOpen(false);
                    setWithdrawAmount('');
                    
                    // 刷新数据
                    window.location.reload();
                },
                onError: (error) => {
                    console.error('❌ 提取交易失败:', error);
                    alert('提取交易失败: ' + error.message);
                }
            });
        } catch (error) {
            console.error('❌ 提取操作失败:', error);
            alert('提取操作失败: ' + (error as Error).message);
        }
    };

    const openDepositModal = (pool: Pool) => {
        setSelectedPool(pool);
        setIsDepositModalOpen(true);
    };

    const openWithdrawModal = (pool: Pool) => {
        setSelectedPool(pool);
        setIsWithdrawModalOpen(true);
    };

    const getChainName = (chainId: number) => {
        switch (chainId) {
            case 97: return 'BSC Testnet';
            case 11155111: return 'Sepolia Testnet';
            default: return 'Unknown Network';
        }
    };

    // 防止hydration错误
    if (!isClient) {
        return null;
    }

    if (!isConnected) {
        return (
            <Layout>
                <div className="container">
                    <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '60px 40px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '20px', color: 'var(--secondary-text)' }}>
                            🔗
                        </div>
                        <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-color)', marginBottom: '12px' }}>
                            Connect Your Wallet
                        </h2>
                        <p style={{ color: 'var(--secondary-text)', fontSize: '16px', lineHeight: 1.5 }}>
                            Connect your wallet to view and interact with liquidity pools on {getChainName(chainId || 97)}.
                        </p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="container">
                <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                        <h2 style={{ 
                            fontSize: '28px',
                            fontWeight: 600,
                            color: 'var(--text-color)',
                            marginBottom: '8px'
                        }}>
                            Liquidity Pools Overview
                        </h2>
                        <p style={{ 
                            color: 'var(--secondary-text)',
                            fontSize: '16px'
                        }}>
                            Provide liquidity and earn rewards on {getChainName(chainId || 97)}
                        </p>
                    </div>

                    {pools.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '48px 24px',
                            background: 'rgba(255, 255, 255, 0.6)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '16px',
                            border: '1px solid var(--border-color)'
                        }}>
                            <div style={{ fontSize: '32px', marginBottom: '16px', color: 'var(--secondary-text)' }}>
                                🏊‍♂️
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-color)', marginBottom: '8px' }}>
                                No Pools Available
                            </div>
                            <div style={{ color: 'var(--secondary-text)' }}>
                                Switch to a supported network to view available pools.
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '20px' }}>
                            {pools.map((pool) => (
                                <div key={pool.id} style={{
                                    background: 'rgba(255, 255, 255, 0.7)',
                                    backdropFilter: 'blur(10px)',
                                    borderRadius: '16px',
                                    border: '1px solid var(--border-color)',
                                    padding: '24px',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        marginBottom: '20px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '48px',
                                                height: '48px',
                                                borderRadius: '50%',
                                                background: pool.isNative 
                                                    ? 'linear-gradient(135deg, #f59e0b, #d97706)' 
                                                    : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                color: 'white'
                                            }}>
                                                {pool.name}
                                            </div>
                                            <div>
                                                <h3 style={{
                                                    fontSize: '20px',
                                                    fontWeight: 600,
                                                    color: 'var(--text-color)',
                                                    marginBottom: '4px'
                                                }}>
                                                    {pool.name}
                                                </h3>
                                                <div style={{
                                                    fontSize: '12px',
                                                    color: 'var(--secondary-text)'
                                                }}>
                                                    {getChainName(pool.chainId)} {pool.isNative && '(Native)'}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div style={{
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            background: 'rgba(34, 197, 94, 0.15)',
                                            color: '#22c55e',
                                            fontSize: '14px',
                                            fontWeight: 600
                                        }}>
                                            APY: {pool.apy}
                                        </div>
                                    </div>

                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                        gap: '16px',
                                        marginBottom: '20px'
                                    }}>
                                        <div>
                                            <div style={{
                                                fontSize: '12px',
                                                color: 'var(--secondary-text)',
                                                marginBottom: '4px'
                                            }}>
                                                TVL
                                            </div>
                                            <div style={{
                                                fontSize: '18px',
                                                fontWeight: 600,
                                                color: 'var(--text-color)'
                                            }}>
                                                {poolTvls[pool.id] ? formatCurrency(poolTvls[pool.id]) : '$0'}
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <div style={{
                                                fontSize: '12px',
                                                color: 'var(--secondary-text)',
                                                marginBottom: '4px'
                                            }}>
                                                Your Position
                                            </div>
                                            <div style={{
                                                fontSize: '18px',
                                                fontWeight: 600,
                                                color: 'var(--text-color)'
                                            }}>
                                                {userPositions[pool.id] ? parseFloat(userPositions[pool.id]).toFixed(4) : '0'}
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <div style={{
                                                fontSize: '12px',
                                                color: 'var(--secondary-text)',
                                                marginBottom: '4px'
                                            }}>
                                                24h Volume
                                            </div>
                                            <div style={{
                                                fontSize: '18px',
                                                fontWeight: 600,
                                                color: 'var(--text-color)'
                                            }}>
                                                $89K
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        gap: '12px'
                                    }}>
                                        <button
                                            onClick={() => openDepositModal(pool)}
                                            disabled={isPendingDeposit}
                                            style={{
                                                flex: 1,
                                                padding: '12px 16px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                                                color: 'white',
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                opacity: isPendingDeposit ? 0.7 : 1
                                            }}
                                        >
                                            {isPendingDeposit ? 'Depositing...' : 'Deposit'}
                                        </button>
                                        
                                        <button
                                            onClick={() => openWithdrawModal(pool)}
                                            disabled={isPendingWithdraw || parseFloat(userPositions[pool.id] || '0') === 0}
                                            style={{
                                                flex: 1,
                                                padding: '12px 16px',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border-color)',
                                                background: 'white',
                                                color: 'var(--text-color)',
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                opacity: (isPendingWithdraw || parseFloat(userPositions[pool.id] || '0') === 0) ? 0.5 : 1
                                            }}
                                        >
                                            {isPendingWithdraw ? 'Withdrawing...' : 'Withdraw'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Deposit Modal */}
                {isDepositModalOpen && selectedPool && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}>
                        <div className="glass-card" style={{
                            maxWidth: '400px',
                            width: '90%',
                            margin: '20px'
                        }}>
                            <h3 style={{
                                marginBottom: '20px',
                                fontSize: '20px',
                                fontWeight: 600,
                                color: 'var(--text-color)'
                            }}>
                                Deposit {selectedPool.name}
                            </h3>
                            
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{
                                    fontSize: '14px',
                                    color: 'var(--secondary-text)',
                                    marginBottom: '8px'
                                }}>
                                    Available Balance: {parseFloat(userBalances[selectedPool.id] || '0').toFixed(6)} {selectedPool.name}
                                </div>
                                <input
                                    type="number"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    placeholder="0.0"
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
                                        background: 'white',
                                        fontSize: '16px',
                                        color: 'var(--text-color)',
                                        outline: 'none'
                                    }}
                                />
                                {depositAmount && (
                                    <div style={{
                                        fontSize: '12px',
                                        color: 'var(--secondary-text)',
                                        marginTop: '4px'
                                    }}>
                                        ≈ {calculateUSDValue(depositAmount, selectedPool.name)}
                                    </div>
                                )}
                            </div>
                            
                            <div style={{
                                display: 'flex',
                                gap: '12px'
                            }}>
                                <button
                                    onClick={() => {
                                        setIsDepositModalOpen(false);
                                        setDepositAmount('');
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
                                        background: 'white',
                                        color: 'var(--text-color)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeposit}
                                    disabled={!depositAmount || isPendingDeposit}
                                    style={{
                                        flex: 1,
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                                        color: 'white',
                                        cursor: 'pointer',
                                        opacity: (!depositAmount || isPendingDeposit) ? 0.5 : 1
                                    }}
                                >
                                    {isPendingDeposit ? 'Depositing...' : 'Deposit'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Withdraw Modal */}
                {isWithdrawModalOpen && selectedPool && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}>
                        <div className="glass-card" style={{
                            maxWidth: '400px',
                            width: '90%',
                            margin: '20px'
                        }}>
                            <h3 style={{
                                marginBottom: '20px',
                                fontSize: '20px',
                                fontWeight: 600,
                                color: 'var(--text-color)'
                            }}>
                                Withdraw {selectedPool.name}
                            </h3>
                            
                            {/* 账户信息显示 */}
                            <div style={{
                                background: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                borderRadius: '8px',
                                padding: '16px',
                                marginBottom: '20px'
                            }}>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '16px',
                                    fontSize: '14px'
                                }}>
                                    <div>
                                        <div style={{ color: 'var(--secondary-text)', marginBottom: '4px' }}>
                                            💰 Current Balance
                                        </div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-color)' }}>
                                            {parseFloat(userBalances[selectedPool.id] || '0').toFixed(6)} {selectedPool.name}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                                            {calculateUSDValue(userBalances[selectedPool.id] || '0', selectedPool.name)}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--secondary-text)', marginBottom: '4px' }}>
                                            🏊‍♂️ Available to Withdraw
                                        </div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-color)' }}>
                                            {parseFloat(userPositions[selectedPool.id] || '0').toFixed(6)} LP
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                                            ≈ {parseFloat(userPositions[selectedPool.id] || '0').toFixed(6)} {selectedPool.name}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* 输入区域 */}
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '8px'
                                }}>
                                    <label style={{
                                        fontSize: '14px',
                                        color: 'var(--secondary-text)'
                                    }}>
                                        Withdraw Amount (LP Tokens)
                                    </label>
                                    <button
                                        onClick={() => setWithdrawAmount(userPositions[selectedPool.id] || '0')}
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            border: '1px solid #3b82f6',
                                            background: 'rgba(59, 130, 246, 0.1)',
                                            color: '#3b82f6',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        MAX
                                    </button>
                                </div>
                                <input
                                    type="number"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    placeholder="0.0"
                                    max={userPositions[selectedPool.id] || '0'}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
                                        background: 'white',
                                        fontSize: '16px',
                                        color: 'var(--text-color)',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                {withdrawAmount && (
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: '12px',
                                        color: 'var(--secondary-text)',
                                        marginTop: '8px',
                                        padding: '8px 12px',
                                        background: 'rgba(255, 255, 255, 0.5)',
                                        borderRadius: '6px'
                                    }}>
                                        <span>You will receive:</span>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 600 }}>
                                                ≈ {withdrawAmount} {selectedPool.name}
                                            </div>
                                            <div>
                                                {calculateUSDValue(withdrawAmount, selectedPool.name)}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {/* 进度条显示百分比 */}
                                {withdrawAmount && (
                                    <div style={{ marginTop: '8px' }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: '12px',
                                            color: 'var(--secondary-text)',
                                            marginBottom: '4px'
                                        }}>
                                            <span>Withdrawal Percentage</span>
                                            <span>
                                                {((parseFloat(withdrawAmount) / parseFloat(userPositions[selectedPool.id] || '1')) * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                        <div style={{
                                            height: '4px',
                                            background: 'rgba(0, 0, 0, 0.1)',
                                            borderRadius: '2px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                height: '100%',
                                                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                                width: `${Math.min((parseFloat(withdrawAmount) / parseFloat(userPositions[selectedPool.id] || '1')) * 100, 100)}%`,
                                                transition: 'width 0.3s ease'
                                            }}></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div style={{
                                display: 'flex',
                                gap: '12px'
                            }}>
                                <button
                                    onClick={() => {
                                        setIsWithdrawModalOpen(false);
                                        setWithdrawAmount('');
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
                                        background: 'white',
                                        color: 'var(--text-color)',
                                        cursor: 'pointer',
                                        fontWeight: 600
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleWithdraw}
                                    disabled={!withdrawAmount || isPendingWithdraw || parseFloat(withdrawAmount) > parseFloat(userPositions[selectedPool.id] || '0')}
                                    style={{
                                        flex: 1,
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontWeight: 600,
                                        opacity: (!withdrawAmount || isPendingWithdraw || parseFloat(withdrawAmount) > parseFloat(userPositions[selectedPool.id] || '0')) ? 0.5 : 1
                                    }}
                                >
                                    {isPendingWithdraw ? 'Withdrawing...' : 'Withdraw'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Pools;
