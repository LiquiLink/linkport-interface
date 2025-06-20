import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { BigNumberish, ethers, formatUnits } from 'ethers';
import { Modal } from 'antd';
import { useAccount, useChainId, useReadContract, useWriteContract } from 'wagmi';
import LiquidityPoolABI  from '../abi/LiquidityPool.json';
import ERC20ABI from '../abi/ERC20.json';
import { poolList } from  '../config';
import { getBalance } from '../utils/balance';
import { getPoolTvl, getUserPosition } from '../utils/pool';

const Pools: React.FC = () => {
    const [depositAmount, setDepositAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [selectedPool, setSelectedPool] = useState<any>();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'deposit' | 'withdraw'>('deposit');
    const [depositing, setDepositing] = useState(false);
    const [withdrawing, setWithdrawing] = useState(false);
    const { address } = useAccount();
    const [pools, setPools] = useState([]);
    const chainId = useChainId();

    const showModal = (type: 'deposit' | 'withdraw', pool: any) => {
        setSelectedPool(pool);
        setModalType(type);
        setIsModalVisible(true);
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
    }

    const handlePool = async () => {
        if (modalType === 'deposit') {
            setDepositing(true)
            console.log('Deposit Amount:', depositAmount, allowance);
            try {
                if (allowance || (allowance as BigNumberish)  < (ethers.parseUnits(depositAmount) as BigNumberish)) {
                    console.log('Approving token transfer...');
                    await writeApprove({
                        address: selectedPool.address,
                        abi: ERC20ABI,
                        functionName: 'approve',
                        args: [selectedPool.pool, ethers.parseUnits(depositAmount)]
                    });
                }
                console.log('Depositing to pool...');

                // Handle deposit logic
                writeDeposit({
                    address: selectedPool.pool,
                    abi: LiquidityPoolABI,
                    functionName: 'deposit',
                    args: [ethers.parseUnits(depositAmount)],
                });
            } finally {
                setDepositing(false)
            }
        } else {
            try {
                setWithdrawing(true);
                // Handle withdraw logic
                await writeWithdraw({
                    address: selectedPool.pool,
                    abi: LiquidityPoolABI,
                    functionName: 'withdraw',
                    args: [ethers.parseUnits(withdrawAmount)],
                });
            } finally {
                setWithdrawing(false);
            }
        }
        setIsModalVisible(false);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
    };
    const isAmountValid = true;

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
              const userPosition = getUserPosition(pool, address);
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
                                            {pool.tokens.map((token, index) => (
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
                        title={modalType === 'deposit' ? 'Deposit' : 'Withdraw'}
                        open={isModalVisible}
                        onCancel={handleCancel}
                        onOk={handleOk}
                        centered
                        style={{
                            background: 'rgba(255, 255, 255, 0.6)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '16px',
                            padding: '24px',
                            border: '1px solid var(--border-color)',
                        }}
                    >
                        {modalType === 'deposit' ? (
                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontSize: '14px',
                                    color: 'var(--secondary-text)',
                                    fontWeight: 500
                                }}>
                                    Deposit Amount
                                </label>
                                <div className="input-card" style={{
                                    marginBottom: '12px',
                                    padding: '16px'
                                }}>
                                    <input
                                        type="text"
                                        placeholder="0.00"
                                        value={depositAmount}
                                        onChange={(e) => setDepositAmount(e.target.value)}
                                        style={{
                                            fontSize: '24px',
                                            fontWeight: 300,
                                            width: '100%',
                                            border: 'none',
                                            background: 'transparent',
                                            color: 'var(--text-color)',
                                            outline: 'none'
                                        }}
                                    />
                                    <div style={{
                                        fontSize: '14px',
                                        color: 'var(--secondary-text)',
                                        marginTop: '4px'
                                    }}>
                                        ≈ ${(parseFloat(depositAmount) * 3000 || 0).toFixed(2)}
                                    </div>
                                </div>
                                <button className="button primary" style={{
                                    fontSize: '14px',
                                    padding: '12px'
                                }} onClick={handlePool}
                                disabled={
                                    !isAmountValid ||
                                    depositing ||
                                    isDepositPending ||
                                    isApprovePending
                                }
                                >
                                    Deposit to Pool
                                </button>
                            </div>
                        ) : (
                            <div>
                                <label style={{
                                    display: 'block',
                                    marginBottom: '8px',
                                    fontSize: '14px',
                                    color: 'var(--secondary-text)',
                                    fontWeight: 500
                                }}>
                                    Withdraw Shares
                                </label>
                                <div className="input-card" style={{
                                    marginBottom: '12px',
                                    padding: '16px'
                                }}>
                                    <input
                                        type="text"
                                        placeholder="0.00"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        style={{
                                            fontSize: '24px',
                                            fontWeight: 300,
                                            width: '100%',
                                            border: 'none',
                                            background: 'transparent',
                                            color: 'var(--text-color)',
                                            outline: 'none'
                                        }}
                                    />
                                    <div style={{
                                        fontSize: '14px',
                                        color: 'var(--secondary-text)',
                                        marginTop: '4px'
                                    }}>
                                        Available: 1,250 LP tokens
                                    </div>
                                </div>
                                <button className="button" style={{
                                    fontSize: '14px',
                                    padding: '12px'
                                }} onClick={handlePool}
                                disabled={
                                    !isAmountValid ||
                                    withdrawing||
                                    isWithdrawPending 
                                }
                                >
                                    Withdraw from Pool
                                </button>
                            </div>
                        )}
                    </Modal>
            </div>
        </Layout>
    );
};

export default Pools;
