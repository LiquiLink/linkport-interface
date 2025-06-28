import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

interface LiquidationInfo {
    healthFactor: number;
    collateralRatio: number;
    collateralValue: number;
    debtValue: number;
    isAtRisk: boolean;
    riskLevel: 'safe' | 'warning' | 'danger' | 'critical';
}



const LiquidationMonitor: React.FC = () => {
    const { address } = useAccount();
    const [liquidationInfo, setLiquidationInfo] = useState<LiquidationInfo | null>(null);

    // Mock health factor calculation
    const calculateHealthFactor = (collateralValue: number, debtValue: number): number => {
        if (debtValue === 0) return 999; // Return high health factor when no debt
        const liquidationThreshold = 0.85; // 85%
        return (collateralValue * liquidationThreshold) / debtValue;
    };

    // Determine risk level
    const getRiskLevel = (healthFactor: number): 'safe' | 'warning' | 'danger' | 'critical' => {
        if (healthFactor >= 1.5) return 'safe';
        if (healthFactor >= 1.2) return 'warning';  
        if (healthFactor >= 1.0) return 'danger';
        return 'critical';
    };

    // Get risk color
    const getRiskColor = (riskLevel: string): string => {
        switch (riskLevel) {
            case 'safe': return '#10b981';
            case 'warning': return '#f59e0b';
            case 'danger': return '#ef4444';
            case 'critical': return '#dc2626';
            default: return '#6b7280';
        }
    };

    // Real data loading - calculated from user's actual positions
    useEffect(() => {
        async function loadRealLiquidationData() {
            if (!address) return;
            
            try {
                            // Should get user's actual collateral and lending data from smart contracts here
            // Currently check localStorage or use conservative estimates
                
                // Check if there's stored liquidation risk data
                const storedRiskData = localStorage.getItem(`liquidation_risk_${address}`);
                if (storedRiskData) {
                    const parsedData = JSON.parse(storedRiskData);
                    setLiquidationInfo(parsedData);
                    return;
                }
                
                                  // If no stored data, user may not have active lending positions
                  // Don't show liquidation monitoring
                setLiquidationInfo(null);
                
            } catch (error) {
                console.error('Failed to load liquidation data:', error);
                setLiquidationInfo(null);
            }
        }
        
        loadRealLiquidationData();
    }, [address]);

    if (!address) {
        return (
            <div className="liquidation-monitor">
                <div className="connect-message">
                    🔗 Connect wallet to view liquidation risk
                </div>
            </div>
        );
    }

    if (!liquidationInfo) {
        return (
            <div className="liquidation-monitor">
                <div className="loading-message">
                    ⏳ Loading liquidation info...
                </div>
            </div>
        );
    }

    return (
        <div className="liquidation-monitor">
            <div className="monitor-header">
                <h3>⚡ Liquidation Risk Monitor</h3>
                <div 
                    className="risk-badge"
                    style={{ 
                        backgroundColor: getRiskColor(liquidationInfo.riskLevel),
                        color: 'white'
                    }}
                >
                    {liquidationInfo.riskLevel.toUpperCase()}
                </div>
            </div>

            <div className="risk-metrics">
                <div className="metric-card">
                    <div className="metric-icon">💗</div>
                    <div className="metric-info">
                        <div className="metric-label">Health Factor</div>
                        <div 
                            className="metric-value"
                            style={{ 
                                color: getRiskColor(liquidationInfo.riskLevel)
                            }}
                        >
                            {liquidationInfo.healthFactor.toFixed(3)}
                        </div>
                        <div className="metric-description">
                            {liquidationInfo.healthFactor >= 1.0 ? 
                                'Above liquidation threshold' : 
                                'Below liquidation threshold'}
                        </div>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon">📊</div>
                    <div className="metric-info">
                        <div className="metric-label">Collateral Ratio</div>
                        <div className="metric-value">
                            {(liquidationInfo.collateralRatio * 100).toFixed(1)}%
                        </div>
                        <div className="metric-description">
                            Critical threshold: 110%
                        </div>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon">💰</div>
                    <div className="metric-info">
                        <div className="metric-label">Collateral Value</div>
                        <div className="metric-value">
                            ${liquidationInfo.collateralValue.toLocaleString()}
                        </div>
                        <div className="metric-description">
                            Total locked collateral
                        </div>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon">📉</div>
                    <div className="metric-info">
                        <div className="metric-label">Debt Value</div>
                        <div className="metric-value">
                            ${liquidationInfo.debtValue.toLocaleString()}
                        </div>
                        <div className="metric-description">
                            Outstanding debt
                        </div>
                    </div>
                </div>
            </div>

                                    {/* Risk warning */}
            {liquidationInfo.isAtRisk && (
                <div className="risk-warning">
                    <div className="warning-header">
                        ⚠️ Liquidation Risk Detected
                    </div>
                    <div className="warning-content">
                        {liquidationInfo.riskLevel === 'critical' && (
                            <p>🚨 <strong>Critical Risk:</strong> Your position may be liquidated immediately. Take action now!</p>
                        )}
                        {liquidationInfo.riskLevel === 'danger' && (
                            <p>⚠️ <strong>High Risk:</strong> Your health factor is dangerously low. Consider adding collateral or repaying debt.</p>
                        )}
                        {liquidationInfo.riskLevel === 'warning' && (
                            <p>⚡ <strong>Medium Risk:</strong> Monitor your position closely. Market volatility may trigger liquidation.</p>
                        )}
                    </div>
                    
                    <div className="warning-actions">
                        <button className="action-btn primary">
                            💰 Add Collateral
                        </button>
                        <button className="action-btn secondary">
                            💳 Repay Debt
                        </button>
                    </div>
                </div>
            )}

                                {/* Perpetual loan explanation */}
            <div className="perpetual-info">
                <div className="info-header">
                    💎 Perpetual Loan Model
                </div>
                <div className="info-content">
                    <p>
                        <strong>Your loans can exist indefinitely</strong> as long as you maintain sufficient collateral. 
                        There are no forced repayment deadlines - only collateral health matters.
                    </p>
                    <div className="info-features">
                        <div className="feature">
                            ✅ <strong>No time limits:</strong> Loans don't expire based on time
                        </div>
                        <div className="feature">
                            ⚡ <strong>Collateral-based:</strong> Only liquidated when health factor &lt; 1.0
                        </div>
                        <div className="feature">
                            💰 <strong>Interest accrues:</strong> You pay ongoing interest but can repay anytime
                        </div>
                        <div className="feature">
                            🛡️ <strong>Safe zones:</strong> Health factor above 1.2 = very safe
                        </div>
                    </div>
                </div>
            </div>

                            {/* Health factor chart */}
            <div className="health-chart">
                <div className="chart-header">
                    <span>Health Factor Visualization</span>
                </div>
                <div className="health-bar-container">
                    <div className="health-bar">
                        <div 
                            className="health-fill"
                            style={{ 
                                width: `${Math.min(liquidationInfo.healthFactor * 50, 100)}%`,
                                backgroundColor: getRiskColor(liquidationInfo.riskLevel)
                            }}
                        ></div>
                    </div>
                    <div className="health-markers">
                        <div className="marker critical">
                            <span>1.0</span>
                            <div>Critical</div>
                        </div>
                        <div className="marker danger">
                            <span>1.2</span>
                            <div>Danger</div>
                        </div>
                        <div className="marker warning">
                            <span>1.5</span>
                            <div>Warning</div>
                        </div>
                        <div className="marker safe">
                            <span>2.0+</span>
                            <div>Safe</div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .liquidation-monitor {
                    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
                    border-radius: 20px;
                    padding: 24px;
                    color: white;
                    margin: 20px 0;
                }

                .connect-message, .loading-message {
                    text-align: center;
                    padding: 40px;
                    font-size: 16px;
                    opacity: 0.8;
                }

                .monitor-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                }

                .monitor-header h3 {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 700;
                }

                .risk-badge {
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: 0.5px;
                }

                .risk-metrics {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 16px;
                    margin-bottom: 24px;
                }

                .metric-card {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 20px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    transition: all 0.3s ease;
                }

                .metric-card:hover {
                    background: rgba(255, 255, 255, 0.15);
                    transform: translateY(-2px);
                }

                .metric-icon {
                    font-size: 24px;
                    opacity: 0.8;
                }

                .metric-info {
                    flex: 1;
                }

                .metric-label {
                    font-size: 14px;
                    opacity: 0.7;
                    margin-bottom: 4px;
                }

                .metric-value {
                    font-size: 20px;
                    font-weight: 700;
                    margin-bottom: 4px;
                }

                .metric-description {
                    font-size: 12px;
                    opacity: 0.6;
                }

                .risk-warning {
                    background: rgba(239, 68, 68, 0.15);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    border-radius: 16px;
                    padding: 20px;
                    margin-bottom: 24px;
                }

                .warning-header {
                    font-size: 16px;
                    font-weight: 700;
                    margin-bottom: 12px;
                    color: #fca5a5;
                }

                .warning-content {
                    margin-bottom: 16px;
                    line-height: 1.5;
                }

                .warning-content p {
                    margin: 0;
                }

                .warning-actions {
                    display: flex;
                    gap: 12px;
                }

                .action-btn {
                    padding: 10px 16px;
                    border: none;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .action-btn.primary {
                    background: #10b981;
                    color: white;
                }

                .action-btn.primary:hover {
                    background: #059669;
                }

                .action-btn.secondary {
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                }

                .action-btn.secondary:hover {
                    background: rgba(255, 255, 255, 0.3);
                }

                .perpetual-info {
                    background: rgba(16, 185, 129, 0.1);
                    border: 1px solid rgba(16, 185, 129, 0.3);
                    border-radius: 16px;
                    padding: 20px;
                    margin-bottom: 24px;
                }

                .info-header {
                    font-size: 16px;
                    font-weight: 700;
                    margin-bottom: 12px;
                    color: #6ee7b7;
                }

                .info-content {
                    line-height: 1.5;
                }

                .info-content p {
                    margin: 0 0 16px 0;
                    opacity: 0.9;
                }

                .info-features {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 12px;
                }

                .feature {
                    background: rgba(255, 255, 255, 0.05);
                    padding: 12px;
                    border-radius: 8px;
                    font-size: 14px;
                    opacity: 0.9;
                }

                .health-chart {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 16px;
                    padding: 20px;
                }

                .chart-header {
                    font-size: 16px;
                    font-weight: 600;
                    margin-bottom: 16px;
                    opacity: 0.9;
                }

                .health-bar-container {
                    position: relative;
                }

                .health-bar {
                    height: 8px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                    overflow: hidden;
                    margin-bottom: 20px;
                }

                .health-fill {
                    height: 100%;
                    transition: all 0.5s ease;
                    border-radius: 4px;
                }

                .health-markers {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 8px;
                }

                .marker {
                    text-align: center;
                    font-size: 12px;
                }

                .marker span {
                    font-weight: 700;
                    display: block;
                    margin-bottom: 4px;
                }

                .marker div {
                    opacity: 0.7;
                    font-size: 10px;
                }

                .marker.critical span { color: #dc2626; }
                .marker.danger span { color: #ef4444; }
                .marker.warning span { color: #f59e0b; }
                .marker.safe span { color: #10b981; }

                @media (max-width: 768px) {
                    .liquidation-monitor {
                        padding: 16px;
                        margin: 16px 0;
                    }

                    .risk-metrics {
                        grid-template-columns: 1fr;
                        gap: 12px;
                    }

                    .metric-card {
                        padding: 16px;
                    }

                    .warning-actions {
                        flex-direction: column;
                    }

                    .action-btn {
                        width: 100%;
                    }

                    .health-markers {
                        flex-wrap: wrap;
                        gap: 8px;
                    }

                    .marker {
                        flex: 1;
                        min-width: 60px;
                    }
                }
            `}</style>
        </div>
    );
};

export default LiquidationMonitor; 