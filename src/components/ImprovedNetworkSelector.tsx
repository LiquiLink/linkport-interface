import React, { useState, useEffect } from 'react';

interface NetworkData {
    id: string;
    name: string;
    symbol: string;
    chainId: number;
    stakingApy: number;
    totalStaked: string;
    userBalance: number;
    userStaked: number;
    icon: string;
    color: string;
}

interface ImprovedNetworkSelectorProps {
    selectedNetwork: string;
    onNetworkChange: (networkId: string) => void;
}

const ImprovedNetworkSelector: React.FC<ImprovedNetworkSelectorProps> = ({ 
    selectedNetwork, 
    onNetworkChange 
}) => {
    const [networks] = useState<NetworkData[]>([
        {
            id: 'optimism',
            name: 'Optimism',
            symbol: 'OP',
            chainId: 10,
            stakingApy: 4.2,
            totalStaked: '1,234,567',
            userBalance: 125.45,
            userStaked: 50.0,
            icon: 'OP',
            color: '#FF0420'
        },
        {
            id: 'arbitrum',
            name: 'Arbitrum',
            symbol: 'ARB',
            chainId: 42161,
            stakingApy: 3.8,
            totalStaked: '987,654',
            userBalance: 89.32,
            userStaked: 25.5,
            icon: 'ARB',
            color: '#28A0F0'
        },
        {
            id: 'polygon',
            name: 'Polygon',
            symbol: 'MATIC',
            chainId: 137,
            stakingApy: 5.1,
            totalStaked: '2,456,789',
            userBalance: 1250.75,
            userStaked: 500.0,
            icon: 'POLY',
            color: '#8247E5'
        },
        {
            id: 'avalanche',
            name: 'Avalanche',
            symbol: 'AVAX',
            chainId: 43114,
            stakingApy: 6.5,
            totalStaked: '789,123',
            userBalance: 15.67,
            userStaked: 10.0,
            icon: 'AVAX',
            color: '#E84142'
        }
    ]);

    const formatNumber = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toFixed(2);
    };

    const formatCurrency = (num: number) => {
        return `$${formatNumber(num)}`;
    };

    return (
        <div className="network-selector-compact">
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '1px solid var(--border-color)'
            }}>
                <h3 style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--text-color)'
                }}>Select Target Network</h3>
                <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'var(--accent-color)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px'
                }}>
                    <i className="fas fa-network-wired"></i>
                </div>
            </div>

            <div style={{ display: 'grid', gap: '10px', marginBottom: '16px' }}>
                {networks.map((network) => (
                    <div
                        key={network.id}
                        onClick={() => onNetworkChange(network.id)}
                        className="network-item-compact"
                        style={{
                            background: selectedNetwork === network.id 
                                ? 'rgba(59, 130, 246, 0.15)' 
                                : 'rgba(255, 255, 255, 0.9)',
                            border: selectedNetwork === network.id 
                                ? '2px solid #3b82f6' 
                                : '2px solid transparent',
                            boxShadow: selectedNetwork === network.id 
                                ? '0 4px 12px rgba(59, 130, 246, 0.3)' 
                                : '0 2px 8px rgba(0, 0, 0, 0.1)'
                        }}
                    >
                        {/* Network Header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '10px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="token-icon small" style={{ 
                                    background: network.color,
                                    color: 'white',
                                    fontWeight: 600
                                }}>
                                    {network.icon}
                                </div>
                                <div>
                                    <div style={{
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        color: 'var(--text-color)'
                                    }}>
                                        {network.name}
                                    </div>
                                    <div style={{
                                        fontSize: '10px',
                                        color: 'var(--secondary-text)'
                                    }}>
                                        Chain ID: {network.chainId}
                                    </div>
                                </div>
                            </div>
                            {selectedNetwork === network.id && (
                                <div style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    background: '#22c55e',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '10px'
                                }}>
                                    <i className="fas fa-check"></i>
                                </div>
                            )}
                        </div>

                        {/* APY Highlight */}
                        <div style={{
                            background: 'rgba(34, 197, 94, 0.15)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            borderRadius: '8px',
                            padding: '8px',
                            marginBottom: '10px',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                fontSize: '10px',
                                color: 'var(--secondary-text)',
                                marginBottom: '2px'
                            }}>
                                                                            Staking APY
                            </div>
                            <div style={{
                                fontSize: '16px',
                                fontWeight: 700,
                                color: '#22c55e'
                            }}>
                                {network.stakingApy}%
                            </div>
                        </div>

                        {/* Network Statistics */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '6px',
                            marginBottom: '10px'
                        }}>
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.7)',
                                borderRadius: '6px',
                                padding: '6px',
                                textAlign: 'center'
                            }}>
                                <div style={{
                                    fontSize: '9px',
                                    color: 'var(--secondary-text)',
                                    marginBottom: '2px'
                                }}>
                                                                                Total Staked
                                </div>
                                <div style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: 'var(--text-color)'
                                }}>
                                    {network.totalStaked} {network.symbol}
                                </div>
                            </div>
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.7)',
                                borderRadius: '6px',
                                padding: '6px',
                                textAlign: 'center'
                            }}>
                                <div style={{
                                    fontSize: '9px',
                                    color: 'var(--secondary-text)',
                                    marginBottom: '2px'
                                }}>
                                    Your Balance
                                </div>
                                <div style={{
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: 'var(--text-color)'
                                }}>
                                    {network.userBalance} {network.symbol}
                                </div>
                            </div>
                        </div>

                        {/* User Position - Compact */}
                        {network.userStaked > 0 && (
                            <div style={{
                                background: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                borderRadius: '6px',
                                padding: '6px',
                                fontSize: '10px'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: '2px'
                                }}>
                                    <span style={{ color: 'var(--secondary-text)' }}>
                                        Staked:
                                    </span>
                                    <span style={{
                                        fontWeight: 600,
                                        color: '#3b82f6'
                                    }}>
                                        {network.userStaked} {network.symbol}
                                    </span>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between'
                                }}>
                                    <span style={{ color: 'var(--secondary-text)' }}>
                                        Est. Annual Yield:
                                    </span>
                                    <span style={{
                                        fontWeight: 600,
                                        color: '#22c55e'
                                    }}>
                                        +{(network.userStaked * network.stakingApy / 100).toFixed(2)} {network.symbol}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons for Selected Network */}
                        {selectedNetwork === network.id && (
                            <div style={{
                                display: 'flex',
                                gap: '6px',
                                marginTop: '10px'
                            }}>
                                <button 
                                    className="button compact secondary"
                                    style={{ flex: 1 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Handle stake action
                                    }}
                                >
                                    Stake {network.symbol}
                                </button>
                                {network.userStaked > 0 && (
                                    <button 
                                        className="button compact secondary"
                                        style={{ 
                                            flex: 1,
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            color: '#ef4444',
                                            borderColor: 'rgba(239, 68, 68, 0.3)'
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Handle unstake action
                                        }}
                                    >
                                        Unstake
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Summary Card - Compact */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.6)',
                borderRadius: '12px',
                padding: '12px'
            }}>
                <div className="stat-row compact">
                    <span>Cross-chain Total Value</span>
                    <span>$2.5B</span>
                </div>
                <div className="stat-row compact">
                    <span>Active Users</span>
                    <span>125,432</span>
                </div>
                <div className="stat-row compact">
                    <span>Your Total Staked Value</span>
                    <span style={{ color: '#22c55e' }}>
                        {formatCurrency(
                            networks.reduce((sum, n) => sum + (n.userStaked * (n.symbol === 'AVAX' ? 25 : n.symbol === 'MATIC' ? 0.8 : 2.5)), 0)
                        )}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ImprovedNetworkSelector; 