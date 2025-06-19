import React from 'react';
import Layout from '../components/Layout';

const Portfolio: React.FC = () => {
    const portfolioData = {
        totalValue: 12345.67,
        totalBorrowed: 8900.00,
        healthFactor: 85,
        netWorth: 3445.67
    };

    const stakingData = {
        totalStaked: 585.5,
        totalStakedValue: 1463.75,
        totalRewards: 24.35,
        estimatedAnnualRewards: 95.14
    };

    const stakingPositions = [
        {
            network: 'Optimism',
            symbol: 'OP',
            staked: 50.0,
            value: 125.0,
            apy: 4.2,
            rewards: 2.1,
            color: '#FF0420'
        },
        {
            network: 'Arbitrum',
            symbol: 'ARB',
            staked: 25.5,
            value: 63.75,
            apy: 3.8,
            rewards: 0.97,
            color: '#28A0F0'
        },
        {
            network: 'Polygon',
            symbol: 'MATIC',
            staked: 500.0,
            value: 400.0,
            apy: 5.1,
            rewards: 20.4,
            color: '#8247E5'
        },
        {
            network: 'Avalanche',
            symbol: 'AVAX',
            staked: 10.0,
            value: 250.0,
            apy: 6.5,
            rewards: 0.65,
            color: '#E84142'
        }
    ];

    const positions = [
        {
            token: 'ETH',
            amount: '2.5',
            value: 7500.00,
            type: 'collateral',
            chain: 'Ethereum'
        },
        {
            token: 'USDC',
            amount: '5,000',
            value: 5000.00,
            type: 'borrowed',
            chain: 'Ethereum'
        },
        {
            token: 'LINK',
            amount: '100',
            value: 1500.00,
            type: 'collateral',
            chain: 'Polygon'
        },
        {
            token: 'ETH',
            amount: '1.2',
            value: 3600.00,
            type: 'borrowed',
            chain: 'Optimism'
        }
    ];

    const getHealthColor = (factor: number) => {
        if (factor >= 80) return '#22c55e';
        if (factor >= 60) return '#f59e0b';
        return '#ef4444';
    };

    const getHealthStatus = (factor: number) => {
        if (factor >= 80) return 'Good';
        if (factor >= 60) return 'Warning';
        return 'Danger';
    };

    const formatCurrency = (value: number) => {
        return `$${value.toLocaleString()}`;
    };

    return (
        <Layout>
            <div className="container">
                {/* Portfolio Header */}
                <div style={{ 
                    marginBottom: '24px', 
                    textAlign: 'center'
                }}>
                    <h2 style={{ 
                        fontSize: '28px',
                        fontWeight: 600,
                        color: 'var(--text-color)',
                        marginBottom: '8px'
                    }}>
                        Portfolio Overview
                    </h2>
                    <p style={{ 
                        color: 'var(--secondary-text)',
                        fontSize: '16px'
                    }}>
                        Manage your lending positions and staking rewards
                    </p>
                </div>

                {/* Summary Cards */}
                <div className="portfolio-summary">
                    <div className="glass-card" style={{ textAlign: 'center', padding: '16px' }}>
                        <div style={{
                            fontSize: '13px',
                            color: 'var(--secondary-text)',
                            marginBottom: '6px',
                            fontWeight: 500
                        }}>
                            Total Value
                        </div>
                        <div style={{
                            fontSize: '24px',
                            fontWeight: 700,
                            color: 'var(--text-color)'
                        }}>
                            ${portfolioData.totalValue.toLocaleString()}
                        </div>
                    </div>
                    
                    <div className="glass-card" style={{ textAlign: 'center', padding: '16px' }}>
                        <div style={{
                            fontSize: '13px',
                            color: 'var(--secondary-text)',
                            marginBottom: '6px',
                            fontWeight: 500
                        }}>
                            Total Borrowed
                        </div>
                        <div style={{
                            fontSize: '24px',
                            fontWeight: 700,
                            color: '#ef4444'
                        }}>
                            ${portfolioData.totalBorrowed.toLocaleString()}
                        </div>
                    </div>
                    
                    <div className="glass-card" style={{ textAlign: 'center', padding: '16px' }}>
                        <div style={{
                            fontSize: '13px',
                            color: 'var(--secondary-text)',
                            marginBottom: '6px',
                            fontWeight: 500
                        }}>
                            Health Factor
                        </div>
                        <div style={{
                            fontSize: '24px',
                            fontWeight: 700,
                            color: getHealthColor(portfolioData.healthFactor)
                        }}>
                            {portfolioData.healthFactor}%
                        </div>
                        <div style={{
                            fontSize: '11px',
                            color: getHealthColor(portfolioData.healthFactor),
                            marginTop: '2px',
                            fontWeight: 500
                        }}>
                            {getHealthStatus(portfolioData.healthFactor)}
                        </div>
                    </div>
                    
                    <div className="glass-card" style={{ textAlign: 'center', padding: '16px' }}>
                        <div style={{
                            fontSize: '13px',
                            color: 'var(--secondary-text)',
                            marginBottom: '6px',
                            fontWeight: 500
                        }}>
                            Net Worth
                        </div>
                        <div style={{
                            fontSize: '24px',
                            fontWeight: 700,
                            color: portfolioData.netWorth >= 0 ? '#22c55e' : '#ef4444'
                        }}>
                            ${portfolioData.netWorth.toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* Main Content - Two Column Layout */}
                <div className="portfolio-main">
                    {/* Left Column */}
                    <div>
                        {/* Staking Rewards Section */}
                        <div className="portfolio-section">
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '20px',
                                paddingBottom: '12px',
                                borderBottom: '1px solid var(--border-color)'
                            }}>
                                <h3 style={{
                                    margin: 0,
                                    fontSize: '18px',
                                    fontWeight: 600,
                                    color: 'var(--text-color)'
                                }}>Staking Rewards</h3>
                                <div style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    background: 'var(--accent-color)',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px'
                                }}>
                                    <i className="fas fa-percentage"></i>
                                </div>
                            </div>

                            {/* Staking Overview */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '12px',
                                marginBottom: '20px'
                            }}>
                                <div style={{
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    borderRadius: '12px',
                                    padding: '12px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{
                                        fontSize: '11px',
                                        color: 'var(--secondary-text)',
                                        marginBottom: '6px'
                                    }}>Total Staked Value</div>
                                    <div style={{
                                        fontSize: '16px',
                                        fontWeight: 700,
                                        color: '#3b82f6'
                                    }}>{formatCurrency(stakingData.totalStakedValue)}</div>
                                </div>
                                <div style={{
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    borderRadius: '12px',
                                    padding: '12px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{
                                        fontSize: '11px',
                                        color: 'var(--secondary-text)',
                                        marginBottom: '6px'
                                    }}>Total Rewards</div>
                                    <div style={{
                                        fontSize: '16px',
                                        fontWeight: 700,
                                        color: '#22c55e'
                                    }}>{formatCurrency(stakingData.totalRewards)}</div>
                                </div>
                                <div style={{
                                    background: 'rgba(245, 158, 11, 0.1)',
                                    border: '1px solid rgba(245, 158, 11, 0.3)',
                                    borderRadius: '12px',
                                    padding: '12px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{
                                        fontSize: '11px',
                                        color: 'var(--secondary-text)',
                                        marginBottom: '6px'
                                    }}>Est. Annual Rewards</div>
                                    <div style={{
                                        fontSize: '16px',
                                        fontWeight: 700,
                                        color: '#f59e0b'
                                    }}>{formatCurrency(stakingData.estimatedAnnualRewards)}</div>
                                </div>
                            </div>

                            {/* Staking Positions */}
                            <div className="staking-positions-grid">
                                {stakingPositions.map((position, index) => (
                                    <div key={index} className="staking-position-compact" style={{
                                        borderColor: `${position.color}30`
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <div className="token-icon small" style={{
                                                background: position.color,
                                                color: 'white',
                                                fontWeight: 600
                                            }}>{position.symbol}</div>
                                            <div>
                                                <div style={{
                                                    fontSize: '14px',
                                                    fontWeight: 600,
                                                    color: 'var(--text-color)'
                                                }}>
                                                    {position.network}
                                                </div>
                                                <div style={{
                                                    fontSize: '11px',
                                                    color: 'var(--secondary-text)'
                                                }}>
                                                    APY: {position.apy}%
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            fontSize: '12px'
                                        }}>
                                            <span style={{ color: 'var(--secondary-text)' }}>
                                                {position.staked} {position.symbol}
                                            </span>
                                            <span style={{
                                                color: '#22c55e',
                                                fontWeight: 500
                                            }}>
                                                +{formatCurrency(position.rewards)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{
                                display: 'flex',
                                gap: '8px',
                                marginTop: '16px'
                            }}>
                                <button className="button primary compact" style={{ flex: 1 }}>
                                    Add Stake
                                </button>
                                <button className="button secondary compact" style={{ flex: 1 }}>
                                    Claim Rewards
                                </button>
                            </div>
                        </div>

                        {/* Health Factor Details */}
                        <div className="portfolio-section" style={{ marginTop: '20px' }}>
                            <h3 style={{
                                marginBottom: '16px',
                                fontSize: '18px',
                                fontWeight: 600,
                                color: 'var(--text-color)'
                            }}>
                                Health Factor Details
                            </h3>
                            
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '10px'
                            }}>
                                <span style={{ color: 'var(--secondary-text)', fontSize: '14px' }}>Current Health Factor</span>
                                <span style={{ 
                                    fontWeight: 600, 
                                    color: getHealthColor(portfolioData.healthFactor),
                                    fontSize: '16px'
                                }}>
                                    {portfolioData.healthFactor}%
                                </span>
                            </div>
                            
                            <div style={{
                                width: '100%',
                                height: '10px',
                                background: '#e5e5e5',
                                borderRadius: '5px',
                                overflow: 'hidden',
                                marginBottom: '10px'
                            }}>
                                <div style={{
                                    width: `${portfolioData.healthFactor}%`,
                                    height: '100%',
                                    background: `linear-gradient(90deg, ${getHealthColor(portfolioData.healthFactor)} 0%, ${getHealthColor(portfolioData.healthFactor)} 100%)`,
                                    transition: 'width 0.3s ease'
                                }}></div>
                            </div>
                            
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '12px',
                                color: 'var(--secondary-text)'
                            }}>
                                <span>Liquidation Risk</span>
                                <span>Safe</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div>
                        {/* Current Positions */}
                        <div className="portfolio-section">
                            <h3 style={{
                                marginBottom: '20px',
                                fontSize: '18px',
                                fontWeight: 600,
                                color: 'var(--text-color)'
                            }}>
                                Current Positions
                            </h3>
                            
                            <div style={{ display: 'grid', gap: '12px' }}>
                                {positions.map((position, index) => (
                                    <div key={index} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '14px',
                                        background: 'rgba(255, 255, 255, 0.7)',
                                        borderRadius: '12px',
                                        border: `2px solid ${position.type === 'collateral' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div className="token-icon placeholder">{position.token}</div>
                                            <div>
                                                <div style={{
                                                    fontSize: '15px',
                                                    fontWeight: 600,
                                                    color: 'var(--text-color)'
                                                }}>
                                                    {position.token}
                                                </div>
                                                <div style={{
                                                    fontSize: '11px',
                                                    color: 'var(--secondary-text)'
                                                }}>
                                                    {position.chain}
                                                </div>
                                            </div>
                                            <div style={{
                                                padding: '3px 6px',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                fontWeight: 500,
                                                background: position.type === 'collateral' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                color: position.type === 'collateral' ? '#22c55e' : '#ef4444'
                                            }}>
                                                {position.type === 'collateral' ? 'Collateral' : 'Borrowed'}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{
                                                fontSize: '15px',
                                                fontWeight: 600,
                                                color: 'var(--text-color)'
                                            }}>
                                                {position.amount} {position.token}
                                            </div>
                                            <div style={{
                                                fontSize: '13px',
                                                color: 'var(--secondary-text)'
                                            }}>
                                                ${position.value.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div style={{
                                display: 'flex',
                                gap: '8px',
                                marginTop: '16px'
                            }}>
                                <button className="button primary compact" style={{ flex: 1 }}>
                                    Manage Positions
                                </button>
                                <button className="button secondary compact" style={{ flex: 1 }}>
                                    Add Collateral
                                </button>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="portfolio-section" style={{ marginTop: '20px' }}>
                            <h3 style={{
                                marginBottom: '16px',
                                fontSize: '18px',
                                fontWeight: 600,
                                color: 'var(--text-color)'
                            }}>
                                Quick Actions
                            </h3>
                            
                            <div className="quick-actions-grid">
                                <button className="action-card" style={{
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    border: '2px solid rgba(59, 130, 246, 0.3)',
                                    color: '#3b82f6'
                                }}>
                                    <i className="fas fa-plus-circle" style={{ fontSize: '20px', marginBottom: '8px' }}></i>
                                    <span style={{ fontSize: '14px', fontWeight: 500 }}>Borrow More</span>
                                </button>
                                
                                <button className="action-card" style={{
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    border: '2px solid rgba(34, 197, 94, 0.3)',
                                    color: '#22c55e'
                                }}>
                                    <i className="fas fa-minus-circle" style={{ fontSize: '20px', marginBottom: '8px' }}></i>
                                    <span style={{ fontSize: '14px', fontWeight: 500 }}>Repay Debt</span>
                                </button>
                                
                                <button className="action-card" style={{
                                    background: 'rgba(245, 158, 11, 0.1)',
                                    border: '2px solid rgba(245, 158, 11, 0.3)',
                                    color: '#f59e0b'
                                }}>
                                    <i className="fas fa-exchange-alt" style={{ fontSize: '20px', marginBottom: '8px' }}></i>
                                    <span style={{ fontSize: '14px', fontWeight: 500 }}>Bridge Assets</span>
                                </button>
                                
                                <button className="action-card" style={{
                                    background: 'rgba(139, 92, 246, 0.1)',
                                    border: '2px solid rgba(139, 92, 246, 0.3)',
                                    color: '#8b5cf6'
                                }}>
                                    <i className="fas fa-chart-line" style={{ fontSize: '20px', marginBottom: '8px' }}></i>
                                    <span style={{ fontSize: '14px', fontWeight: 500 }}>Analytics</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Portfolio;