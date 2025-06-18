import React, { useState } from 'react';

const Home: React.FC = () => {
    const [activeTab, setActiveTab] = useState('borrow');
    const [collateralAmount, setCollateralAmount] = useState('');
    const [borrowAmount, setBorrowAmount] = useState('');
    const [bridgeAmount, setBridgeAmount] = useState('');

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
    };

    const calculateUSDValue = (amount: string, price: number = 3000) => {
        const value = parseFloat(amount) || 0;
        return (value * price).toFixed(2);
    };

    const calculateMaxBorrow = (collateralAmount: string) => {
        const value = parseFloat(collateralAmount) || 0;
        return (value * 3000 * 0.75).toFixed(0); // 75% LTV
    };

    const calculateHealthFactor = () => {
        const collateralValue = parseFloat(collateralAmount) * 3000;
        const borrowValue = parseFloat(borrowAmount) || 0;
        if (borrowValue === 0) return 100;
        return Math.min(100, (collateralValue * 0.8 / borrowValue) * 100);
    };

    return (
        <div className="container">
            <div className="main-layout">
                {/* Left Panel - Main Trading Interface */}
                <div className="glass-card main-trading-panel">
                    {/* Tab Navigation */}
                    <div className="tab-navigation">
                        <div 
                            className={`tab ${activeTab === 'borrow' ? 'active' : ''}`}
                            onClick={() => handleTabChange('borrow')}
                        >
                            Borrow
                        </div>
                        <div 
                            className={`tab ${activeTab === 'bridge' ? 'active' : ''}`}
                            onClick={() => handleTabChange('bridge')}
                        >
                            Bridge
                        </div>
                    </div>

                    {/* Borrow Mode */}
                    {activeTab === 'borrow' && (
                        <div className="trading-mode active">
                            {/* Chain Selection */}
                            <div className="select-container">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div className="token-icon placeholder">ETH</div>
                                    <div style={{ fontSize: '18px', fontWeight: 500 }}>Ethereum</div>
                                </div>
                                <div style={{ color: 'var(--secondary-text)' }}>
                                    <i className="fas fa-chevron-down"></i>
                                </div>
                            </div>

                            {/* Collateral Section */}
                            <div className="section-title">Collateral</div>
                            <div className="input-card">
                                <input
                                    type="text"
                                    className="amount-input"
                                    placeholder="0.00"
                                    value={collateralAmount}
                                    onChange={(e) => setCollateralAmount(e.target.value)}
                                />
                                <div className="amount-value">${calculateUSDValue(collateralAmount)}</div>
                                <div className="token-balance">
                                    <span>Balance: 0.0123</span>
                                    <i className="fas fa-wallet"></i>
                                </div>
                            </div>

                            <div className="token-select">
                                <div className="token-icon placeholder">ETH</div>
                                <span>ETH</span>
                                <i className="fas fa-chevron-down"></i>
                            </div>

                            {/* Borrow Asset Section */}
                            <div className="section-title">Borrow Asset</div>
                            <div className="select-container">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div className="token-icon placeholder">USDC</div>
                                    <div style={{ fontSize: '18px', fontWeight: 500 }}>USDC</div>
                                </div>
                                <div style={{ color: 'var(--secondary-text)' }}>
                                    <i className="fas fa-chevron-down"></i>
                                </div>
                            </div>

                            <div className="input-card">
                                <input
                                    type="text"
                                    className="amount-input"
                                    placeholder="0.00"
                                    value={borrowAmount}
                                    onChange={(e) => setBorrowAmount(e.target.value)}
                                />
                                <div className="amount-value">${borrowAmount}</div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginTop: '8px',
                                    fontSize: '14px',
                                    color: 'var(--secondary-text)'
                                }}>
                                    <span>Max Borrow: {calculateMaxBorrow(collateralAmount)} USDC</span>
                                    <span>Interest Rate: 2.5%</span>
                                </div>
                            </div>

                            {/* Health Factor */}
                            <div className="health-indicator">
                                <div className="health-label">Health Factor</div>
                                <div className="health-bar">
                                    <div 
                                        className="health-fill" 
                                        style={{ width: `${calculateHealthFactor()}%` }}
                                    ></div>
                                </div>
                                <div className="health-value">{calculateHealthFactor().toFixed(0)}%</div>
                            </div>

                            <button className="button primary">Borrow</button>
                        </div>
                    )}

                    {/* Bridge Mode */}
                    {activeTab === 'bridge' && (
                        <div className="trading-mode active">
                            {/* Bridge Direction */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr auto 1fr',
                                gap: '16px',
                                alignItems: 'center',
                                marginBottom: '24px'
                            }}>
                                <div style={{ textAlign: 'center' }}>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontSize: '14px',
                                        color: 'var(--secondary-text)'
                                    }}>From</label>
                                    <div className="select-container">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div className="token-icon placeholder">ETH</div>
                                            <div style={{ fontSize: '18px', fontWeight: 500 }}>Ethereum</div>
                                        </div>
                                        <div style={{ color: 'var(--secondary-text)' }}>
                                            <i className="fas fa-chevron-down"></i>
                                        </div>
                                    </div>
                                </div>

                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: 'var(--accent-color)',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '16px'
                                }}>
                                    <i className="fas fa-arrow-right"></i>
                                </div>

                                <div style={{ textAlign: 'center' }}>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontSize: '14px',
                                        color: 'var(--secondary-text)'
                                    }}>To</label>
                                    <div className="select-container">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div className="token-icon placeholder">OP</div>
                                            <div style={{ fontSize: '18px', fontWeight: 500 }}>Optimism</div>
                                        </div>
                                        <div style={{ color: 'var(--secondary-text)' }}>
                                            <i className="fas fa-chevron-down"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bridge Asset & Amount */}
                            <div className="section-title">Asset & Amount</div>
                            <div className="input-card">
                                <input
                                    type="text"
                                    className="amount-input"
                                    placeholder="0.00"
                                    value={bridgeAmount}
                                    onChange={(e) => setBridgeAmount(e.target.value)}
                                />
                                <div className="amount-value">${calculateUSDValue(bridgeAmount)}</div>
                                <div className="token-balance">
                                    <span>Balance: 0.0123</span>
                                    <i className="fas fa-wallet"></i>
                                </div>
                            </div>

                            <div className="token-select">
                                <div className="token-icon placeholder">ETH</div>
                                <span>ETH</span>
                                <i className="fas fa-chevron-down"></i>
                            </div>

                            <div style={{
                                marginBottom: '24px',
                                padding: '16px',
                                background: 'rgba(255, 255, 255, 0.6)',
                                borderRadius: '12px',
                                backdropFilter: 'blur(10px)'
                            }}>
                                <div className="stat-row">
                                    <span>Estimated Time</span>
                                    <span>~7 minutes</span>
                                </div>
                                <div className="stat-row">
                                    <span>Bridge Fee</span>
                                    <span>~$2.50</span>
                                </div>
                                <div className="stat-row">
                                    <span>You Will Receive</span>
                                    <span>{Math.max(0, (parseFloat(bridgeAmount) || 0) - 0.001).toFixed(4)} ETH</span>
                                </div>
                            </div>

                            <button className="button primary">Bridge Assets</button>
                        </div>
                    )}
                </div>

                {/* Right Panel - Information Cards */}
                <div className="info-panel">
                    {/* Staking Information Card */}
                    <div className="glass-card info-card">
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '24px',
                            paddingBottom: '16px',
                            borderBottom: '1px solid var(--border-color)'
                        }}>
                            <h3 style={{
                                margin: 0,
                                fontSize: '18px',
                                fontWeight: 600,
                                color: 'var(--text-color)'
                            }}>Staking Rewards</h3>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'var(--accent-color)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px'
                            }}>
                                <i className="fas fa-percentage"></i>
                            </div>
                        </div>

                        <div style={{
                            textAlign: 'center',
                            padding: '20px',
                            background: 'rgba(34, 197, 94, 0.15)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            borderRadius: '16px',
                            marginBottom: '20px'
                        }}>
                            <div style={{
                                fontSize: '14px',
                                color: 'var(--secondary-text)',
                                marginBottom: '8px'
                            }}>Annual Percentage Yield</div>
                            <div style={{
                                fontSize: '28px',
                                fontWeight: 700,
                                color: '#22c55e'
                            }}>4.2%</div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <div className="stat-row">
                                <span>Minimum Period</span>
                                <span>30 days</span>
                            </div>
                            <div className="stat-row">
                                <span>Total Staked</span>
                                <span>1,234,567 ETH</span>
                            </div>
                        </div>

                        <button className="button secondary">Stake ETH</button>
                    </div>

                    {/* Cross-chain Networks Card */}
                    <div className="glass-card info-card">
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '24px',
                            paddingBottom: '16px',
                            borderBottom: '1px solid var(--border-color)'
                        }}>
                            <h3 style={{
                                margin: 0,
                                fontSize: '18px',
                                fontWeight: 600,
                                color: 'var(--text-color)'
                            }}>Supported Networks</h3>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'var(--accent-color)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px'
                            }}>
                                <i className="fas fa-network-wired"></i>
                            </div>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '12px',
                            marginBottom: '20px'
                        }}>
                            {[
                                { name: 'Optimism', icon: 'OP' },
                                { name: 'Arbitrum', icon: 'ARB' },
                                { name: 'Polygon', icon: 'POLY' },
                                { name: 'Avalanche', icon: 'AVAX' }
                            ].map((chain) => (
                                <div key={chain.name} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px',
                                    background: 'rgba(255, 255, 255, 0.9)',
                                    border: '2px solid transparent',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                    fontSize: '14px'
                                }}>
                                    <div className="token-icon placeholder">{chain.icon}</div>
                                    <span>{chain.name}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '16px' }}>
                            <div className="stat-row">
                                <span>Total Volume</span>
                                <span>$2.5B</span>
                            </div>
                            <div className="stat-row">
                                <span>Active Users</span>
                                <span>125,432</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;