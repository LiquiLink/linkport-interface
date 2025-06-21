import React, { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';

interface RiskData {
    collateralValue: number;
    borrowedValue: number;
    collateralRatio: number;
    liquidationRisk: 'safe' | 'warning' | 'danger';
    healthFactor: number;
}

interface RiskMonitorProps {
    collateralValue: number;
    borrowedValue: number;
}

const RiskMonitor: React.FC<RiskMonitorProps> = ({ collateralValue, borrowedValue }) => {
    const [riskData, setRiskData] = useState<RiskData>({
        collateralValue: 0,
        borrowedValue: 0,
        collateralRatio: 0,
        liquidationRisk: 'safe',
        healthFactor: 0
    });

    useEffect(() => {
        // Calculate collateral ratio and risk level
        const calculateRisk = () => {
            if (borrowedValue === 0) {
                setRiskData({
                    collateralValue,
                    borrowedValue,
                    collateralRatio: 0,
                    liquidationRisk: 'safe',
                    healthFactor: 100
                });
                return;
            }

            const collateralRatio = (collateralValue / borrowedValue) * 100;
            const healthFactor = collateralRatio / 130; // 130% is liquidation threshold

            let liquidationRisk: 'safe' | 'warning' | 'danger' = 'safe';
            if (collateralRatio < 130) {
                liquidationRisk = 'danger';
            } else if (collateralRatio < 150) {
                liquidationRisk = 'warning';
            }

            setRiskData({
                collateralValue,
                borrowedValue,
                collateralRatio,
                liquidationRisk,
                healthFactor
            });
        };

        calculateRisk();
    }, [collateralValue, borrowedValue]);

    // If no borrowing, don't show risk monitoring
    if (borrowedValue === 0) {
        return null;
    }

    const getRiskColor = () => {
        switch (riskData.liquidationRisk) {
            case 'danger': return '#ef4444';
            case 'warning': return '#f59e0b';
            case 'safe': return '#22c55e';
            default: return '#6b7280';
        }
    };

    const getRiskIcon = () => {
        switch (riskData.liquidationRisk) {
            case 'danger': return '🚨';
            case 'warning': return '⚠️';
            case 'safe': return '✅';
            default: return '📊';
        }
    };

    const getRiskMessage = () => {
        switch (riskData.liquidationRisk) {
            case 'danger': 
                return 'HIGH RISK: Your position may be liquidated soon! Consider adding more collateral or repaying your loans.';
            case 'warning': 
                return 'MODERATE RISK: Your collateral ratio is getting low. Monitor closely and consider adding collateral.';
            case 'safe': 
                return 'Your position is safe. Current collateral ratio is healthy.';
            default: 
                return 'Unable to calculate risk.';
        }
    };

    return (
        <div style={{
            background: riskData.liquidationRisk === 'danger' 
                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05))'
                : riskData.liquidationRisk === 'warning'
                ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.05))'
                : 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(21, 128, 61, 0.05))',
            borderRadius: '16px',
            padding: '20px',
            border: `2px solid ${getRiskColor()}`,
            marginBottom: '24px',
            animation: riskData.liquidationRisk === 'danger' ? 'pulse 2s infinite' : 'none'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px'
            }}>
                <div style={{
                    fontSize: '32px',
                    lineHeight: 1,
                    animation: riskData.liquidationRisk === 'danger' ? 'bounce 1s infinite' : 'none'
                }}>
                    {getRiskIcon()}
                </div>
                
                <div style={{ flex: 1 }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px'
                    }}>
                        <h3 style={{
                            margin: 0,
                            fontSize: '18px',
                            fontWeight: 600,
                            color: getRiskColor()
                        }}>
                            Liquidation Risk Monitor
                        </h3>
                        <div style={{
                            fontSize: '20px',
                            fontWeight: 700,
                            color: getRiskColor()
                        }}>
                            {riskData.collateralRatio.toFixed(1)}%
                        </div>
                    </div>

                    <p style={{
                        margin: '0 0 16px 0',
                        fontSize: '14px',
                        color: '#374151',
                        lineHeight: 1.5
                    }}>
                        {getRiskMessage()}
                    </p>

                    {/* Risk indicator grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '12px',
                        marginBottom: '16px'
                    }}>
                        <div>
                            <div style={{
                                fontSize: '12px',
                                color: '#6b7280',
                                marginBottom: '4px'
                            }}>
                                Collateral Value
                            </div>
                            <div style={{
                                fontSize: '16px',
                                fontWeight: 600,
                                color: '#1f2937'
                            }}>
                                ${riskData.collateralValue.toLocaleString()}
                            </div>
                        </div>
                        
                        <div>
                            <div style={{
                                fontSize: '12px',
                                color: '#6b7280',
                                marginBottom: '4px'
                            }}>
                                Borrowed Value
                            </div>
                            <div style={{
                                fontSize: '16px',
                                fontWeight: 600,
                                color: '#1f2937'
                            }}>
                                ${riskData.borrowedValue.toLocaleString()}
                            </div>
                        </div>
                        
                        <div>
                            <div style={{
                                fontSize: '12px',
                                color: '#6b7280',
                                marginBottom: '4px'
                            }}>
                                Health Factor
                            </div>
                            <div style={{
                                fontSize: '16px',
                                fontWeight: 600,
                                color: riskData.healthFactor < 1 ? '#ef4444' : '#22c55e'
                            }}>
                                {riskData.healthFactor.toFixed(2)}
                            </div>
                        </div>
                        
                        <div>
                            <div style={{
                                fontSize: '12px',
                                color: '#6b7280',
                                marginBottom: '4px'
                            }}>
                                Liquidation Threshold
                            </div>
                            <div style={{
                                fontSize: '16px',
                                fontWeight: 600,
                                color: '#ef4444'
                            }}>
                                130%
                            </div>
                        </div>
                    </div>

                    {/* Progress bar showing collateral ratio */}
                    <div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '12px',
                            color: '#6b7280',
                            marginBottom: '6px'
                        }}>
                            <span>Collateral Ratio</span>
                            <span>{riskData.collateralRatio.toFixed(1)}%</span>
                        </div>
                        <div style={{
                            height: '8px',
                            background: '#f3f4f6',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            position: 'relative'
                        }}>
                            {/* Liquidation line marker */}
                            <div style={{
                                position: 'absolute',
                                left: '130px', // 130% position
                                width: '2px',
                                height: '100%',
                                background: '#ef4444',
                                zIndex: 2
                            }}></div>
                            
                            {/* Progress bar */}
                            <div style={{
                                height: '100%',
                                background: `linear-gradient(90deg, ${getRiskColor()}, ${getRiskColor()}dd)`,
                                width: `${Math.min(riskData.collateralRatio, 300)}%`,
                                transition: 'width 0.3s ease',
                                borderRadius: '4px'
                            }}></div>
                        </div>
                        <div style={{
                            fontSize: '10px',
                            color: '#ef4444',
                            marginTop: '4px',
                            textAlign: 'left'
                        }}>
                            ↑ Liquidation at 130%
                        </div>
                    </div>

                    {/* Quick action buttons */}
                    {riskData.liquidationRisk !== 'safe' && (
                        <div style={{
                            display: 'flex',
                            gap: '8px',
                            marginTop: '16px'
                        }}>
                            <button style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                background: '#3b82f6',
                                color: 'white',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}>
                                Add Collateral
                            </button>
                            <button style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                background: '#22c55e',
                                color: 'white',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}>
                                Repay Loans
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                @keyframes pulse {
                    0%, 100% {
                        box-shadow: 0 0 0 0 ${getRiskColor()}40;
                    }
                    50% {
                        box-shadow: 0 0 0 10px ${getRiskColor()}00;
                    }
                }
                
                @keyframes bounce {
                    0%, 20%, 50%, 80%, 100% {
                        transform: translateY(0);
                    }
                    40% {
                        transform: translateY(-10px);
                    }
                    60% {
                        transform: translateY(-5px);
                    }
                }
            `}</style>
        </div>
    );
};

export default RiskMonitor; 