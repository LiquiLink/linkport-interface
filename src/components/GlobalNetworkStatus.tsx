import React, { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { getNetworkStatus, getProtocolStats, getCongestionColor, NetworkStatus, ProtocolStats } from '../utils/networkService';
import { getMultipleAssetPrices, PriceData } from '../utils/priceService';

const GlobalNetworkStatus: React.FC = () => {
    const { address } = useAccount();
    const chainId = useChainId();
    
    // Network status states
    const [isNetworkInfoOpen, setIsNetworkInfoOpen] = useState<boolean>(false);
    const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);
    const [protocolStats, setProtocolStats] = useState<ProtocolStats | null>(null);
    const [assetPrices, setAssetPrices] = useState<Record<string, PriceData>>({});

    // Load network status
    useEffect(() => {
        async function loadNetworkStatus() {
            if (chainId) {
                const status = await getNetworkStatus(chainId);
                setNetworkStatus(status);
            }
        }
        loadNetworkStatus();
    }, [chainId]);

    // Load protocol stats
    useEffect(() => {
        async function loadProtocolStats() {
            const stats = await getProtocolStats();
            setProtocolStats(stats);
        }
        loadProtocolStats();
    }, []);

    // Load asset prices
    useEffect(() => {
        async function loadAssetPrices() {
            try {
                const symbols = ['ETH', 'LINK', 'USDT', 'BNB'];
                const prices = await getMultipleAssetPrices(symbols, chainId || 97);
                setAssetPrices(prices);
            } catch (error) {
                console.error("Failed to get price data:", error);
                // Use fallback prices
                setAssetPrices({
                    ETH: { price: 2400, timestamp: Date.now(), decimals: 18, symbol: 'ETH' },
                    LINK: { price: 12, timestamp: Date.now(), decimals: 18, symbol: 'LINK' },
                    USDT: { price: 1, timestamp: Date.now(), decimals: 18, symbol: 'USDT' },
                    BNB: { price: 240, timestamp: Date.now(), decimals: 18, symbol: 'BNB' }
                });
            }
        }
        loadAssetPrices();
    }, [chainId]);

    const getCongestionLevel = () => {
        if (!networkStatus) return 'Low';
        return networkStatus.congestionLevel || 'Low';
    };

    const formatPrice = (price: number) => {
        return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const getCongestionColorLocal = (level: string) => {
        switch (level.toLowerCase()) {
            case 'high': return '#ef4444';
            case 'medium': return '#f59e0b';
            case 'low': 
            default: return '#22c55e';
        }
    };

    return (
        <>
            {/* Network Status Button - Top Right */}
            <button
                onClick={() => setIsNetworkInfoOpen(!isNetworkInfoOpen)}
                style={{
                    position: 'fixed',
                    top: '80px', // Below navigation
                    right: '20px',
                    zIndex: 1001,
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: getCongestionColorLocal(getCongestionLevel())
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                }}
            >
                <i className="fas fa-network-wired" style={{ fontSize: '12px' }}></i>
                Network: {getCongestionLevel()}
            </button>

            {/* Network Information Popup */}
            {isNetworkInfoOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.3)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'flex-end',
                        padding: '130px 20px 20px 20px', // More space from top due to button position
                        zIndex: 1000,
                        animation: 'fadeIn 0.2s ease'
                    }}
                    onClick={() => setIsNetworkInfoOpen(false)}
                >
                    <div
                        style={{
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            padding: '20px',
                            minWidth: '350px',
                            maxWidth: '400px',
                            maxHeight: '80vh',
                            overflowY: 'auto',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                            transform: isNetworkInfoOpen ? 'translateX(0)' : 'translateX(100%)',
                            transition: 'transform 0.3s ease',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px',
                            paddingBottom: '12px',
                            borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
                        }}>
                            <h3 style={{
                                margin: 0,
                                fontSize: '18px',
                                fontWeight: 600,
                                color: '#1e1e1e'
                            }}>
                                🌐 Network Information
                            </h3>
                            <button
                                onClick={() => setIsNetworkInfoOpen(false)}
                                style={{
                                    background: 'rgba(0, 0, 0, 0.1)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    cursor: 'pointer',
                                    fontSize: '18px',
                                    color: '#666',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Current Network Connection */}
                        <div style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '16px',
                            border: '1px solid rgba(59, 130, 246, 0.2)'
                        }}>
                            <h4 style={{ fontSize: '14px', marginBottom: '12px', color: '#1e1e1e' }}>
                                🔗 Current Network Connection
                            </h4>
                            <div style={{ display: 'grid', gap: '8px' }}>
                                <div className="stat-row compact">
                                    <span>Connected Network</span>
                                    <span style={{ fontWeight: 600, color: '#3b82f6' }}>
                                        {chainId === 97 ? 'BSC Testnet' : chainId === 11155111 ? 'Sepolia Testnet' : 'Unknown Network'}
                                    </span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Chain ID</span>
                                    <span>{chainId || 'Not connected'}</span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Connection Status</span>
                                    <span style={{ 
                                        color: '#22c55e',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <span style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: '#22c55e',
                                            animation: 'pulse 2s infinite'
                                        }}></span>
                                        Active
                                    </span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Wallet Address</span>
                                    <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                                        {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Network Performance */}
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.7)',
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '16px'
                        }}>
                            <h4 style={{ fontSize: '14px', marginBottom: '12px', color: '#1e1e1e' }}>
                                📊 Network Performance
                            </h4>
                            <div style={{ display: 'grid', gap: '8px' }}>
                                <div className="stat-row compact">
                                    <span>Gas Price</span>
                                    <span>{networkStatus ? `${networkStatus.gasPriceGwei.standard} Gwei` : '20.00 Gwei'}</span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Network Congestion</span>
                                    <span style={{ 
                                        color: networkStatus ? getCongestionColorLocal(networkStatus.congestionLevel) : '#f59e0b',
                                        fontWeight: 600
                                    }}>
                                        {getCongestionLevel()}
                                    </span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Est. Confirmation</span>
                                    <span>{networkStatus ? networkStatus.estimatedConfirmationTime : '~2 minutes'}</span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Block Time</span>
                                    <span>{networkStatus ? `${networkStatus.blockTime}s` : '12s'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Fee Breakdown */}
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.7)',
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '16px'
                        }}>
                            <h4 style={{ fontSize: '14px', marginBottom: '12px', color: '#1e1e1e' }}>
                                💰 Fee Breakdown
                            </h4>
                            <div style={{ display: 'grid', gap: '8px' }}>
                                <div className="stat-row compact">
                                    <span>Gas Fee (Standard)</span>
                                    <span>{networkStatus ? `$${((parseFloat(networkStatus.gasPriceGwei.standard) * 21000 / 1e9) * (assetPrices.ETH?.price || 3000)).toFixed(2)}` : '$5.20'}</span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Bridge Fee</span>
                                    <span>~$2.50</span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Protocol Fee</span>
                                    <span>0.1%</span>
                                </div>
                                <div style={{
                                    paddingTop: '8px',
                                    borderTop: '1px solid rgba(0, 0, 0, 0.1)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontWeight: 600
                                }}>
                                    <span>Est. Total Fee</span>
                                    <span style={{ color: '#3b82f6' }}>
                                        {networkStatus ? 
                                            `$${((parseFloat(networkStatus.gasPriceGwei.standard) * 21000 / 1e9) * (assetPrices.ETH?.price || 3000) + 2.5).toFixed(2)}` 
                                            : '~$7.70'
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Protocol Statistics */}
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.7)',
                            borderRadius: '12px',
                            padding: '16px'
                        }}>
                            <h4 style={{ fontSize: '14px', marginBottom: '12px', color: '#1e1e1e' }}>
                                📈 Protocol Statistics
                            </h4>
                            <div style={{ display: 'grid', gap: '8px' }}>
                                <div className="stat-row compact">
                                    <span>Total Value Locked</span>
                                    <span>{protocolStats ? protocolStats.totalValueLocked : '$2.5B'}</span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Active Users</span>
                                    <span>{protocolStats ? protocolStats.totalUsers.toLocaleString() : '125,432'}</span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Success Rate</span>
                                    <span style={{ color: '#22c55e', fontWeight: 600 }}>
                                        {protocolStats ? `${protocolStats.successRate}%` : '99.8%'}
                                    </span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Avg. Bridge Time</span>
                                    <span>{protocolStats ? protocolStats.averageTransactionTime : '~7 minutes'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CSS for animations */}
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                .stat-row.compact {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 13px;
                    color: #374151;
                }
                .stat-row.compact span:first-child {
                    color: #6b7280;
                }
                .stat-row.compact span:last-child {
                    font-weight: 500;
                    color: #1f2937;
                }
            `}</style>
        </>
    );
};

export default GlobalNetworkStatus; 
 