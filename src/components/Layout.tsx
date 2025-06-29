import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Navigation from './Navigation';
import { useAccount, useChainId } from 'wagmi';
import { getNetworkStatus, getProtocolStats, NetworkStatus, ProtocolStats } from '../utils/networkService';
import { getMultipleAssetPrices, PriceData } from '../utils/priceService';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
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

    const getCongestionColor = (level: string) => {
        switch (level.toLowerCase()) {
            case 'high': return 'var(--danger)';
            case 'medium': return 'var(--warning)';
            case 'low': 
            default: return 'var(--success)';
        }
    };

    const getChainName = (chainId: number) => {
        switch (chainId) {
            case 97: return 'BSC Testnet';
            case 11155111: return 'Sepolia Testnet';
            case 1: return 'Ethereum Mainnet';
            case 56: return 'BNB Smart Chain';
            default: return 'Unknown Network';
        }
    };

    return (
        <>
            <Head>
                <title>Liquilink - Cross-chain DeFi Platform</title>
                <meta name="description" content="Cross-chain DeFi lending and liquidity platform powered by Chainlink CCIP" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/logo.png" type="image/png" />
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            </Head>
            <Navigation />
            <main className="animate-fade-in">
                {children}
            </main>

            {/* Enhanced Network Status Button - Floating */}
            <button
                onClick={() => setIsNetworkInfoOpen(!isNetworkInfoOpen)}
                className="network-status-button"
                style={{
                    position: 'fixed',
                    top: '90px',
                    right: 'var(--space-lg)',
                    zIndex: 1001,
                    background: 'var(--bg-glass)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all var(--transition-normal)',
                    boxShadow: 'var(--shadow-glass)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    color: 'var(--text-primary)',
                    minWidth: '140px'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-glass-hover), var(--shadow-glow)';
                    e.currentTarget.style.borderColor = 'var(--border-glass-strong)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-glass)';
                    e.currentTarget.style.borderColor = 'var(--border-glass)';
                }}
            >
                <div
                    style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: getCongestionColor(getCongestionLevel()),
                        boxShadow: `0 0 6px ${getCongestionColor(getCongestionLevel())}`,
                        animation: 'pulse 2s infinite'
                    }}
                />
                <i className="fas fa-network-wired" style={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
                <span style={{ color: getCongestionColor(getCongestionLevel()) }}>
                    {getCongestionLevel()}
                </span>
            </button>

            {/* Enhanced Network Information Modal */}
            {isNetworkInfoOpen && (
                <div
                    className="modal-overlay animate-fade-in"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.5)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'flex-end',
                        padding: '140px var(--space-lg) var(--space-lg) var(--space-lg)',
                        zIndex: 1000
                    }}
                    onClick={() => setIsNetworkInfoOpen(false)}
                >
                    <div
                        className="glass-card animate-scale-in"
                        style={{
                            background: 'var(--bg-glass-strong)',
                            backdropFilter: 'blur(20px)',
                            borderRadius: 'var(--radius-xl)',
                            border: '1px solid var(--border-glass)',
                            padding: 'var(--space-xl)',
                            minWidth: '400px',
                            maxWidth: '450px',
                            maxHeight: '80vh',
                            overflowY: 'auto',
                            boxShadow: 'var(--shadow-glass-hover)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 'var(--space-xl)',
                            paddingBottom: 'var(--space-md)',
                            borderBottom: '1px solid var(--border-glass)'
                        }}>
                            <h3 style={{
                                margin: 0,
                                fontSize: '20px',
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-sm)'
                            }}>
                                <i className="fas fa-globe" style={{ color: 'var(--accent-primary)' }} />
                                Network Information
                            </h3>
                            <button
                                onClick={() => setIsNetworkInfoOpen(false)}
                                className="button-ghost button-compact"
                                style={{
                                    background: 'transparent',
                                    border: '1px solid var(--border-glass)',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                    color: 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all var(--transition-fast)'
                                }}
                            >
                                <i className="fas fa-times" />
                            </button>
                        </div>

                        {/* Current Network Connection */}
                        <div className="glass-card" style={{
                            background: 'rgba(6, 182, 212, 0.1)',
                            borderColor: 'var(--accent-primary)',
                            marginBottom: 'var(--space-lg)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                height: '2px',
                                background: 'var(--accent-gradient)'
                            }} />
                            <h4 style={{
                                fontSize: '16px',
                                marginBottom: 'var(--space-md)',
                                color: 'var(--text-primary)',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-sm)'
                            }}>
                                <i className="fas fa-link" style={{ color: 'var(--accent-primary)' }} />
                                Current Network Connection
                            </h4>
                            <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                                <div className="stat-row">
                                    <span className="stat-label">Connected Network</span>
                                    <span className="stat-value" style={{ 
                                        color: 'var(--accent-primary)',
                                        fontWeight: 700
                                    }}>
                                        {chainId ? getChainName(chainId) : 'Not Connected'}
                                    </span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Chain ID</span>
                                    <span className="stat-value">{chainId || 'N/A'}</span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Connection Status</span>
                                    <span className="stat-value" style={{ 
                                        color: 'var(--success)',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-xs)'
                                    }}>
                                        <div style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: 'var(--success)',
                                            boxShadow: '0 0 6px var(--success)',
                                            animation: 'pulse 2s infinite'
                                        }} />
                                        Active
                                    </span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Wallet Address</span>
                                    <span className="stat-value" style={{ 
                                        fontSize: '12px',
                                        fontFamily: 'monospace',
                                        color: 'var(--text-secondary)'
                                    }}>
                                        {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Network Performance */}
                        <div className="glass-card" style={{ marginBottom: 'var(--space-lg)' }}>
                            <h4 style={{
                                fontSize: '16px',
                                marginBottom: 'var(--space-md)',
                                color: 'var(--text-primary)',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-sm)'
                            }}>
                                <i className="fas fa-chart-line" style={{ color: 'var(--accent-primary)' }} />
                                Network Performance
                            </h4>
                            <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                                <div className="stat-row">
                                    <span className="stat-label">Gas Price</span>
                                    <span className="stat-value">
                                        {networkStatus ? `${networkStatus.gasPriceGwei.standard} Gwei` : '20.00 Gwei'}
                                    </span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Network Congestion</span>
                                    <span className="stat-value" style={{ 
                                        color: getCongestionColor(getCongestionLevel()),
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-xs)'
                                    }}>
                                        <div style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            background: getCongestionColor(getCongestionLevel())
                                        }} />
                                        {getCongestionLevel()}
                                    </span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Est. Confirmation</span>
                                    <span className="stat-value">
                                        {networkStatus ? networkStatus.estimatedConfirmationTime : '~2 minutes'}
                                    </span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Block Time</span>
                                    <span className="stat-value">
                                        {networkStatus ? `${networkStatus.blockTime}s` : '12s'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Fee Breakdown */}
                        <div className="glass-card" style={{ marginBottom: 'var(--space-lg)' }}>
                            <h4 style={{
                                fontSize: '16px',
                                marginBottom: 'var(--space-md)',
                                color: 'var(--text-primary)',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-sm)'
                            }}>
                                <i className="fas fa-coins" style={{ color: 'var(--accent-primary)' }} />
                                Fee Breakdown
                            </h4>
                            <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                                <div className="stat-row">
                                    <span className="stat-label">Gas Fee (Standard)</span>
                                    <span className="stat-value">
                                        {networkStatus ? 
                                            `$${((parseFloat(networkStatus.gasPriceGwei.standard) * 21000 / 1e9) * (assetPrices.ETH?.price || 2400)).toFixed(2)}` 
                                            : '$5.20'
                                        }
                                    </span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Bridge Fee</span>
                                    <span className="stat-value">~$2.50</span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Protocol Fee</span>
                                    <span className="stat-value">0.1%</span>
                                </div>
                                <div className="stat-row highlight" style={{
                                    marginTop: 'var(--space-sm)',
                                    padding: '12px var(--space-md)'
                                }}>
                                    <span className="stat-label">Est. Total Fee</span>
                                    <span className="stat-value" style={{ fontSize: '16px', fontWeight: 700 }}>
                                        {networkStatus ? 
                                            `$${((parseFloat(networkStatus.gasPriceGwei.standard) * 21000 / 1e9) * (assetPrices.ETH?.price || 2400) + 2.5).toFixed(2)}` 
                                            : '~$7.70'
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Protocol Statistics */}
                        <div className="glass-card">
                            <h4 style={{
                                fontSize: '16px',
                                marginBottom: 'var(--space-md)',
                                color: 'var(--text-primary)',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-sm)'
                            }}>
                                <i className="fas fa-chart-bar" style={{ color: 'var(--accent-primary)' }} />
                                Protocol Statistics
                            </h4>
                            <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                                <div className="stat-row">
                                    <span className="stat-label">Total Value Locked</span>
                                    <span className="stat-value text-gradient" style={{ fontWeight: 700 }}>
                                        {protocolStats ? protocolStats.totalValueLocked : '$2.5B'}
                                    </span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Active Users</span>
                                    <span className="stat-value">
                                        {protocolStats ? protocolStats.totalUsers.toLocaleString() : '125,432'}
                                    </span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Success Rate</span>
                                    <span className="stat-value" style={{ 
                                        color: 'var(--success)',
                                        fontWeight: 600
                                    }}>
                                        {protocolStats ? `${protocolStats.successRate}%` : '99.8%'}
                                    </span>
                                </div>
                                <div className="stat-row">
                                    <span className="stat-label">Avg. Bridge Time</span>
                                    <span className="stat-value">
                                        {protocolStats ? protocolStats.averageTransactionTime : '~7 minutes'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Global Styles for Animations */}
            <style jsx global>{`
                .modal-overlay {
                    animation: modalFadeIn 0.3s ease forwards;
                }
                
                @keyframes modalFadeIn {
                    from {
                        opacity: 0;
                        backdrop-filter: blur(0px);
                    }
                    to {
                        opacity: 1;
                        backdrop-filter: blur(8px);
                    }
                }
                
                .network-status-button {
                    position: relative;
                    overflow: hidden;
                }
                
                .network-status-button::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                    transition: left 0.6s ease;
                }
                
                .network-status-button:hover::before {
                    left: 100%;
                }
            `}</style>
        </>
    );
};

export default Layout;