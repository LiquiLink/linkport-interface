import React, { useState } from 'react';
import Layout from '../components/Layout';

const Pools: React.FC = () => {
    const [depositAmount, setDepositAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [selectedPool, setSelectedPool] = useState('');

    const pools = [
        {
            id: 'eth-usdc',
            name: 'ETH/USDC',
            apy: '12.5%',
            tvl: '$2.5M',
            userPosition: '$1,250',
            volume24h: '$125K',
            tokens: ['ETH', 'USDC']
        },
        {
            id: 'eth-usdt',
            name: 'ETH/USDT',
            apy: '8.3%',
            tvl: '$1.8M',
            userPosition: '$0',
            volume24h: '$89K',
            tokens: ['ETH', 'USDT']
        },
        {
            id: 'link-eth',
            name: 'LINK/ETH',
            apy: '15.2%',
            tvl: '$1.2M',
            userPosition: '$450',
            volume24h: '$67K',
            tokens: ['LINK', 'ETH']
        }
    ];

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
                                    }}>
                                        Deposit
                                    </button>
                                    <button className="button" style={{
                                        flex: 1,
                                        padding: '10px 16px',
                                        fontSize: '14px'
                                    }}>
                                        Withdraw
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pool Actions Section */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.6)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '16px',
                        padding: '24px',
                        border: '1px solid var(--border-color)'
                    }}>
                        <h3 style={{
                            marginBottom: '20px',
                            fontSize: '20px',
                            fontWeight: 600,
                            color: 'var(--text-color)'
                        }}>
                            Quick Actions
                        </h3>
                        
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '20px'
                        }}>
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
                                }}>
                                    Deposit to Pool
                                </button>
                            </div>
                            
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
                                }}>
                                    Withdraw from Pool
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Pools;