import React, { useState } from 'react';
import Layout from '../components/Layout';

const History: React.FC = () => {
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [selectedTimeframe, setSelectedTimeframe] = useState('30days');

    const transactions = [
        {
            id: '1',
            type: 'borrow',
            action: 'Cross-chain Borrow',
            token: 'ETH',
            amount: '2.5',
            value: '$7,500',
            fromChain: 'Ethereum',
            toChain: 'Optimism',
            timestamp: '2 hours ago',
            status: 'completed',
            txHash: '0x1234...5678'
        },
        {
            id: '2',
            type: 'repay',
            action: 'Repayment',
            token: 'USDC',
            amount: '1,000',
            value: '$1,000',
            fromChain: 'Polygon',
            toChain: null,
            timestamp: '1 day ago',
            status: 'completed',
            txHash: '0xabcd...efgh'
        },
        {
            id: '3',
            type: 'bridge',
            action: 'Asset Bridge',
            token: 'LINK',
            amount: '50',
            value: '$750',
            fromChain: 'Ethereum',
            toChain: 'Arbitrum',
            timestamp: '3 days ago',
            status: 'completed',
            txHash: '0x9876...5432'
        },
        {
            id: '4',
            type: 'deposit',
            action: 'Liquidity Deposit',
            token: 'ETH/USDC',
            amount: '1.5',
            value: '$4,500',
            fromChain: 'Ethereum',
            toChain: null,
            timestamp: '5 days ago',
            status: 'completed',
            txHash: '0xdef0...1234'
        },
        {
            id: '5',
            type: 'borrow',
            action: 'Cross-chain Borrow',
            token: 'USDT',
            amount: '2,500',
            value: '$2,500',
            fromChain: 'Ethereum',
            toChain: 'Polygon',
            timestamp: '1 week ago',
            status: 'pending',
            txHash: '0x5678...9abc'
        }
    ];

    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'borrow':
                return { icon: 'fas fa-arrow-up', color: '#22c55e' };
            case 'repay':
                return { icon: 'fas fa-arrow-down', color: '#ef4444' };
            case 'bridge':
                return { icon: 'fas fa-exchange-alt', color: '#4166f5' };
            case 'deposit':
                return { icon: 'fas fa-plus', color: '#f59e0b' };
            default:
                return { icon: 'fas fa-circle', color: '#6b7280' };
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return '#22c55e';
            case 'pending':
                return '#f59e0b';
            case 'failed':
                return '#ef4444';
            default:
                return '#6b7280';
        }
    };

    const filteredTransactions = transactions.filter(tx => {
        if (selectedFilter === 'all') return true;
        return tx.type === selectedFilter;
    });

    return (
        <Layout>
            <div className="container">
                <div className="glass-card" style={{ maxWidth: '900px', margin: '0 auto' }}>
                    <h2 style={{ 
                        marginBottom: '24px', 
                        fontSize: '28px',
                        fontWeight: 600,
                        color: 'var(--text-color)'
                    }}>
                        Transaction History
                    </h2>
                    
                    {/* Filters */}
                    <div style={{
                        display: 'flex',
                        gap: '16px',
                        marginBottom: '24px',
                        flexWrap: 'wrap'
                    }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '14px',
                                color: 'var(--secondary-text)',
                                fontWeight: 500
                            }}>
                                Transaction Type
                            </label>
                            <select
                                value={selectedFilter}
                                onChange={(e) => setSelectedFilter(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border-color)',
                                    background: 'white',
                                    fontSize: '14px',
                                    color: 'var(--text-color)',
                                    outline: 'none'
                                }}
                            >
                                <option value="all">All Transaction Types</option>
                                <option value="borrow">Borrow</option>
                                <option value="repay">Repay</option>
                                <option value="bridge">Bridge</option>
                                <option value="deposit">Deposit</option>
                            </select>
                        </div>
                        
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '14px',
                                color: 'var(--secondary-text)',
                                fontWeight: 500
                            }}>
                                Time Period
                            </label>
                            <select
                                value={selectedTimeframe}
                                onChange={(e) => setSelectedTimeframe(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border-color)',
                                    background: 'white',
                                    fontSize: '14px',
                                    color: 'var(--text-color)',
                                    outline: 'none'
                                }}
                            >
                                <option value="30days">Last 30 Days</option>
                                <option value="7days">Last 7 Days</option>
                                <option value="24hours">Last 24 Hours</option>
                                <option value="all">All Time</option>
                            </select>
                        </div>
                    </div>

                    {/* Transaction List */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.6)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '16px',
                        border: '1px solid var(--border-color)',
                        overflow: 'hidden'
                    }}>
                        {filteredTransactions.length === 0 ? (
                            <div style={{
                                padding: '48px 24px',
                                textAlign: 'center',
                                color: 'var(--secondary-text)'
                            }}>
                                <i className="fas fa-history" style={{ fontSize: '32px', marginBottom: '16px' }}></i>
                                <div>No transactions found for the selected filters.</div>
                            </div>
                        ) : (
                            filteredTransactions.map((transaction, index) => (
                                <div key={transaction.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '20px 24px',
                                    borderBottom: index < filteredTransactions.length - 1 ? '1px solid var(--border-color)' : 'none',
                                    transition: 'background 0.2s ease'
                                }}>
                                    {/* Transaction Icon */}
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        background: `${getTransactionIcon(transaction.type).color}20`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: '16px'
                                    }}>
                                        <i 
                                            className={getTransactionIcon(transaction.type).icon}
                                            style={{ 
                                                color: getTransactionIcon(transaction.type).color,
                                                fontSize: '16px'
                                            }}
                                        ></i>
                                    </div>

                                    {/* Transaction Details */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontSize: '16px',
                                            fontWeight: 600,
                                            color: 'var(--text-color)',
                                            marginBottom: '4px'
                                        }}>
                                            {transaction.action}
                                        </div>
                                        <div style={{
                                            fontSize: '14px',
                                            color: 'var(--secondary-text)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <span>{transaction.timestamp}</span>
                                            {transaction.toChain && (
                                                <>
                                                    <span>•</span>
                                                    <span>{transaction.fromChain} → {transaction.toChain}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Amount */}
                                    <div style={{
                                        textAlign: 'right',
                                        marginRight: '16px'
                                    }}>
                                        <div style={{
                                            fontSize: '16px',
                                            fontWeight: 600,
                                            color: transaction.type === 'repay' ? '#ef4444' : '#22c55e'
                                        }}>
                                            {transaction.type === 'repay' ? '-' : '+'}{transaction.amount} {transaction.token}
                                        </div>
                                        <div style={{
                                            fontSize: '14px',
                                            color: 'var(--secondary-text)'
                                        }}>
                                            {transaction.value}
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div style={{
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        background: `${getStatusColor(transaction.status)}20`,
                                        color: getStatusColor(transaction.status),
                                        textTransform: 'capitalize',
                                        marginRight: '16px'
                                    }}>
                                        {transaction.status}
                                    </div>

                                    {/* View Details */}
                                    <button style={{
                                        padding: '8px',
                                        border: 'none',
                                        background: 'transparent',
                                        color: 'var(--secondary-text)',
                                        cursor: 'pointer',
                                        borderRadius: '6px',
                                        transition: 'all 0.2s ease'
                                    }}>
                                        <i className="fas fa-external-link-alt"></i>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Summary Stats */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '16px',
                        marginTop: '24px'
                    }}>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.6)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '12px',
                            padding: '16px',
                            textAlign: 'center',
                            border: '1px solid var(--border-color)'
                        }}>
                            <div style={{
                                fontSize: '20px',
                                fontWeight: 700,
                                color: 'var(--text-color)',
                                marginBottom: '4px'
                            }}>
                                {transactions.length}
                            </div>
                            <div style={{
                                fontSize: '12px',
                                color: 'var(--secondary-text)'
                            }}>
                                Total Transactions
                            </div>
                        </div>

                        <div style={{
                            background: 'rgba(255, 255, 255, 0.6)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '12px',
                            padding: '16px',
                            textAlign: 'center',
                            border: '1px solid var(--border-color)'
                        }}>
                            <div style={{
                                fontSize: '20px',
                                fontWeight: 700,
                                color: '#22c55e',
                                marginBottom: '4px'
                            }}>
                                {transactions.filter(tx => tx.status === 'completed').length}
                            </div>
                            <div style={{
                                fontSize: '12px',
                                color: 'var(--secondary-text)'
                            }}>
                                Completed
                            </div>
                        </div>

                        <div style={{
                            background: 'rgba(255, 255, 255, 0.6)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '12px',
                            padding: '16px',
                            textAlign: 'center',
                            border: '1px solid var(--border-color)'
                        }}>
                            <div style={{
                                fontSize: '20px',
                                fontWeight: 700,
                                color: '#f59e0b',
                                marginBottom: '4px'
                            }}>
                                {transactions.filter(tx => tx.status === 'pending').length}
                            </div>
                            <div style={{
                                fontSize: '12px',
                                color: 'var(--secondary-text)'
                            }}>
                                Pending
                            </div>
                        </div>

                        <div style={{
                            background: 'rgba(255, 255, 255, 0.6)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '12px',
                            padding: '16px',
                            textAlign: 'center',
                            border: '1px solid var(--border-color)'
                        }}>
                            <div style={{
                                fontSize: '20px',
                                fontWeight: 700,
                                color: 'var(--text-color)',
                                marginBottom: '4px'
                            }}>
                                $16.25K
                            </div>
                            <div style={{
                                fontSize: '12px',
                                color: 'var(--secondary-text)'
                            }}>
                                Total Volume
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default History;