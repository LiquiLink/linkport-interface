import React, { useState, useEffect, useRef } from 'react';
import { useAccount, useChainId } from 'wagmi';
import Layout from '../components/Layout';
import useTransactions from '../hooks/useTransactions';
import { TransactionFilter } from '../utils/transactionStorage';
import { useLiquidationDemo } from '../hooks/useLiquidationEvents';
import { useToast } from '../components/Toast';

const History: React.FC = () => {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const [isClient, setIsClient] = useState(false);
    
    const {
        filteredTransactions,
        stats,
        isLoading,
        error,
        applyFilter,
        clearFilter,
        exportTransactions,
        importTransactions,
        currentFilter
    } = useTransactions();

    const [selectedFilter, setSelectedFilter] = useState('all');
    const [selectedTimeframe, setSelectedTimeframe] = useState('30days');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [showExportModal, setShowExportModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importData, setImportData] = useState('');
    
    // Modal animation states
    const [exportModalActive, setExportModalActive] = useState(false);
    const [importModalActive, setImportModalActive] = useState(false);
    const exportTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const importTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Liquidation demo functionality
    const { createDemoLiquidation } = useLiquidationDemo();
    
    const { showToast, ToastContainer } = useToast();

    // Prevent hydration errors
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Apply filter when filter changes
    useEffect(() => {
        if (!isClient) return;
        
        const filter: TransactionFilter = {};
        
        if (selectedFilter !== 'all') {
            filter.type = selectedFilter;
        }
        
        if (selectedTimeframe !== 'all') {
            filter.timeframe = selectedTimeframe;
        }
        
        if (selectedStatus !== 'all') {
            filter.status = selectedStatus;
        }
        
        if (chainId) {
            filter.chainId = chainId;
        }

        applyFilter(filter);
    }, [selectedFilter, selectedTimeframe, selectedStatus, chainId, isClient, applyFilter]);

    // Handle Export Modal animation
    useEffect(() => {
        if (showExportModal) {
            setExportModalActive(true);
        } else if (exportModalActive) {
            exportTimeoutRef.current = setTimeout(() => setExportModalActive(false), 200);
        }
        return () => {
            if (exportTimeoutRef.current) clearTimeout(exportTimeoutRef.current);
        };
    }, [showExportModal]);

    // Handle Import Modal animation
    useEffect(() => {
        if (showImportModal) {
            setImportModalActive(true);
        } else if (importModalActive) {
            importTimeoutRef.current = setTimeout(() => setImportModalActive(false), 200);
        }
        return () => {
            if (importTimeoutRef.current) clearTimeout(importTimeoutRef.current);
        };
    }, [showImportModal]);

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
            case 'withdraw':
                return { icon: 'fas fa-minus', color: '#f59e0b' };
            case 'stake':
                return { icon: 'fas fa-lock', color: '#8b5cf6' };
            case 'unstake':
                return { icon: 'fas fa-unlock', color: '#8b5cf6' };
            case 'liquidation':
                return { icon: 'fas fa-exclamation-triangle', color: '#dc2626' };
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

    const formatTimestamp = (timestamp: number) => {
        const now = Date.now();
        const diff = now - timestamp;
        
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (minutes < 60) {
            return `${minutes} minutes ago`;
        } else if (hours < 24) {
            return `${hours} hours ago`;
        } else if (days < 7) {
            return `${days} days ago`;
        } else {
            return new Date(timestamp).toLocaleDateString();
        }
    };

    const getChainName = (chainId: number) => {
        switch (chainId) {
            case 97: return 'BSC Testnet';
            case 11155111: return 'Sepolia Testnet';
            case 1: return 'Ethereum';
            case 137: return 'Polygon';
            case 42161: return 'Arbitrum';
            case 10: return 'Optimism';
            default: return `Chain ${chainId}`;
        }
    };

    const handleExport = () => {
        const data = exportTransactions();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `linkport-transactions-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setShowExportModal(false);
    };

    const handleImport = async () => {
        try {
            const success = await importTransactions(importData);
            if (success) {
                showToast('Transactions imported successfully!', 'success');
                setImportData('');
                setShowImportModal(false);
            } else {
                showToast('Failed to import transactions. Please check the data format.', 'error');
            }
        } catch (error) {
            showToast('Error importing transactions: ' + error, 'error');
        }
    };

    if (!isClient) {
        return null; // Prevent hydration errors
    }

    return (
        <Layout>
            <div className="container">
                <div className="glass-card" style={{ maxWidth: '900px', margin: '0 auto' }}>
                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '24px'
                    }}>
                        <div>
                            <h2 style={{ 
                                marginBottom: '8px', 
                                fontSize: '28px',
                                fontWeight: 600,
                                color: 'var(--text-color)'
                            }}>
                                Transaction History
                            </h2>
                            {isConnected && address && (
                                <p style={{
                                    color: 'var(--secondary-text)',
                                    fontSize: '14px',
                                    margin: 0
                                }}>
                                    {address.slice(0, 6)}...{address.slice(-4)} • {getChainName(chainId || 97)}
                                </p>
                            )}
                        </div>
                        
                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => setShowExportModal(true)}
                                style={{
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    background: 'white',
                                    color: 'var(--text-color)',
                                    cursor: 'pointer'
                                }}
                            >
                                <i className="fas fa-download" style={{ marginRight: '4px' }}></i>
                                Export
                            </button>
                            
                            <button
                                onClick={() => setShowImportModal(true)}
                                style={{
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    background: 'white',
                                    color: 'var(--text-color)',
                                    cursor: 'pointer'
                                }}
                            >
                                <i className="fas fa-upload" style={{ marginRight: '4px' }}></i>
                                Import
                            </button>
                            
                            <button
                                onClick={createDemoLiquidation}
                                style={{
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid #dc2626',
                                    background: 'rgba(220, 38, 38, 0.1)',
                                    color: '#dc2626',
                                    cursor: 'pointer'
                                }}
                            >
                                <i className="fas fa-exclamation-triangle" style={{ marginRight: '4px' }}></i>
                                Demo Liquidation
                            </button>
                            

                        </div>
                    </div>

                    {!isConnected ? (
                        /* Wallet Not Connected State */
                        <div style={{
                            textAlign: 'center',
                            padding: '60px 40px',
                            background: 'rgba(255, 255, 255, 0.6)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '16px',
                            border: '1px solid var(--border-color)'
                        }}>
                            <div style={{
                                fontSize: '48px',
                                marginBottom: '20px',
                                color: 'var(--secondary-text)'
                            }}>
                                🔗
                            </div>
                            <h3 style={{
                                fontSize: '24px',
                                fontWeight: 600,
                                color: 'var(--text-color)',
                                marginBottom: '12px'
                            }}>
                                Connect Your Wallet
                            </h3>
                            <p style={{
                                color: 'var(--secondary-text)',
                                fontSize: '16px',
                                lineHeight: 1.5
                            }}>
                                Connect your wallet to view your transaction history and track your DeFi activities across multiple networks.
                            </p>
                        </div>
                    ) : isLoading ? (
                        /* Loading State */
                        <div style={{
                            textAlign: 'center',
                            padding: '60px 40px',
                            background: 'rgba(255, 255, 255, 0.6)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '16px',
                            border: '1px solid var(--border-color)'
                        }}>
                            <div style={{
                                fontSize: '48px',
                                marginBottom: '20px',
                                color: 'var(--secondary-text)'
                            }}>
                                ⏳
                            </div>
                            <h3 style={{
                                fontSize: '24px',
                                fontWeight: 600,
                                color: 'var(--text-color)',
                                marginBottom: '12px'
                            }}>
                                Loading Transaction History...
                            </h3>
                            <p style={{
                                color: 'var(--secondary-text)',
                                fontSize: '16px'
                            }}>
                                Fetching your transactions from local storage
                            </p>
                        </div>
                    ) : error ? (
                        /* Error State */
                        <div style={{
                            textAlign: 'center',
                            padding: '60px 40px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '16px',
                            border: '1px solid rgba(239, 68, 68, 0.3)'
                        }}>
                            <div style={{
                                fontSize: '48px',
                                marginBottom: '20px',
                                color: '#ef4444'
                            }}>
                                ⚠️
                            </div>
                            <h3 style={{
                                fontSize: '24px',
                                fontWeight: 600,
                                color: 'var(--text-color)',
                                marginBottom: '12px'
                            }}>
                                Error Loading History
                            </h3>
                            <p style={{
                                color: 'var(--secondary-text)',
                                fontSize: '16px'
                            }}>
                                {error}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Filters */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '16px',
                                marginBottom: '24px'
                            }}>
                                <div>
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
                                         <option value="deposit">Deposit</option>
                                         <option value="withdraw">Withdraw</option>
                                         <option value="borrow">Borrow</option>
                                         <option value="repay">Repay</option>
                                         <option value="bridge">Bridge</option>
                                         <option value="stake">Stake</option>
                                         <option value="unstake">Unstake</option>
                                         <option value="liquidation">Liquidation</option>
                                     </select>
                                </div>
                                
                                <div>
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
                                        <option value="24hours">Last 24 Hours</option>
                                        <option value="7days">Last 7 Days</option>
                                        <option value="30days">Last 30 Days</option>
                                        <option value="all">All Time</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontSize: '14px',
                                        color: 'var(--secondary-text)',
                                        fontWeight: 500
                                    }}>
                                        Status
                                    </label>
                                    <select
                                        value={selectedStatus}
                                        onChange={(e) => setSelectedStatus(e.target.value)}
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
                                        <option value="all">All Statuses</option>
                                        <option value="completed">Completed</option>
                                        <option value="pending">Pending</option>
                                        <option value="failed">Failed</option>
                                    </select>
                                </div>
                            </div>

                            {/* Transaction List */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.6)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: '16px',
                                border: '1px solid var(--border-color)',
                                overflow: 'hidden',
                                marginBottom: '24px'
                            }}>
                                {filteredTransactions.length === 0 ? (
                                    <div style={{
                                        padding: '48px 24px',
                                        textAlign: 'center',
                                        color: 'var(--secondary-text)'
                                    }}>
                                        <i className="fas fa-history" style={{ fontSize: '32px', marginBottom: '16px' }}></i>
                                        <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                                            No Transaction History
                                        </div>
                                        <div>
                                            {stats.totalTransactions === 0 
                                                ? 'Start using LinkPort to see your transaction history here.'
                                                : 'No transactions found for the selected filters.'
                                            }
                                        </div>
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
                                                    <span>{formatTimestamp(transaction.timestamp)}</span>
                                                    {transaction.toChain && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{transaction.fromChain} → {transaction.toChain}</span>
                                                        </>
                                                    )}
                                                    {transaction.txHash && (
                                                        <>
                                                            <span>•</span>
                                                            <span 
                                                                style={{ 
                                                                    color: 'var(--accent-color)', 
                                                                    cursor: 'pointer' 
                                                                }}
                                                                onClick={() => {
                                                                    const explorer = transaction.chainId === 97 
                                                                        ? 'https://testnet.bscscan.com' 
                                                                        : 'https://sepolia.etherscan.io';
                                                                    window.open(`${explorer}/tx/${transaction.txHash}`, '_blank');
                                                                }}
                                                            >
                                                                View Tx
                                                            </span>
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
                                                 color: ['repay', 'withdraw', 'liquidation'].includes(transaction.type) ? '#ef4444' : '#22c55e'
                                             }}>
                                                 {['repay', 'withdraw', 'liquidation'].includes(transaction.type) ? '-' : '+'}{transaction.amount} {transaction.token}
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

                                            {/* Action Menu */}
                                            <div style={{
                                                position: 'relative'
                                            }}>
                                                <button style={{
                                                    padding: '8px',
                                                    border: 'none',
                                                    background: 'transparent',
                                                    color: 'var(--secondary-text)',
                                                    cursor: 'pointer',
                                                    borderRadius: '6px',
                                                    transition: 'all 0.2s ease'
                                                }}>
                                                    <i className="fas fa-ellipsis-v"></i>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Summary Stats */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                gap: '16px'
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
                                        {stats.totalTransactions}
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
                                        {stats.completedTransactions}
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
                                        {stats.pendingTransactions}
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
                                        ${stats.totalVolume.toLocaleString()}
                                    </div>
                                    <div style={{
                                        fontSize: '12px',
                                        color: 'var(--secondary-text)'
                                    }}>
                                        Total Volume
                                    </div>
                                </div>

                                {stats.mostUsedToken !== 'N/A' && (
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
                                            {stats.mostUsedToken}
                                        </div>
                                        <div style={{
                                            fontSize: '12px',
                                            color: 'var(--secondary-text)'
                                        }}>
                                            Most Used Token
                                        </div>
                                    </div>
                                )}

                                {stats.mostUsedChain !== 'N/A' && (
                                    <div style={{
                                        background: 'rgba(255, 255, 255, 0.6)',
                                        backdropFilter: 'blur(10px)',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        textAlign: 'center',
                                        border: '1px solid var(--border-color)'
                                    }}>
                                        <div style={{
                                            fontSize: '16px',
                                            fontWeight: 700,
                                            color: 'var(--text-color)',
                                            marginBottom: '4px'
                                        }}>
                                            {stats.mostUsedChain}
                                        </div>
                                        <div style={{
                                            fontSize: '12px',
                                            color: 'var(--secondary-text)'
                                        }}>
                                            Most Used Chain
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Export Modal */}
                {(showExportModal || exportModalActive) && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(255, 255, 255, 0.25)',
                            backdropFilter: showExportModal ? 'blur(8px)' : 'blur(0px)',
                            WebkitBackdropFilter: showExportModal ? 'blur(8px)' : 'blur(0px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            opacity: showExportModal ? 1 : 0,
                            transition: 'opacity 0.2s ease, backdrop-filter 0.2s, -webkit-backdrop-filter 0.2s',
                        }}
                        onClick={() => setShowExportModal(false)}
                    >
                        <div
                            className="glass-card"
                            style={{
                                maxWidth: '400px',
                                width: '90%',
                                margin: '20px',
                                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)',
                                border: '1.5px solid var(--border-color)',
                                background: 'rgba(255,255,255,0.7)',
                                borderRadius: '20px',
                                position: 'relative',
                                transform: showExportModal ? 'scale(1)' : 'scale(0.96) translateY(20px)',
                                opacity: showExportModal ? 1 : 0,
                                transition: 'opacity 0.2s, transform 0.2s',
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 style={{
                                marginBottom: '16px',
                                fontSize: '20px',
                                fontWeight: 600,
                                color: 'var(--text-color)'
                            }}>
                                Export Transaction History
                            </h3>
                            <p style={{
                                color: 'var(--secondary-text)',
                                marginBottom: '24px',
                                fontSize: '14px',
                                lineHeight: 1.5
                            }}>
                                This will download all your transaction history as a JSON file. You can import this file later to restore your history.
                            </p>
                            <div style={{
                                display: 'flex',
                                gap: '12px',
                                justifyContent: 'flex-end'
                            }}>
                                <button
                                    onClick={() => setShowExportModal(false)}
                                    style={{
                                        padding: '12px 24px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
                                        background: 'rgba(255,255,255,0.85)',
                                        color: 'var(--text-color)',
                                        cursor: 'pointer',
                                        fontWeight: 500
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleExport}
                                    className="button primary"
                                    style={{
                                        padding: '12px 24px',
                                        background: 'var(--accent-color)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Download JSON
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Import Modal */}
                {(showImportModal || importModalActive) && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(255, 255, 255, 0.25)',
                            backdropFilter: showImportModal ? 'blur(8px)' : 'blur(0px)',
                            WebkitBackdropFilter: showImportModal ? 'blur(8px)' : 'blur(0px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            opacity: showImportModal ? 1 : 0,
                            transition: 'opacity 0.2s ease, backdrop-filter 0.2s, -webkit-backdrop-filter 0.2s',
                        }}
                        onClick={() => {
                            setShowImportModal(false);
                            setImportData('');
                        }}
                    >
                        <div
                            className="glass-card"
                            style={{
                                maxWidth: '500px',
                                width: '90%',
                                margin: '20px',
                                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)',
                                border: '1.5px solid var(--border-color)',
                                background: 'rgba(255,255,255,0.7)',
                                borderRadius: '20px',
                                position: 'relative',
                                transform: showImportModal ? 'scale(1)' : 'scale(0.96) translateY(20px)',
                                opacity: showImportModal ? 1 : 0,
                                transition: 'opacity 0.2s, transform 0.2s',
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 style={{
                                marginBottom: '16px',
                                fontSize: '20px',
                                fontWeight: 600,
                                color: 'var(--text-color)'
                            }}>
                                Import Transaction History
                            </h3>
                            <p style={{
                                color: 'var(--secondary-text)',
                                marginBottom: '16px',
                                fontSize: '14px',
                                lineHeight: 1.5
                            }}>
                                Paste the JSON data from a previous export to restore your transaction history.
                            </p>
                            <textarea
                                value={importData}
                                onChange={(e) => setImportData(e.target.value)}
                                placeholder="Paste JSON data here..."
                                style={{
                                    width: '100%',
                                    height: '120px',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    background: 'rgba(255,255,255,0.85)',
                                    fontSize: '14px',
                                    color: 'var(--text-color)',
                                    resize: 'vertical',
                                    marginBottom: '16px'
                                }}
                            />
                            <div style={{
                                display: 'flex',
                                gap: '12px',
                                justifyContent: 'flex-end'
                            }}>
                                <button
                                    onClick={() => {
                                        setShowImportModal(false);
                                        setImportData('');
                                    }}
                                    style={{
                                        padding: '12px 24px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
                                        background: 'rgba(255,255,255,0.85)',
                                        color: 'var(--text-color)',
                                        cursor: 'pointer',
                                        fontWeight: 500
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={!importData.trim()}
                                    className="button primary"
                                    style={{
                                        padding: '12px 24px',
                                        background: 'var(--accent-color)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 600,
                                        cursor: !importData.trim() ? 'not-allowed' : 'pointer',
                                        opacity: !importData.trim() ? 0.5 : 1
                                    }}
                                >
                                    Import Data
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Toast Container for notifications */}
            <ToastContainer />
        </Layout>
    );
};

export default History;