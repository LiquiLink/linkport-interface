import React from 'react';
import Layout from '../components/Layout';

const Portfolio: React.FC = () => {
    const portfolioData = {
        totalValue: 12345.67,
        totalBorrowed: 8900.00,
        healthFactor: 85,
        netWorth: 3445.67
    };

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

    return (
        <Layout>
            <div className="container">
                <div className="glass-card" style={{ maxWidth: '900px', margin: '0 auto' }}>
                    <h2 style={{ 
                        marginBottom: '32px', 
                        fontSize: '28px',
                        fontWeight: 600,
                        color: 'var(--text-color)'
                    }}>
                        Portfolio Overview
                    </h2>
                    
                    {/* Summary Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '20px',
                        marginBottom: '32px'
                    }}>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.6)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '16px',
                            padding: '20px',
                            textAlign: 'center',
                            border: '1px solid var(--border-color)'
                        }}>
                            <div style={{
                                fontSize: '14px',
                                color: 'var(--secondary-text)',
                                marginBottom: '8px',
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
                        
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.6)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '16px',
                            padding: '20px',
                            textAlign: 'center',
                            border: '1px solid var(--border-color)'
                        }}>
                            <div style={{
                                fontSize: '14px',
                                color: 'var(--secondary-text)',
                                marginBottom: '8px',
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
                        
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.6)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '16px',
                            padding: '20px',
                            textAlign: 'center',
                            border: '1px solid var(--border-color)'
                        }}>
                            <div style={{
                                fontSize: '14px',
                                color: 'var(--secondary-text)',
                                marginBottom: '8px',
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
                                fontSize: '12px',
                                color: getHealthColor(portfolioData.healthFactor),
                                marginTop: '4px',
                                fontWeight: 500
                            }}>
                                {getHealthStatus(portfolioData.healthFactor)}
                            </div>
                        </div>
                        
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.6)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '16px',
                            padding: '20px',
                            textAlign: 'center',
                            border: '1px solid var(--border-color)'
                        }}>
                            <div style={{
                                fontSize: '14px',
                                color: 'var(--secondary-text)',
                                marginBottom: '8px',
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

                    {/* Health Factor Indicator */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.6)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '16px',
                        padding: '24px',
                        marginBottom: '32px',
                        border: '1px solid var(--border-color)'
                    }}>
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
                            marginBottom: '12px'
                        }}>
                            <span style={{ color: 'var(--secondary-text)' }}>Current Health Factor</span>
                            <span style={{ 
                                fontWeight: 600, 
                                color: getHealthColor(portfolioData.healthFactor) 
                            }}>
                                {portfolioData.healthFactor}%
                            </span>
                        </div>
                        
                        <div style={{
                            width: '100%',
                            height: '12px',
                            background: '#e5e5e5',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            marginBottom: '12px'
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

                    {/* Positions List */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.6)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '16px',
                        padding: '24px',
                        border: '1px solid var(--border-color)'
                    }}>
                        <h3 style={{
                            marginBottom: '20px',
                            fontSize: '18px',
                            fontWeight: 600,
                            color: 'var(--text-color)'
                        }}>
                            Current Positions
                        </h3>
                        
                        <div style={{ display: 'grid', gap: '16px' }}>
                            {positions.map((position, index) => (
                                <div key={index} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '16px',
                                    background: 'rgba(255, 255, 255, 0.7)',
                                    borderRadius: '12px',
                                    border: `2px solid ${position.type === 'collateral' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div className="token-icon placeholder">{position.token}</div>
                                        <div>
                                            <div style={{
                                                fontSize: '16px',
                                                fontWeight: 600,
                                                color: 'var(--text-color)'
                                            }}>
                                                {position.token}
                                            </div>
                                            <div style={{
                                                fontSize: '12px',
                                                color: 'var(--secondary-text)'
                                            }}>
                                                {position.chain}
                                            </div>
                                        </div>
                                        <div style={{
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            background: position.type === 'collateral' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                            color: position.type === 'collateral' ? '#22c55e' : '#ef4444'
                                        }}>
                                            {position.type === 'collateral' ? 'Collateral' : 'Borrowed'}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{
                                            fontSize: '16px',
                                            fontWeight: 600,
                                            color: 'var(--text-color)'
                                        }}>
                                            {position.amount} {position.token}
                                        </div>
                                        <div style={{
                                            fontSize: '14px',
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
                            gap: '12px',
                            marginTop: '24px'
                        }}>
                            <button className="button primary" style={{ flex: 1 }}>
                                Add Collateral
                            </button>
                            <button className="button secondary" style={{ flex: 1 }}>
                                Repay Debt
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Portfolio;