import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from 'antd';
import Layout from '../components/Layout';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import LiquidityPoolABI  from '../abi/LiquidityPool.json';
import ERC20ABI from '../abi/ERC20.json';
import { poolList } from '../config';
import { ethers } from 'ethers';
import { getBalance, getPoolTvl, getUserPosition } from '../utils/pool';
import { formatUnits } from 'ethers';
import { getUserAssetBalance } from '../utils/balance';

const Pools: React.FC = () => {
    const { address, chainId } = useAccount();
    const [pools, setPools] = useState<any[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'deposit' | 'withdraw'>('deposit');
    const [selectedPool, setSelectedPool] = useState<any>(null);
    const [depositAmount, setDepositAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [depositing, setDepositing] = useState(false);
    const [withdrawing, setWithdrawing] = useState(false);
    const [userBalance, setUserBalance] = useState('0');
    const [loading, setLoading] = useState(false);
    const [forceClose, setForceClose] = useState(0);
    const [notification, setNotification] = useState<{
        type: 'success' | 'error' | 'info';
        message: string;
        hash?: string;
    } | null>(null);

    const showModal = async (type: 'deposit' | 'withdraw', pool: any) => {
        console.log('Opening modal for pool:', pool.name, 'type:', type);
        console.log('User address:', address);
        console.log('Chain ID:', chainId);
        
        setModalType(type);
        setSelectedPool(pool);
        setLoading(true);
        
        // Get user balance
        try {
            let balance;
            if (type === 'deposit') {
                // Get original token balance
                console.log('Getting token balance for:', pool.address);
                balance = await getUserAssetBalance(pool.address, address, chainId, false);
                console.log('Token balance result:', balance);
            } else {
                // Get LP token balance
                console.log('Getting LP balance for:', pool.pool);
                balance = await getBalance(pool.pool, address, chainId);
                console.log('LP balance result:', balance);
            }
            
            if (balance && balance !== '0') {
                const formattedBalance = formatUnits(balance, 18);
                console.log('Formatted balance:', formattedBalance);
                setUserBalance(formattedBalance);
            } else {
                console.log('Balance is 0 or null');
                setUserBalance('0');
            }
        } catch (error) {
            console.error('Error fetching balance:', error);
            setUserBalance('0');
        }
        
        setLoading(false);
        setForceClose(0);
        setIsModalVisible(true);
    };

    const { writeContract: writeDeposit, isPending: isDepositPending, data: depositHash } = useWriteContract();
    const { writeContract: writeWithdraw, isPending: isWithdrawPending, data: withdrawHash } = useWriteContract();
    const { writeContract: writeApprove, isPending: isApprovePending, data: approveHash } = useWriteContract();


    const { data: allowance } = useReadContract({
        address: selectedPool?.address as `0x${string}`,
        abi: ERC20ABI,
        functionName: 'allowance',
        args: [address as `0x${string}`, selectedPool?.pool as `0x${string}`],
        query: { enabled: !!address && !!selectedPool && !!selectedPool.address && !!selectedPool.pool},
    });

    const handleOk = () => {
        setIsModalVisible(false);
    }

    const handlePool = async () => {
        if (modalType === 'deposit') {
            setDepositing(true);
            console.log('=== DEPOSIT TRANSACTION START ===');
            console.log('Deposit Amount:', depositAmount);
            console.log('Selected Pool:', selectedPool);
            console.log('Token Address:', selectedPool?.address);
            console.log('User Address:', address);
            console.log('Chain ID:', chainId);
            console.log('Current Time:', new Date().toISOString());
            
            try {
                const depositAmountWei = ethers.parseUnits(depositAmount, 18);
                console.log('Deposit Amount in Wei:', depositAmountWei.toString());

                // All tokens are handled as ERC20
                console.log('Current allowance from hook:', allowance?.toString());
                const currentAllowance = allowance ? BigInt(allowance.toString()) : BigInt(0);
                const requiredAmount = BigInt(depositAmountWei.toString());
                
                console.log('Allowance check:', {
                    currentAllowance: currentAllowance.toString(),
                    requiredAmount: requiredAmount.toString(),
                    sufficient: currentAllowance >= requiredAmount
                });
                
                if (currentAllowance < requiredAmount) {
                    console.log('Insufficient allowance, approving token transfer...');
                    console.log('Current allowance:', currentAllowance.toString());
                    console.log('Required amount:', requiredAmount.toString());
                    console.log('Token address:', selectedPool.address);
                    console.log('Pool address:', selectedPool.pool);
                    
                    try {
                        const approvalTx = await writeApprove({
                            address: selectedPool.address as `0x${string}`,
                            abi: ERC20ABI,
                            functionName: 'approve',
                            args: [selectedPool.pool as `0x${string}`, requiredAmount],
                        });
                        console.log('Approval transaction sent:', approvalTx);
                        
                        setNotification({
                            type: 'info',
                            message: 'Approval transaction sent. Please wait for confirmation and then try deposit again.'
                        });
                    } catch (approveError) {
                        console.error('Approval transaction error:', approveError);
                        setNotification({
                            type: 'error',
                            message: 'Approval failed: ' + (approveError as Error).message
                        });
                    }
                    
                    // Wait for approval completion before deposit
                    console.log('Approval transaction sent, waiting for confirmation...');
                    return; // User needs to click deposit button again
                }

                console.log('Depositing to pool...');
                console.log('Pool contract:', selectedPool.pool);
                console.log('Deposit amount:', depositAmountWei.toString());
                
                try {
                    const depositTx = await writeDeposit({
                        address: selectedPool.pool as `0x${string}`,
                        abi: LiquidityPoolABI,
                        functionName: 'deposit',
                        args: [depositAmountWei],
                    });
                    console.log('Deposit transaction sent:', depositTx);
                } catch (txError) {
                    console.error('Deposit transaction error:', txError);
                    setNotification({
                        type: 'error',
                        message: 'Deposit failed: ' + (txError as Error).message
                    });
                }
            } catch (error) {
                console.error('Deposit error:', error);
            } finally {
                setDepositing(false);
            }
        } else {
            try {
                setWithdrawing(true);
                const withdrawAmountWei = ethers.parseUnits(withdrawAmount, 18);
                console.log('Withdraw Amount in Wei:', withdrawAmountWei.toString());
                
                // Handle withdraw logic
                await writeWithdraw({
                    address: selectedPool.pool as `0x${string}`,
                    abi: LiquidityPoolABI,
                    functionName: 'withdraw',
                    args: [withdrawAmountWei],
                });
            } catch (error) {
                console.error('Withdraw error:', error);
            } finally {
                setWithdrawing(false);
            }
        }
        // Modal will close automatically after successful transaction
    };

    const handleCancel = useCallback(() => {
        console.log('handleCancel called, current modal state:', isModalVisible);
        
        // Set state immediately
        setIsModalVisible(false);
        setDepositAmount('');
        setWithdrawAmount('');
        setUserBalance('0');
        setLoading(false);
        
        console.log('Modal close initiated');
        
        // Ensure state is correctly set
        setTimeout(() => {
            setIsModalVisible(false);
            console.log('Force close modal');
        }, 10);
    }, [isModalVisible]);
    const isAmountValid = true;

    // Handle successful transaction callbacks
    useEffect(() => {
        if (depositHash) {
            console.log('Deposit transaction successful:', depositHash);
            setNotification({
                type: 'success',
                message: 'Deposit successful!',
                hash: depositHash
            });
            setDepositAmount('');
            setIsModalVisible(false);
            setForceClose(prev => prev + 1);
            // Refresh pools data
            setTimeout(() => {
                window.location.reload();
            }, 3000);
        }
    }, [depositHash]);

    useEffect(() => {
        if (withdrawHash) {
            console.log('Withdraw transaction successful:', withdrawHash);
            setNotification({
                type: 'success',
                message: 'Withdraw successful!',
                hash: withdrawHash
            });
            setWithdrawAmount('');
            setIsModalVisible(false);
            setForceClose(prev => prev + 1);
            // Refresh pools data
            setTimeout(() => {
                window.location.reload();
            }, 3000);
        }
    }, [withdrawHash]);

    useEffect(() => {
        if (approveHash) {
            console.log('Approval transaction successful:', approveHash);
            setNotification({
                type: 'success',
                message: 'Approval successful! You can now deposit.',
                hash: approveHash
            });
        }
    }, [approveHash]);

    // Auto close notification
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 5000); // Auto close after 5 seconds
            
            return () => clearTimeout(timer);
        }
    }, [notification]);

    useEffect(() => {
        async function fetchPools() {
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
                userPosition: userPosition ? formatUnits(userPosition, 18) : '0',
                shares: shares ? formatUnits(shares, 18) : '0',
              };
            })
          );
          setPools(poolsWithData);
        }
        fetchPools();
      }, []);

    return (
        <Layout>
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
                        {pools.map((pool) => (
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

                {/* Pool Actions Section */}
                <Modal
                    key={`modal-${forceClose}`}
                    open={isModalVisible}
                    onCancel={() => {
                        console.log('Modal onCancel triggered');
                        setIsModalVisible(false);
                        setForceClose(prev => prev + 1);
                    }}
                    footer={null}
                    centered
                    width={480}
                    wrapClassName="custom-modal"
                    closable={false}
                    maskClosable={true}
                    keyboard={true}
                    destroyOnClose={true}
                    style={{
                        top: '50%',
                        transform: 'translateY(-50%)',
                    }}
                    bodyStyle={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '20px',
                        padding: '0',
                    }}
                >
                    <div style={{ position: 'relative' }}>
                        {/* Close Button */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Close button clicked - forcing close');
                                console.log('Current modal state:', isModalVisible);
                                setIsModalVisible(false);
                                setForceClose(prev => prev + 1);
                                console.log('After setting false, state should be:', false);
                            }}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                background: 'rgba(0, 0, 0, 0.1)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '40px',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#666',
                                fontSize: '24px',
                                fontWeight: 'bold',
                                zIndex: 99999,
                                userSelect: 'none'
                            }}
                        >
                            ×
                        </button>
                        
                        {/* Custom Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-start',
                            alignItems: 'center',
                            padding: '24px 24px 16px 24px',
                            borderBottom: '1px solid rgba(0, 0, 0, 0.08)'
                        }}>
                            <div>
                                <h3 style={{
                                    margin: 0,
                                    fontSize: '20px',
                                    fontWeight: 600,
                                    color: 'var(--text-color)'
                                }}>
                                    {modalType === 'deposit' ? 'Deposit' : 'Withdraw'}
                                </h3>
                                <p style={{
                                    margin: '4px 0 0 0',
                                    fontSize: '14px',
                                    color: 'var(--secondary-text)'
                                }}>
                                    {selectedPool?.name} Pool
                                </p>
                            </div>
                        </div>

                        {/* Content */}
                        <div style={{ padding: '20px 24px 24px 24px' }}>
                            {modalType === 'deposit' ? (
                                <>
                                    {/* Balance Info */}
                                    <div style={{
                                        background: 'rgba(65, 102, 245, 0.08)',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        marginBottom: '20px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div>
                                            <div style={{
                                                fontSize: '12px',
                                                color: 'var(--secondary-text)',
                                                marginBottom: '4px'
                                            }}>
                                                Your Balance
                                            </div>
                                            <div style={{
                                                fontSize: '16px',
                                                fontWeight: 600,
                                                color: 'var(--text-color)'
                                            }}>
                                                {loading ? 'Loading...' : `${parseFloat(userBalance).toFixed(4)} ${selectedPool?.tokens?.[0] || 'TOKEN'}`}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setDepositAmount(userBalance)}
                                            style={{
                                                background: 'var(--accent-color)',
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

                                    {/* Amount Input */}
                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{
                                            display: 'block',
                                            marginBottom: '12px',
                                            fontSize: '14px',
                                            color: 'var(--text-color)',
                                            fontWeight: 500
                                        }}>
                                            Deposit Amount
                                        </label>
                                        <div style={{
                                            background: 'rgba(241, 238, 233, 0.8)',
                                            borderRadius: '16px',
                                            padding: '20px',
                                            border: '2px solid transparent',
                                            transition: 'all 0.2s ease'
                                        }}>
                                            <input
                                                type="text"
                                                placeholder="0.00"
                                                value={depositAmount}
                                                onChange={(e) => setDepositAmount(e.target.value)}
                                                style={{
                                                    fontSize: '28px',
                                                    fontWeight: 300,
                                                    width: '100%',
                                                    border: 'none',
                                                    background: 'transparent',
                                                    color: 'var(--text-color)',
                                                    outline: 'none',
                                                    marginBottom: '8px'
                                                }}
                                            />
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <div style={{
                                                    fontSize: '14px',
                                                    color: 'var(--secondary-text)'
                                                }}>
                                                    ≈ ${(parseFloat(depositAmount) * 3000 || 0).toFixed(2)}
                                                </div>
                                                <div style={{
                                                    fontSize: '12px',
                                                    color: 'var(--secondary-text)'
                                                }}>
                                                    {selectedPool?.tokens?.[0] || 'TOKEN'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pool Info */}
                                    <div style={{
                                        background: 'rgba(255, 255, 255, 0.6)',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        marginBottom: '24px'
                                    }}>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: '16px'
                                        }}>
                                            <div>
                                                <div style={{
                                                    fontSize: '12px',
                                                    color: 'var(--secondary-text)',
                                                    marginBottom: '4px'
                                                }}>
                                                    Pool APY
                                                </div>
                                                <div style={{
                                                    fontSize: '16px',
                                                    fontWeight: 600,
                                                    color: 'var(--success-color)'
                                                }}>
                                                    {selectedPool?.apy || '8.3%'}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{
                                                    fontSize: '12px',
                                                    color: 'var(--secondary-text)',
                                                    marginBottom: '4px'
                                                }}>
                                                    Pool TVL
                                                </div>
                                                <div style={{
                                                    fontSize: '16px',
                                                    fontWeight: 600,
                                                    color: 'var(--text-color)'
                                                }}>
                                                    {selectedPool?.tvl || '$0'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <button
                                        onClick={handlePool}
                                        disabled={!isAmountValid || !depositAmount || parseFloat(depositAmount) <= 0}
                                        className="button"
                                        style={{
                                            width: '100%',
                                            padding: '16px',
                                            fontSize: '16px',
                                            fontWeight: 600,
                                            background: depositing ? 'var(--disabled-color)' : 'var(--accent-color)',
                                            cursor: depositing ? 'not-allowed' : 'pointer',
                                            opacity: depositing ? 0.6 : 1
                                        }}
                                    >
                                        {depositing ? 'Depositing...' : 'Deposit'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    {/* Withdraw form */}
                                    <div style={{
                                        background: 'rgba(65, 102, 245, 0.08)',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        marginBottom: '20px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <div>
                                            <div style={{
                                                fontSize: '12px',
                                                color: 'var(--secondary-text)',
                                                marginBottom: '4px'
                                            }}>
                                                Your LP Balance
                                            </div>
                                            <div style={{
                                                fontSize: '16px',
                                                fontWeight: 600,
                                                color: 'var(--text-color)'
                                            }}>
                                                {loading ? 'Loading...' : `${parseFloat(userBalance).toFixed(4)} LP`}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setWithdrawAmount(userBalance)}
                                            style={{
                                                background: 'var(--accent-color)',
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

                                    <div style={{ marginBottom: '20px' }}>
                                        <label style={{
                                            display: 'block',
                                            marginBottom: '12px',
                                            fontSize: '14px',
                                            color: 'var(--text-color)',
                                            fontWeight: 500
                                        }}>
                                            Withdraw Amount
                                        </label>
                                        <div style={{
                                            background: 'rgba(241, 238, 233, 0.8)',
                                            borderRadius: '16px',
                                            padding: '20px',
                                            border: '2px solid transparent',
                                            transition: 'all 0.2s ease'
                                        }}>
                                            <input
                                                type="text"
                                                placeholder="0.00"
                                                value={withdrawAmount}
                                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                                style={{
                                                    fontSize: '28px',
                                                    fontWeight: 300,
                                                    width: '100%',
                                                    border: 'none',
                                                    background: 'transparent',
                                                    color: 'var(--text-color)',
                                                    outline: 'none',
                                                    marginBottom: '8px'
                                                }}
                                            />
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <div style={{
                                                    fontSize: '14px',
                                                    color: 'var(--secondary-text)'
                                                }}>
                                                    LP Tokens
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handlePool}
                                        disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0}
                                        className="button"
                                        style={{
                                            width: '100%',
                                            padding: '16px',
                                            fontSize: '16px',
                                            fontWeight: 600,
                                            background: withdrawing ? 'var(--disabled-color)' : 'var(--accent-color)',
                                            cursor: withdrawing ? 'not-allowed' : 'pointer',
                                            opacity: withdrawing ? 0.6 : 1
                                        }}
                                    >
                                        {withdrawing ? 'Withdrawing...' : 'Withdraw'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </Modal>

                {/* Notification */}
                {notification && (
                    <div style={{
                        position: 'fixed',
                        top: '20px',
                        right: '20px',
                        background: notification.type === 'success' ? '#10B981' : 
                                   notification.type === 'error' ? '#EF4444' : '#3B82F6',
                        color: 'white',
                        padding: '16px 20px',
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                        zIndex: 10000,
                        maxWidth: '400px',
                        fontSize: '14px',
                        fontWeight: 500
                    }}>
                        {notification.message}
                        {notification.hash && (
                            <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.9 }}>
                                Transaction Hash: {notification.hash}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Pools; 