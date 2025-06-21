import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Layout from '../components/Layout';
import { BigNumberish, ethers, formatUnits } from 'ethers';
import { useAccount, useChainId, useReadContract, useWriteContract } from 'wagmi';
import LiquidityPoolABI  from '../abi/LiquidityPool.json';
import ERC20ABI from '../abi/ERC20.json';
import { poolList } from  '../config';
import { getBalance, getUserAssetBalance } from '../utils/balance';
import { getPoolTvl, getUserPosition } from '../utils/pool';

// 动态导入BalanceDebugger，禁用SSR
const BalanceDebugger = dynamic(() => import('../components/BalanceDebugger'), {
    ssr: false
});

const Pools: React.FC = () => {
    const [depositAmount, setDepositAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [selectedPool, setSelectedPool] = useState<any>();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'deposit' | 'withdraw'>('deposit');
    const [depositing, setDepositing] = useState(false);
    const [withdrawing, setWithdrawing] = useState(false);
    const [realBalance, setRealBalance] = useState<string>('0');
    const [isClient, setIsClient] = useState(false);
    const [poolsLoading, setPoolsLoading] = useState(true);

    const { address } = useAccount();
    const [pools, setPools] = useState<any[]>([]);
    const chainId = useChainId();

    // 防止hydration错误
    useEffect(() => {
        setIsClient(true);
    }, []);

    // 获取选中池子的真实余额
    useEffect(() => {
        async function fetchRealBalance() {
            if (!isClient || !address || !selectedPool) {
                setRealBalance('0');
                return;
            }
            
            try {
                console.log("🔥 获取真实余额:", selectedPool.name);
                const balance = await getUserAssetBalance(
                    selectedPool.address, 
                    address, 
                    selectedPool.chainId, 
                    selectedPool.isNative
                );
                const formattedBalance = formatUnits(balance, 18);
                setRealBalance(formattedBalance);
                console.log(`✅ ${selectedPool.name} 真实余额:`, formattedBalance);
            } catch (error) {
                console.error("❌ 获取真实余额失败:", error);
                setRealBalance('0');
            }
        }
        
        fetchRealBalance();
    }, [isClient, address, selectedPool]);

    const showModal = (type: 'deposit' | 'withdraw', pool: any) => {
        console.log('showModal called:', type, pool.name);
        setSelectedPool(pool);
        setModalType(type);
        setIsModalVisible(true);
        console.log('Modal state set to:', true);
    };

    const { writeContract: writeDeposit, isPending: isDepositPending } = useWriteContract();
    const { writeContract: writeWithdraw, isPending: isWithdrawPending } = useWriteContract();
    const { writeContract: writeApprove, isPending: isApprovePending } = useWriteContract();


    const { data: allowance } = useReadContract({
        address: selectedPool?.address,
        abi: ERC20ABI,
        functionName: 'allowance',
        args: [address, selectedPool?.pool],
        query: { enabled: !!address && !!selectedPool},
    });

    const handleOk = () => {
        setIsModalVisible(false);
    };

    const handlePool = async () => {
        if (!selectedPool) return;
        if (modalType === 'deposit') {
            setDepositing(true);
            try {
                if (selectedPool.isNative) {
                    // Deposit native token (ETH/BNB)
                    await writeDeposit({
                        address: selectedPool.pool,
                        abi: LiquidityPoolABI,
                        functionName: 'depositNative',
                        args: [],
                        value: ethers.parseUnits(depositAmount), // Send native token value
                    });
                } else {
                    // Deposit ERC20 token
                    if (!allowance || (allowance as BigNumberish) < (ethers.parseUnits(depositAmount) as BigNumberish)) {
                        await writeApprove({
                            address: selectedPool.address,
                            abi: ERC20ABI,
                            functionName: 'approve',
                            args: [selectedPool.pool, ethers.parseUnits(depositAmount)],
                        });
                    }
                    await writeDeposit({
                        address: selectedPool.pool,
                        abi: LiquidityPoolABI,
                        functionName: 'deposit',
                        args: [ethers.parseUnits(depositAmount)],
                    });
                }
            } finally {
                setDepositing(false);
            }
        } else {
            setWithdrawing(true);
            try {
                if (selectedPool.isNative) {
                    // Withdraw native token (ETH/BNB)
                    await writeWithdraw({
                        address: selectedPool.pool,
                        abi: LiquidityPoolABI,
                        functionName: 'withdrawNative',
                        args: [ethers.parseUnits(withdrawAmount)],
                    });
                } else {
                    // Withdraw ERC20 token
                    await writeWithdraw({
                        address: selectedPool.pool,
                        abi: LiquidityPoolABI,
                        functionName: 'withdraw',
                        args: [ethers.parseUnits(withdrawAmount)],
                    });
                }
            } finally {
                setWithdrawing(false);
            }
        }
        setIsModalVisible(false);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setDepositAmount('');
        setWithdrawAmount('');
    };
    const isAmountValid = true;

    useEffect(() => {
        async function fetchPools() {
          if (!isClient) return;
          
          setPoolsLoading(true);
          try {
            const poolsWithData = await Promise.all(
              poolList.filter( pool => {
                  if (pool.chainId == chainId) return true;
                  return false;
               }
              ).map(async (pool) => {
                const shares  = await getBalance(pool.pool, address, pool.chainId);
                const tvl = await getPoolTvl(pool);
                const userPosition = await getUserPosition(pool, address);
                return {
                  ...pool,
                  tvl: tvl ? formatUnits(tvl, 18) : '$0',
                  userPosition: userPosition && userPosition.toString() !== '0' ? formatUnits(userPosition, 18) : '0',
                  shares: shares ? formatUnits(shares, 18) : '0',
                };
              })
            );
            setPools(poolsWithData);
          } catch (error) {
            console.error("Failed to fetch pools:", error);
          } finally {
            setPoolsLoading(false);
          }
        }
        fetchPools();
      }, [isClient, chainId, address]);

    return (
        <Layout>
            <BalanceDebugger />
            <div className="container">
                <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <h2 style={{ 
                        marginBottom: '24px', 
                        fontSize: '28px',
                        fontWeight: 600,
                        color: 'var(--text-color)'
                    }}>
                        Liquidity Pools Overview
                    </h2>
                    
                    <div style={{ 
                        display: 'grid',
                        gap: '20px',
                        marginBottom: '24px'
                    }}>
                        {poolsLoading ? (
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.6)',
                                borderRadius: '16px',
                                padding: '20px',
                                textAlign: 'center',
                                color: 'var(--secondary-text)'
                            }}>
                                加载中...
                            </div>
                        ) : pools.map((pool) => (
                            <div key={pool.id} style={{
                                background: 'rgba(255, 255, 255, 0.6)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '16px',
                                padding: '20px',
                                border: '1px solid var(--border-color)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '16px'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {pool.tokens.map((token: string, index: number) => (
                                                <div key={token} className="token-icon placeholder">{token}</div>
                                            ))}
                                        </div>
                                        <span style={{
                                            fontSize: '18px',
                                            fontWeight: 600,
                                            color: 'var(--text-color)'
                                        }}>
                                            {pool.name}
                                        </span>
                                    </div>
                                    <div style={{
                                        padding: '6px 12px',
                                        background: 'rgba(34, 197, 94, 0.15)',
                                        color: '#22c55e',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: 600
                                    }}>
                                        APY: {pool.apy}
                                    </div>
                                </div>
                                
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: '16px'
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
                                            fontSize: '16px',
                                            fontWeight: 600,
                                            color: 'var(--text-color)'
                                        }}>
                                            {pool.tvl}
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
                                            fontSize: '16px',
                                            fontWeight: 600,
                                            color: pool.userPosition === '$0' ? 'var(--secondary-text)' : 'var(--text-color)'
                                        }}>
                                            {pool.userPosition}
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
                                            fontSize: '16px',
                                            fontWeight: 600,
                                            color: 'var(--text-color)'
                                        }}>
                                            {pool.volume24h}
                                        </div>
                                    </div>
                                </div>
                                
                                <div style={{
                                    display: 'flex',
                                    gap: '12px',
                                    marginTop: '16px'
                                }}>
                                    <button className="button secondary" style={{
                                        flex: 1,
                                        padding: '10px 16px',
                                        fontSize: '14px'
                                    }} onClick={() => showModal('deposit', pool)}>
                                        Deposit
                                    </button>
                                    <button className="button" style={{
                                        flex: 1,
                                        padding: '10px 16px',
                                        fontSize: '14px'
                                    }} onClick={() => showModal('withdraw', pool)}>
                                        Withdraw
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>

                {/* Custom Modal */}
                {isModalVisible && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }} onClick={handleCancel}>
                        <div style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(20px)',
                            borderRadius: '20px',
                            padding: '24px',
                            width: '400px',
                            maxWidth: '90vw',
                            position: 'relative',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)'
                        }} onClick={(e) => e.stopPropagation()}>
                            
                            {/* Close Button */}
                            <button
                                onClick={handleCancel}
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
                                {modalType === 'deposit' ? 'Deposit' : 'Withdraw'} - {selectedPool?.name} Pool
                            </h3>

                            {modalType === 'deposit' ? (
                                <div>
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
                                            Your Balance
                                        </div>
                                        <div style={{
                                            fontSize: '18px',
                                            fontWeight: 600,
                                            color: '#1e1e1e'
                                        }}>
                                            {isClient ? realBalance : '0.000000'} {selectedPool?.name || 'TOKEN'}
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
                                                    background: '#f1eee9'
                                                }}
                                            />
                                            <button
                                                onClick={() => setDepositAmount(isClient ? realBalance : '0')}
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
                                    </div>

                                    {/* Deposit Button */}
                                    <button 
                                        onClick={handlePool}
                                        disabled={!depositAmount || depositing}
                                        style={{
                                            width: '100%',
                                            padding: '16px',
                                            backgroundColor: depositAmount && !depositing ? '#4166f5' : '#ccc',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '12px',
                                            fontSize: '16px',
                                            fontWeight: 600,
                                            cursor: depositAmount && !depositing ? 'pointer' : 'not-allowed'
                                        }}
                                    >
                                        {depositing ? 'Depositing...' : 'Deposit to Pool'}
                                    </button>
                                </div>
                            ) : (
                                <div>
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
                                            {selectedPool ? 
                                                (pools.find(p => p.id === selectedPool.id)?.shares || '0') 
                                                : '0'
                                            } {selectedPool?.name || 'TOKEN'}
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
                                            {isClient ? realBalance : '0.000000'} {selectedPool?.name || 'TOKEN'}
                                        </div>
                                    </div>

                                    {/* Withdraw content */}
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
                                                    background: '#f1eee9'
                                                }}
                                            />
                                            <button
                                                onClick={() => {
                                                    const availableToWithdraw = selectedPool ? 
                                                        (pools.find(p => p.id === selectedPool.id)?.shares || '0') 
                                                        : '0';
                                                    setWithdrawAmount(availableToWithdraw);
                                                }}
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
                                    </div>

                                    <button 
                                        onClick={handlePool}
                                        disabled={!withdrawAmount || withdrawing}
                                        style={{
                                            width: '100%',
                                            padding: '16px',
                                            backgroundColor: withdrawAmount && !withdrawing ? '#4166f5' : '#ccc',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '12px',
                                            fontSize: '16px',
                                            fontWeight: 600,
                                            cursor: withdrawAmount && !withdrawing ? 'pointer' : 'not-allowed'
                                        }}
                                    >
                                        {withdrawing ? 'Withdrawing...' : 'Withdraw from Pool'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Pools;
