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
import { getAssetPriceFromPort, getMultipleAssetPrices } from '../utils/priceService';
import { useToast } from '../components/Toast';

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
    const [isApproving, setIsApproving] = useState<boolean>(false);
    const [depositModalActive, setDepositModalActive] = useState(false);
    const [withdrawModalActive, setWithdrawModalActive] = useState(false);
    const depositTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const withdrawTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // Use transaction creation hooks
    const { 
        createDepositTransaction, 
        createWithdrawTransaction 
    } = useTransactionCreator();
    
    const { showToast, ToastContainer } = useToast();

    const { writeContract: writeContractDeposit, isPending: isPendingDeposit } = useWriteContract();
    const { writeContract: writeContractWithdraw, isPending: isPendingWithdraw } = useWriteContract();
    const { writeContract: writeContractApprove, isPending: isPendingApprove } = useWriteContract();

    // Prevent hydration errors
    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        async function fetchPools() {
            if (!isClient || !chainId) return;
            
            try {
                const chainPools = poolList.filter(pool => pool.chainId === chainId);
                setPools(chainPools);
                
                // Get price data
                const symbols = ['ETH', 'LINK', 'USDT', 'BNB'];
                const prices = await getMultipleAssetPrices(symbols, chainId);
                setAssetPrices(prices);
                
                console.log('📊 On-chain pool data:', chainPools);
                console.log('💰 Price data:', prices);
                
                // Get TVL and user position data
                const tvlData: {[key: string]: number} = {};
                const positionData: {[key: string]: string} = {};
                const balanceData: {[key: string]: string} = {};
                
                for (const pool of chainPools) {
                    try {
                        // Get TVL
                        const tvl = await getPoolTvl(pool);
                        const price = await getAssetPriceFromPort(pool.address, pool.chainId);
                        const tvlInUSD = tvl ? parseFloat(formatUnits(tvl, 18)) * (price?.price || 1) : 0;
                        tvlData[pool.id] = tvlInUSD
                        
                        if (address) {
                            // Get user position in the pool
                            const userPos = await getUserPosition(pool, address);
                            positionData[pool.id] = userPos ? formatUnits(userPos, 18) : '0';
                            
                            // Get user balance
                            const userBal = await getUserAssetBalance(pool.address, address, pool.chainId, pool.isNative);
                            balanceData[pool.id] = formatUnits(userBal, 18);
                        }
                    } catch (error) {
                        console.error(`Failed to get ${pool.name} data:`, error);
                        tvlData[pool.id] = 0;
                        positionData[pool.id] = '0';
                        balanceData[pool.id] = '0';
                    }
                }
                
                setPoolTvls(tvlData);
                setUserPositions(positionData);
                setUserBalances(balanceData);
                
            } catch (error) {
                console.error('Failed to fetch pool data:', error);
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
            
            console.log('🏊‍♂️ Starting deposit operation:', {
                pool: selectedPool.name,
                amount: depositAmount,
                value: usdValue,
                poolAddress: selectedPool.pool,
                tokenAddress: selectedPool.address,
                isNative: selectedPool.isNative
            });

            if (selectedPool.isNative) {
                // Native token deposit (ETH/BNB) - no approval needed
                await executeDeposit(selectedPool, amount, usdValue);
            } else {
                // ERC20 token deposit - automatically handle approval and deposit
                showToast('Processing: Approve token then deposit...', 'info', { autoClose: false });
                
                // Execute approval first
                setIsApproving(true);
                try {
                    await writeContractApprove({
                        address: selectedPool.address as `0x${string}`,
                        abi: ERC20ABI,
                        functionName: 'approve',
                        args: [selectedPool.pool, amount]
                    }, {
                        onSuccess: async (approvalTxHash) => {
                            console.log('✅ Approval successful:', approvalTxHash);
                            showToast('Approval confirmed! Now depositing...', 'success');
                            
                            // Execute deposit immediately after successful approval
                            setTimeout(async () => {
                                await executeDeposit(selectedPool, amount, usdValue);
                            }, 1000);
                        },
                        onError: (error) => {
                            console.error('❌ Approval failed:', error);
                            showToast('Approval failed: ' + error.message, 'error');
                            setIsApproving(false);
                        }
                    });
                } catch (error) {
                    console.error('❌ Approval operation failed:', error);
                    showToast('Approval operation failed: ' + (error as Error).message, 'error');
                    setIsApproving(false);
                }
            }
        } catch (error) {
            console.error('❌ Deposit operation failed:', error);
            showToast('Deposit operation failed: ' + (error as Error).message, 'error');
        }
    };

    // Execute actual deposit operation
    const executeDeposit = async (pool: Pool, amount: bigint, usdValue: string) => {
        try {
            if (pool.isNative) {
                // Native token deposit
                await writeContractDeposit({
                    address: pool.pool as `0x${string}`,
                    abi: LiquidityPoolABI,
                    functionName: 'depositNative',
                    value: amount,
                    args: [],
                }, {
                    onSuccess: async (txHash) => {
                        console.log('✅ Native token deposit transaction submitted:', txHash);
                        await handleDepositSuccess(txHash, pool.name, depositAmount, usdValue, pool.pool);
                    },
                    onError: (error) => {
                        console.error('❌ Deposit transaction failed:', error);
                        showToast('Native deposit transaction failed: ' + error.message, 'error');
                    }
                });
            } else {
                // ERC20 token deposit
                await writeContractDeposit({
                    address: pool.pool as `0x${string}`,
                    abi: LiquidityPoolABI,
                    functionName: 'deposit',
                    args: [amount]
                }, {
                    onSuccess: async (txHash) => {
                        console.log('✅ ERC20 deposit transaction submitted:', txHash);
                        await handleDepositSuccess(txHash, pool.name, depositAmount, usdValue, pool.pool);
                        setIsApproving(false);
                    },
                    onError: (error) => {
                        console.error('❌ Deposit transaction failed:', error);
                        showToast('ERC20 deposit transaction failed: ' + error.message, 'error');
                        setIsApproving(false);
                    }
                });
            }
        } catch (error) {
            console.error('❌ Execute deposit failed:', error);
            showToast('Execute deposit failed: ' + (error as Error).message, 'error');
            setIsApproving(false);
        }
    };

    // Handle successful deposit
    const handleDepositSuccess = async (txHash: string, poolName: string, amount: string, value: string, poolAddress: string) => {
        try {
            await createDepositTransaction(poolName, amount, value, poolAddress, txHash);
            console.log('📝 Transaction record created');
        } catch (error) {
            console.error('❌ Failed to create transaction record:', error);
        }
        
        showToast('Deposit transaction submitted successfully!', 'success');
        setIsDepositModalOpen(false);
        setDepositAmount('');
        setIsApproving(false);
        
        // Refresh data
        setTimeout(() => window.location.reload(), 2000);
    };

    const handleWithdraw = async () => {
        if (!selectedPool || !withdrawAmount || !address) return;
        
        try {
            const amount = ethers.parseUnits(withdrawAmount, 18);
            const usdValue = calculateUSDValue(withdrawAmount, selectedPool.name);
            
            console.log('🏃‍♂️ Starting withdraw operation:', {
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
                    console.log('✅ Withdraw transaction submitted:', txHash);
                    
                    // Create transaction record
                    try {
                        await createWithdrawTransaction(
                            selectedPool.name,
                            withdrawAmount,
                            usdValue,
                            selectedPool.pool,
                            txHash
                        );
                        console.log('📝 Transaction record created');
                    } catch (error) {
                        console.error('❌ Failed to create transaction record:', error);
                    }
                    
                    setIsWithdrawModalOpen(false);
                    setWithdrawAmount('');
                    
                    // Refresh data
                    window.location.reload();
                },
                onError: (error) => {
                    console.error('❌ Withdraw transaction failed:', error);
                    showToast('Withdraw transaction failed: ' + error.message, 'error');
                }
            });
        } catch (error) {
            console.error('❌ Withdraw operation failed:', error);
            showToast('Withdraw operation failed: ' + (error as Error).message, 'error');
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

    const handleMaxWithdraw = () => {
        if (selectedPool && userPositions[selectedPool.id]) {
            const maxAmount = parseFloat(userPositions[selectedPool.id]).toString();
            setWithdrawAmount(maxAmount);
        }
    };

    const getChainName = (chainId: number) => {
        switch (chainId) {
            case 97: return 'BSC Testnet';
            case 11155111: return 'Sepolia Testnet';
            default: return 'Unknown Network';
        }
    };

    // Handle Deposit Modal animation
    useEffect(() => {
        if (isDepositModalOpen) {
            setDepositModalActive(true);
        } else if (depositModalActive) {
            depositTimeoutRef.current = setTimeout(() => setDepositModalActive(false), 200);
        }
        return () => {
            if (depositTimeoutRef.current) clearTimeout(depositTimeoutRef.current);
        };
    }, [isDepositModalOpen]);

    // Handle Withdraw Modal animation
    useEffect(() => {
        if (isWithdrawModalOpen) {
            setWithdrawModalActive(true);
        } else if (withdrawModalActive) {
            withdrawTimeoutRef.current = setTimeout(() => setWithdrawModalActive(false), 200);
        }
        return () => {
            if (withdrawTimeoutRef.current) clearTimeout(withdrawTimeoutRef.current);
        };
    }, [isWithdrawModalOpen]);

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
                {(isDepositModalOpen || depositModalActive) && selectedPool && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(255, 255, 255, 0.25)',
                            backdropFilter: isDepositModalOpen ? 'blur(8px)' : 'blur(0px)',
                            WebkitBackdropFilter: isDepositModalOpen ? 'blur(8px)' : 'blur(0px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            opacity: isDepositModalOpen ? 1 : 0,
                            transition: 'opacity 0.2s ease, backdrop-filter 0.2s, -webkit-backdrop-filter 0.2s',
                        }}
                        onClick={() => {
                            setIsDepositModalOpen(false);
                            setDepositAmount('');
                            setIsApproving(false);
                        }}
                    >
                        <div
                            className="glass-card"
                            style={{
                                maxWidth: '400px',
                                width: '90%',
                                margin: '20px',
                                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)',
                                border: '1.5px solid var(--border-color)',
                                background: 'rgba(255,255,255,1)',
                                borderRadius: '20px',
                                position: 'relative',
                                transform: isDepositModalOpen ? 'scale(1)' : 'scale(0.96) translateY(20px)',
                                opacity: isDepositModalOpen ? 1 : 0,
                                transition: 'opacity 0.2s, transform 0.2s',
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => {
                                    setIsDepositModalOpen(false);
                                    setDepositAmount('');
                                    setIsApproving(false);
                                }}
                                style={{
                                    position: 'absolute',
                                    top: '16px',
                                    right: '16px',
                                    background: 'rgba(0, 0, 0, 0.1)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    cursor: 'pointer',
                                    fontSize: '18px',
                                    color: '#666'
                                }}
                            >
                                ×
                            </button>

                            {/* Title */}
                            <h3 style={{
                                margin: '0 0 20px 0',
                                fontSize: '20px',
                                fontWeight: 600,
                                color: '#1e1e1e'
                            }}>
                                Deposit {selectedPool.name}
                            </h3>

                            {/* Balance Display */}
                            <div style={{
                                backgroundColor: 'rgba(65, 102, 245, 0.08)',
                                borderRadius: '12px',
                                padding: '16px',
                                marginBottom: '20px'
                            }}>
                                <div style={{
                                    fontSize: '14px',
                                    color: '#7f8596',
                                    marginBottom: '4px'
                                }}>
                                    Available Balance
                                </div>
                                <div style={{
                                    fontSize: '18px',
                                    fontWeight: 600,
                                    color: '#1e1e1e'
                                }}>
                                    {parseFloat(userBalances[selectedPool.id] || '0').toFixed(6)} {selectedPool.name}
                                </div>
                            </div>

                            {/* Deposit Amount */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: '#1e1e1e'
                                }}>
                                    Deposit Amount
                                </label>
                                
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        placeholder="0.00"
                                        value={depositAmount}
                                        onChange={(e) => setDepositAmount(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '16px',
                                            paddingRight: '60px',
                                            fontSize: '18px',
                                            border: '2px solid #e9e7e2',
                                            borderRadius: '12px',
                                            outline: 'none',
                                            background: '#f1eee9',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    <button
                                        onClick={() => setDepositAmount(userBalances[selectedPool.id] || '0')}
                                        style={{
                                            position: 'absolute',
                                            right: '8px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: '#4166f5',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '6px 12px',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        MAX
                                    </button>
                                </div>
                                
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

                            {/* ERC20 Notice */}
                            {selectedPool && !selectedPool.isNative && (
                                <div style={{
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    marginBottom: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <i className="fas fa-info-circle" style={{ color: '#3b82f6' }}></i>
                                    <div style={{ fontSize: '14px', color: '#1d4ed8' }}>
                                        One-click deposit: Will approve token first, then deposit
                                    </div>
                                </div>
                            )}

                            {/* Deposit Button */}
                            <button 
                                onClick={handleDeposit}
                                disabled={!depositAmount || isPendingDeposit || isPendingApprove || isApproving}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    backgroundColor: (depositAmount && !isPendingDeposit && !isPendingApprove && !isApproving) ? '#4166f5' : '#ccc',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '16px',
                                    fontWeight: 600,
                                    cursor: (depositAmount && !isPendingDeposit && !isPendingApprove && !isApproving) ? 'pointer' : 'not-allowed'
                                }}
                            >
                                {(() => {
                                    if (isPendingApprove || isApproving) {
                                        return selectedPool?.isNative ? 'Depositing...' : 'Approving & Depositing...';
                                    }
                                    if (isPendingDeposit) {
                                        return 'Depositing...';
                                    }
                                    return selectedPool?.isNative ? 'Deposit to Pool' : 'Approve & Deposit';
                                })()}
                            </button>
                        </div>
                    </div>
                )}

                {/* Withdraw Modal */}
                {(isWithdrawModalOpen || withdrawModalActive) && selectedPool && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(255, 255, 255, 0.25)',
                            backdropFilter: isWithdrawModalOpen ? 'blur(8px)' : 'blur(0px)',
                            WebkitBackdropFilter: isWithdrawModalOpen ? 'blur(8px)' : 'blur(0px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            opacity: isWithdrawModalOpen ? 1 : 0,
                            transition: 'opacity 0.2s ease, backdrop-filter 0.2s, -webkit-backdrop-filter 0.2s',
                        }}
                        onClick={() => {
                            setIsWithdrawModalOpen(false);
                            setWithdrawAmount('');
                        }}
                    >
                        <div
                            className="glass-card"
                            style={{
                                maxWidth: '400px',
                                width: '90%',
                                margin: '20px',
                                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)',
                                border: '1.5px solid var(--border-color)',
                                background: 'rgba(255,255,255,1)',
                                borderRadius: '20px',
                                position: 'relative',
                                transform: isWithdrawModalOpen ? 'scale(1)' : 'scale(0.96) translateY(20px)',
                                opacity: isWithdrawModalOpen ? 1 : 0,
                                transition: 'opacity 0.2s, transform 0.2s',
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => {
                                    setIsWithdrawModalOpen(false);
                                    setWithdrawAmount('');
                                }}
                                style={{
                                    position: 'absolute',
                                    top: '16px',
                                    right: '16px',
                                    background: 'rgba(0, 0, 0, 0.1)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    cursor: 'pointer',
                                    fontSize: '18px',
                                    color: '#666'
                                }}
                            >
                                ×
                            </button>

                            {/* Title */}
                            <h3 style={{
                                margin: '0 0 20px 0',
                                fontSize: '20px',
                                fontWeight: 600,
                                color: '#1e1e1e'
                            }}>
                                Withdraw {selectedPool.name}
                            </h3>

                            {/* Available to Withdraw Display */}
                            <div style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                borderRadius: '12px',
                                padding: '16px',
                                marginBottom: '16px'
                            }}>
                                <div style={{
                                    fontSize: '14px',
                                    color: '#7f8596',
                                    marginBottom: '4px'
                                }}>
                                    Available to Withdraw
                                </div>
                                <div style={{
                                    fontSize: '18px',
                                    fontWeight: 600,
                                    color: '#1e1e1e'
                                }}>
                                    {parseFloat(userPositions[selectedPool.id] || '0').toFixed(6)} {selectedPool.name}
                                </div>
                            </div>

                            {/* Current Wallet Balance Display */}
                            <div style={{
                                backgroundColor: 'rgba(65, 102, 245, 0.08)',
                                borderRadius: '12px',
                                padding: '16px',
                                marginBottom: '20px'
                            }}>
                                <div style={{
                                    fontSize: '14px',
                                    color: '#7f8596',
                                    marginBottom: '4px'
                                }}>
                                    Current Wallet Balance
                                </div>
                                <div style={{
                                    fontSize: '18px',
                                    fontWeight: 600,
                                    color: '#1e1e1e'
                                }}>
                                    {parseFloat(userBalances[selectedPool.id] || '0').toFixed(6)} {selectedPool.name}
                                </div>
                            </div>

                            {/* Withdraw Amount */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: '#1e1e1e'
                                }}>
                                    Withdraw Amount
                                </label>
                                
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        placeholder="0.00"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '16px',
                                            paddingRight: '60px',
                                            fontSize: '18px',
                                            border: '2px solid #e9e7e2',
                                            borderRadius: '12px',
                                            outline: 'none',
                                            background: '#f1eee9',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    <button
                                        onClick={() => setWithdrawAmount(userPositions[selectedPool.id] || '0')}
                                        style={{
                                            position: 'absolute',
                                            right: '8px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: '#ef4444',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '6px 12px',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        MAX
                                    </button>
                                </div>
                                
                                {withdrawAmount && (
                                    <div style={{
                                        fontSize: '12px',
                                        color: 'var(--secondary-text)',
                                        marginTop: '4px'
                                    }}>
                                        ≈ {calculateUSDValue(withdrawAmount, selectedPool.name)}
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={handleWithdraw}
                                disabled={!withdrawAmount || isPendingWithdraw || parseFloat(withdrawAmount) > parseFloat(userPositions[selectedPool.id] || '0')}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    backgroundColor: withdrawAmount && !isPendingWithdraw && parseFloat(withdrawAmount) <= parseFloat(userPositions[selectedPool.id] || '0') ? '#4166f5' : '#ccc',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '16px',
                                    fontWeight: 600,
                                    cursor: withdrawAmount && !isPendingWithdraw && parseFloat(withdrawAmount) <= parseFloat(userPositions[selectedPool.id] || '0') ? 'pointer' : 'not-allowed'
                                }}
                            >
                                {isPendingWithdraw ? 'Withdrawing...' : 'Withdraw from Pool'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Toast Container for notifications */}
            <ToastContainer />

            {/* Deposit Modal */}
            {isDepositModalOpen && selectedPool && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px'
                }} onClick={() => setIsDepositModalOpen(false)}>
                    <div style={{
                        background: 'var(--bg-glass-strong)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-glass-strong)',
                        padding: '24px',
                        maxWidth: '400px',
                        width: '100%',
                        boxShadow: 'var(--shadow-large)'
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px'
                        }}>
                            <h3 style={{
                                fontSize: '20px',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                margin: 0
                            }}>
                                Deposit {selectedPool.name}
                            </h3>
                            <button
                                onClick={() => setIsDepositModalOpen(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    padding: '4px'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: 500,
                                color: 'var(--text-primary)',
                                marginBottom: '8px'
                            }}>
                                Amount
                            </label>
                            <input
                                type="number"
                                value={depositAmount}
                                onChange={(e) => setDepositAmount(e.target.value)}
                                placeholder="0.0"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-glass-strong)',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '16px'
                                }}
                            />
                            <div style={{
                                fontSize: '12px',
                                color: 'var(--text-secondary)',
                                marginTop: '4px'
                            }}>
                                Available: <LoadingValue
                                    isLoading={loadingBalances[selectedPool.id] || false}
                                    value={userBalances[selectedPool.id] ? parseFloat(userBalances[selectedPool.id]).toFixed(4) : '0'}
                                /> {selectedPool.name}
                            </div>
                            {depositAmount && (
                                <div style={{
                                    fontSize: '12px',
                                    color: 'var(--text-secondary)',
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
                                onClick={() => setIsDepositModalOpen(false)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-glass-strong)',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeposit}
                                disabled={!depositAmount || isPendingDeposit || isPendingApprove || isApproving}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: 'var(--radius-md)',
                                    border: 'none',
                                    background: 'var(--accent-gradient)',
                                    color: 'white',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    opacity: (!depositAmount || isPendingDeposit || isPendingApprove || isApproving) ? 0.5 : 1
                                }}
                            >
                                {isPendingDeposit || isPendingApprove || isApproving ? 'Processing...' : 'Deposit'}
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
                    background: 'rgba(0, 0, 0, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px'
                }} onClick={() => setIsWithdrawModalOpen(false)}>
                    <div style={{
                        background: 'var(--bg-glass-strong)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-glass-strong)',
                        padding: '24px',
                        maxWidth: '400px',
                        width: '100%',
                        boxShadow: 'var(--shadow-large)'
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px'
                        }}>
                            <h3 style={{
                                fontSize: '20px',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                margin: 0
                            }}>
                                Withdraw {selectedPool.name}
                            </h3>
                            <button
                                onClick={() => setIsWithdrawModalOpen(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    padding: '4px'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: 500,
                                color: 'var(--text-primary)',
                                marginBottom: '8px'
                            }}>
                                Amount
                            </label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="number"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    placeholder="0.0"
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-glass-strong)',
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        fontSize: '16px'
                                    }}
                                />
                                <button
                                    onClick={handleMaxWithdraw}
                                    style={{
                                        padding: '12px 16px',
                                        borderRadius: 'var(--radius-md)',
                                        border: 'none',
                                        background: 'var(--accent-gradient)',
                                        color: 'white',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    MAX
                                </button>
                            </div>
                            <div style={{
                                fontSize: '12px',
                                color: 'var(--text-secondary)',
                                marginTop: '4px'
                            }}>
                                Your position: <LoadingValue
                                    isLoading={loadingPositions[selectedPool.id] || false}
                                    value={userPositions[selectedPool.id] ? parseFloat(userPositions[selectedPool.id]).toFixed(4) : '0'}
                                /> {selectedPool.name}
                            </div>
                            {withdrawAmount && (
                                <div style={{
                                    fontSize: '12px',
                                    color: 'var(--text-secondary)',
                                    marginTop: '4px'
                                }}>
                                    ≈ {calculateUSDValue(withdrawAmount, selectedPool.name)}
                                </div>
                            )}
                        </div>

                        <div style={{
                            display: 'flex',
                            gap: '12px'
                        }}>
                            <button
                                onClick={() => setIsWithdrawModalOpen(false)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-glass-strong)',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleWithdraw}
                                disabled={!withdrawAmount || isPendingWithdraw}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: 'var(--radius-md)',
                                    border: 'none',
                                    background: 'var(--accent-gradient)',
                                    color: 'white',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    opacity: (!withdrawAmount || isPendingWithdraw) ? 0.5 : 1
                                }}
                            >
                                {isPendingWithdraw ? 'Processing...' : 'Withdraw'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Pools;
