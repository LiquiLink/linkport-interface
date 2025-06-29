import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useAccount, useChainId } from 'wagmi';

interface AnalyticsModalProps {
    isOpen: boolean;
    onClose: () => void;
    portfolioData?: any;
    userPositions?: any[];
    assetPrices?: any;
}

interface Transaction {
    id: string;
    type: 'deposit' | 'withdraw' | 'borrow' | 'repay' | 'bridge';
    asset: string;
    amount: number;
    value: number;
    date: Date;
    chain: string;
    status: 'completed' | 'pending' | 'failed';
}

const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ 
    isOpen, 
    onClose, 
    portfolioData,
    userPositions = [],
    assetPrices = {}
}) => {
    const { address } = useAccount();
    const chainId = useChainId();
    const [activeTab, setActiveTab] = useState<'assets' | 'yield' | 'risk' | 'history'>('assets');
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    // Mock data for demonstration - in real app, fetch from API/blockchain
    const mockTransactions: Transaction[] = [
        {
            id: '1',
            type: 'deposit',
            asset: 'USDT',
            amount: 1000,
            value: 1000,
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            chain: 'Sepolia',
            status: 'completed'
        },
        {
            id: '2',
            type: 'borrow',
            asset: 'ETH',
            amount: 0.5,
            value: 1200,
            date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            chain: 'Sepolia',
            status: 'completed'
        },
        {
            id: '3',
            type: 'bridge',
            asset: 'USDT',
            amount: 500,
            value: 500,
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            chain: 'BSC → Sepolia',
            status: 'completed'
        }
    ];

    useEffect(() => {
        if (isOpen && address) {
            // Load transaction history from localStorage or API
            const savedTransactions = localStorage.getItem(`transactions_${address}`);
            if (savedTransactions) {
                setTransactions(JSON.parse(savedTransactions));
            } else {
                setTransactions(mockTransactions);
            }
        }
    }, [isOpen, address]);

    const tabs = [
        { id: 'assets', label: 'Assets', icon: '📊' },
        { id: 'yield', label: 'Yield', icon: '📈' },
        { id: 'risk', label: 'Risk', icon: '⚠️' },
        { id: 'history', label: 'History', icon: '📋' }
    ];

    const timeRanges = [
        { id: '7d', label: '7 Days' },
        { id: '30d', label: '30 Days' },
        { id: '90d', label: '90 Days' },
        { id: 'all', label: 'All Time' }
    ];

    const getChainName = (chainId: number) => {
        switch (chainId) {
            case 97: return 'BSC Testnet';
            case 11155111: return 'Sepolia';
            default: return 'Unknown';
        }
    };

    const calculateTotalYield = () => {
        const totalStaked = userPositions.reduce((sum, pos) => sum + pos.value, 0);
        const averageAPY = userPositions.length > 0 
            ? userPositions.reduce((sum, pos) => sum + parseFloat(pos.apy.replace('%', '')), 0) / userPositions.length 
            : 0;
        
        const dailyYield = (totalStaked * averageAPY / 100) / 365;
        const monthlyYield = dailyYield * 30;
        
        return { dailyYield, monthlyYield, averageAPY };
    };

    const renderAssetAnalysis = () => {
        const totalValue = portfolioData?.totalValue || 0;
        const totalLiquidity = portfolioData?.totalLiquidity || 0;
        const total = totalValue + totalLiquidity;
        
        const walletPercentage = total > 0 ? (totalValue / total) * 100 : 0;
        const liquidityPercentage = total > 0 ? (totalLiquidity / total) * 100 : 0;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Asset Allocation */}
                <div>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
                        Asset Allocation
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div style={{
                            padding: '16px',
                            background: 'var(--bg-card)',
                            borderRadius: '12px',
                            border: '1px solid var(--border-glass)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6' }}></div>
                                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>Wallet Balance</span>
                            </div>
                            <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                ${totalValue.toFixed(2)}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {walletPercentage.toFixed(1)}% of total
                            </div>
                        </div>

                        <div style={{
                            padding: '16px',
                            background: 'var(--bg-card)',
                            borderRadius: '12px',
                            border: '1px solid var(--border-glass)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e' }}></div>
                                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>Liquidity Staked</span>
                            </div>
                            <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                ${totalLiquidity.toFixed(2)}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {liquidityPercentage.toFixed(1)}% of total
                            </div>
                        </div>
                    </div>
                </div>

                {/* Current Network */}
                <div>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
                        Current Network Activity
                    </h4>
                    <div style={{
                        padding: '16px',
                        background: 'var(--bg-card)',
                        borderRadius: '12px',
                        border: '1px solid var(--border-glass)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {getChainName(chainId || 97)}
                                </div>
                                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                    {userPositions.length} active positions
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    ${(totalValue + totalLiquidity).toFixed(2)}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    Total Value
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderYieldAnalysis = () => {
        const { dailyYield, monthlyYield, averageAPY } = calculateTotalYield();
        
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Yield Summary */}
                <div>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
                        Yield Summary
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                        <div style={{
                            padding: '16px',
                            background: 'var(--bg-card)',
                            borderRadius: '12px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: '#22c55e' }}>
                                {averageAPY.toFixed(1)}%
                            </div>
                            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                Average APY
                            </div>
                        </div>
                        
                        <div style={{
                            padding: '16px',
                            background: 'var(--bg-card)',
                            borderRadius: '12px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b' }}>
                                ${dailyYield.toFixed(2)}
                            </div>
                            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                Daily Yield
                            </div>
                        </div>
                        
                        <div style={{
                            padding: '16px',
                            background: 'var(--bg-card)',
                            borderRadius: '12px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>
                                ${monthlyYield.toFixed(2)}
                            </div>
                            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                Monthly Yield
                            </div>
                        </div>
                    </div>
                </div>

                {/* Position Performance */}
                <div>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
                        Position Performance
                    </h4>
                    {userPositions.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {userPositions.map((position, index) => (
                                <div key={index} style={{
                                    padding: '16px',
                                    background: 'var(--bg-card)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border-glass)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                {position.token} Pool
                                            </div>
                                            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                                {position.chain} • {position.shares} LP tokens
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '16px', fontWeight: 600, color: '#22c55e' }}>
                                                {position.apy}
                                            </div>
                                            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                                ${position.value.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px',
                            color: 'var(--text-secondary)'
                        }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📈</div>
                            <div>No active positions to analyze</div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderRiskAnalysis = () => {
        const totalCollateral = portfolioData?.netWorth || 0;
        const healthFactor = 2.5; // Mock data
        const liquidationPrice = 1800; // Mock data
        
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Risk Metrics */}
                <div>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
                        Risk Metrics
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div style={{
                            padding: '16px',
                            background: 'var(--bg-card)',
                            borderRadius: '12px',
                            border: '1px solid var(--border-glass)'
                        }}>
                            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                Health Factor
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: '#22c55e' }}>
                                {healthFactor.toFixed(2)}
                            </div>
                            <div style={{ fontSize: '12px', color: '#22c55e' }}>
                                ✅ Safe
                            </div>
                        </div>
                        
                        <div style={{
                            padding: '16px',
                            background: 'var(--bg-card)',
                            borderRadius: '12px',
                            border: '1px solid var(--border-glass)'
                        }}>
                            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                Liquidation Price (ETH)
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b' }}>
                                ${liquidationPrice}
                            </div>
                            <div style={{ fontSize: '12px', color: '#f59e0b' }}>
                                ⚠️ Monitor
                            </div>
                        </div>
                    </div>
                </div>

                {/* Risk Distribution */}
                <div>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
                        Risk Distribution
                    </h4>
                    <div style={{
                        padding: '20px',
                        background: 'var(--bg-card)',
                        borderRadius: '12px',
                        border: '1px solid var(--border-glass)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Low Risk</span>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>75%</span>
                        </div>
                        <div style={{
                            width: '100%',
                            height: '8px',
                            background: '#f3f4f6',
                            borderRadius: '4px',
                            marginBottom: '16px'
                        }}>
                            <div style={{
                                width: '75%',
                                height: '100%',
                                background: '#22c55e',
                                borderRadius: '4px'
                            }}></div>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Medium Risk</span>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>20%</span>
                        </div>
                        <div style={{
                            width: '100%',
                            height: '8px',
                            background: '#f3f4f6',
                            borderRadius: '4px',
                            marginBottom: '16px'
                        }}>
                            <div style={{
                                width: '20%',
                                height: '100%',
                                background: '#f59e0b',
                                borderRadius: '4px'
                            }}></div>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>High Risk</span>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>5%</span>
                        </div>
                        <div style={{
                            width: '100%',
                            height: '8px',
                            background: '#f3f4f6',
                            borderRadius: '4px'
                        }}>
                            <div style={{
                                width: '5%',
                                height: '100%',
                                background: '#ef4444',
                                borderRadius: '4px'
                            }}></div>
                        </div>
                    </div>
                </div>

                {/* Risk Recommendations */}
                <div>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
                        Recommendations
                    </h4>
                    <div style={{
                        padding: '16px',
                        background: 'var(--bg-card)',
                        borderRadius: '12px',
                        border: '1px solid var(--border-glass)'
                    }}>
                        <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
                            <li>Your health factor is healthy. Consider diversifying across more pools.</li>
                            <li>Monitor ETH price movements as they affect your liquidation threshold.</li>
                            <li>Consider adding more collateral if ETH drops below $2000.</li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    };

    const renderTransactionHistory = () => {
        const filteredTransactions = transactions.filter(tx => {
            const now = new Date();
            const txDate = new Date(tx.date);
            const daysDiff = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
            
            switch (timeRange) {
                case '7d': return daysDiff <= 7;
                case '30d': return daysDiff <= 30;
                case '90d': return daysDiff <= 90;
                default: return true;
            }
        });

        const getTransactionIcon = (type: string) => {
            switch (type) {
                case 'deposit': return '⬇️';
                case 'withdraw': return '⬆️';
                case 'borrow': return '💰';
                case 'repay': return '💳';
                case 'bridge': return '🌉';
                default: return '📝';
            }
        };

        const getStatusColor = (status: string) => {
            switch (status) {
                case 'completed': return '#22c55e';
                case 'pending': return '#f59e0b';
                case 'failed': return '#ef4444';
                default: return '#6b7280';
            }
        };

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Time Range Selector */}
                <div>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
                        Transaction History
                    </h4>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        {timeRanges.map(range => (
                            <button
                                key={range.id}
                                onClick={() => setTimeRange(range.id as any)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-glass)',
                                    background: timeRange === range.id ? 'var(--accent-gradient)' : 'var(--bg-card)',
                                    color: timeRange === range.id ? 'white' : 'var(--text-primary)',
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                {range.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Transaction List */}
                <div>
                    {filteredTransactions.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {filteredTransactions.map(tx => (
                                <div key={tx.id} style={{
                                    padding: '16px',
                                    background: 'var(--bg-card)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border-glass)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ fontSize: '24px' }}>
                                                {getTransactionIcon(tx.type)}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '16px', fontWeight: 600, textTransform: 'capitalize', color: 'var(--text-primary)' }}>
                                                    {tx.type} {tx.asset}
                                                </div>
                                                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                                    {tx.chain} • {tx.date.toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                {tx.amount} {tx.asset}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                                                    ${tx.value.toFixed(2)}
                                                </span>
                                                <span style={{
                                                    fontSize: '12px',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    background: getStatusColor(tx.status),
                                                    color: 'white'
                                                }}>
                                                    {tx.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px',
                            color: 'var(--text-secondary)'
                        }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                            <div>No transactions found in selected time range</div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Portfolio Analytics" size="large">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Tab Navigation */}
                <div style={{
                    display: 'flex',
                    gap: '4px',
                    padding: '4px',
                    background: 'var(--bg-card)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-glass)'
                }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            style={{
                                flex: 1,
                                padding: '12px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                background: activeTab === tab.id ? 'var(--accent-gradient)' : 'transparent',
                                color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <span>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div style={{ minHeight: '400px' }}>
                    {activeTab === 'assets' && renderAssetAnalysis()}
                    {activeTab === 'yield' && renderYieldAnalysis()}
                    {activeTab === 'risk' && renderRiskAnalysis()}
                    {activeTab === 'history' && renderTransactionHistory()}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        className="button secondary"
                    >
                        Close
                    </button>
                    <button
                        onClick={() => {
                            // Export analytics data
                            const data = {
                                portfolio: portfolioData,
                                positions: userPositions,
                                transactions: transactions,
                                exportDate: new Date().toISOString()
                            };
                            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `linkport-analytics-${new Date().toISOString().split('T')[0]}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                        }}
                        className="button primary"
                    >
                        Export Data
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default AnalyticsModal; 
 