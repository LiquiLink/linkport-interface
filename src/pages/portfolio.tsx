import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import RiskMonitor from '../components/RiskMonitor';
import { useAccount, useChainId } from 'wagmi';
import { useRouter } from 'next/router';
import { poolList } from '../config';
import { getUserAssetBalance, getBalance } from '../utils/balance';
import { getUserPosition, getPoolTvl } from '../utils/pool';
import { getMultipleAssetPrices, PriceData } from '../utils/priceService';
import { formatUnits } from 'ethers';
import { getTokenIconStyle } from '../utils/ui';
import { useToast } from '../components/Toast';
import DepositModal from '../components/DepositModal';
import AddLiquidityModal from '../components/AddLiquidityModal';
import WithdrawModal from '../components/WithdrawModal';
import AnalyticsModal from '../components/AnalyticsModal';

interface Position {
    token: string;
    amount: string;
    value: number;
    type: 'collateral' | 'liquidity';
    chain: string;
    poolId: string;
    shares: string;
    apy: string;
}

interface PortfolioData {
    totalValue: number;
    totalLiquidity: number;
    netWorth: number;
    positionCount: number;
}

const Portfolio: React.FC = () => {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);
    const [loading, setLoading] = useState(true);
    const [portfolioData, setPortfolioData] = useState<PortfolioData>({
        totalValue: 0,
        totalLiquidity: 0,
        netWorth: 0,
        positionCount: 0
    });
    const [positions, setPositions] = useState<Position[]>([]);
    const [assetPrices, setAssetPrices] = useState<Record<string, PriceData>>({});
    const [balances, setBalances] = useState<{[key: string]: string}>({});
    
    // Risk monitoring data - based on real user data
    const [userBorrowedValue, setUserBorrowedValue] = useState(0); // Real borrowed value
    const [hasActivePositions, setHasActivePositions] = useState(false);

    // Modal states
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [isBridgeModalOpen, setIsBridgeModalOpen] = useState(false);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [isAddLiquidityModalOpen, setIsAddLiquidityModalOpen] = useState(false);
    const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
    
    const { showToast } = useToast();

    // Prevent hydration errors
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Get price data
    useEffect(() => {
        async function loadAssetPrices() {
            if (!isClient) return;
            
            try {
                const symbols = ['ETH', 'LINK', 'USDT', 'BNB'];
                const prices = await getMultipleAssetPrices(symbols, chainId || 97);
                setAssetPrices(prices);
                console.log("✅ Price data loaded successfully:", prices);
            } catch (error) {
                console.error("❌ Failed to get price data:", error);
                // Use conservative fallback prices if price service fails
                setAssetPrices({
                    ETH: { price: 2400, timestamp: Date.now(), decimals: 18, symbol: 'ETH' },
                    LINK: { price: 12, timestamp: Date.now(), decimals: 18, symbol: 'LINK' },
                    USDT: { price: 1, timestamp: Date.now(), decimals: 18, symbol: 'USDT' },
                    BNB: { price: 240, timestamp: Date.now(), decimals: 18, symbol: 'BNB' }
                });
            }
        }
        
        loadAssetPrices();
    }, [isClient, chainId]);

    // Get user balance and position data from ALL chains
    useEffect(() => {
        async function fetchPortfolioData() {
            if (!isClient || !address) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                console.log("🔥 Starting to load Portfolio data from all chains...");
                
                // Get data from ALL chains, not just current chain
                const allPools = poolList; // Include all pools from all chains
                const userPositions: Position[] = [];
                const userBalances: {[key: string]: string} = {};
                let totalValue = 0;
                let totalLiquidity = 0;

                for (const pool of allPools) {
                    try {
                        // Get user balance
                        const balance = await getUserAssetBalance(
                            pool.address, 
                            address, 
                            pool.chainId, 
                            pool.isNative
                        );
                        const formattedBalance = formatUnits(balance, 18);
                        userBalances[pool.id] = formattedBalance;

                        // Get user shares in the pool
                        const shares = await getBalance(pool.pool, address, pool.chainId);
                        const formattedShares = formatUnits(shares, 18);

                        // Get user position value in the pool
                        const userPosition = await getUserPosition(pool, address);
                        const formattedPosition = userPosition ? formatUnits(userPosition, 18) : '0';

                        // Get token price
                        const priceData = assetPrices[pool.name] || { price: 1 };
                        const balanceValue = parseFloat(formattedBalance) * priceData.price;
                        const positionValue = parseFloat(formattedPosition);

                        console.log(`📊 ${pool.name}:`, {
                            balance: formattedBalance,
                            shares: formattedShares,
                            position: formattedPosition,
                            balanceValue,
                            positionValue
                        });

                        // If there's a balance, add to total wallet value
                        if (parseFloat(formattedBalance) > 0) {
                            totalValue += balanceValue;
                        }

                        // If there are pool shares, add to total liquidity
                        if (parseFloat(formattedShares) > 0) {
                            totalLiquidity += positionValue;
                            
                            userPositions.push({
                                token: pool.name,
                                amount: formattedShares,
                                value: positionValue,
                                type: 'liquidity',
                                chain: pool.chainId === 97 ? 'BSC Testnet' : 'Sepolia Testnet',
                                poolId: pool.id,
                                shares: formattedShares,
                                apy: pool.apy
                            });
                        }

                    } catch (error) {
                        console.error(`❌ Failed to get ${pool.name} data:`, error);
                    }
                }

                const newPortfolioData: PortfolioData = {
                    totalValue,
                    totalLiquidity,
                    netWorth: totalValue + totalLiquidity,
                    positionCount: userPositions.length
                };

                setPortfolioData(newPortfolioData);
                setPositions(userPositions);
                setBalances(userBalances);
                
                // Check if there are active positions
                const hasPositions = userPositions.length > 0 || totalValue > 0;
                setHasActivePositions(hasPositions);
                
                // Get user's actual lending data from smart contracts
                // Check if there are lending records in localStorage
                try {
                    const borrowingData = localStorage.getItem(`user_borrowings_${address}`);
                    if (borrowingData) {
                        const parsed = JSON.parse(borrowingData);
                        setUserBorrowedValue(parsed.totalBorrowed || 0);
                    } else {
                        // No lending records, set to 0
                        setUserBorrowedValue(0);
                    }
                } catch (error) {
                    console.error('Failed to load borrowing data:', error);
                    setUserBorrowedValue(0);
                }

                console.log("✅ Portfolio data loaded successfully:", {
                    portfolioData: newPortfolioData,
                    positions: userPositions,
                    balances: userBalances,
                    hasActivePositions: hasPositions,
                    totalCollateralValue: totalValue + totalLiquidity
                });

            } catch (error) {
                console.error("❌ Failed to load Portfolio data:", error);
            } finally {
                setLoading(false);
            }
        }

        // Only start fetching Portfolio data when price data is loaded
        if (Object.keys(assetPrices).length > 0) {
            fetchPortfolioData();
        }
    }, [isClient, address, chainId, assetPrices]);

    const formatCurrency = (value: number) => {
        return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const getChainName = (chainId: number) => {
        switch (chainId) {
            case 97: return 'BSC Testnet';
            case 11155111: return 'Sepolia Testnet';
            default: return 'Unknown Network';
        }
    };

    // Modal and navigation functions for buttons
    const handleAddLiquidity = () => {
        setIsAddLiquidityModalOpen(true);
    };

    const handleWithdraw = () => {
        setIsWithdrawModalOpen(true);
    };

    const handleDeposit = () => {
        setIsDepositModalOpen(true);
    };

    const handleBridge = () => {
        setIsBridgeModalOpen(true);
    };

    const handleAnalytics = () => {
        setIsAnalyticsModalOpen(true);
    };

    const handleBrowsePools = () => {
        router.push('/pools');
    };

    const handleConnectWallet = () => {
        router.push('/');
    };

    // Modal success handlers
    const handleDepositSuccess = () => {
        // Refresh portfolio data after successful deposit
        if (Object.keys(assetPrices).length > 0) {
            // Trigger portfolio data refresh by re-running the effect
            setLoading(true);
        }
        showToast('Portfolio refreshed after successful deposit', 'success');
    };

    const handleBridgeSuccess = () => {
        // Refresh portfolio data after successful bridge
        if (Object.keys(assetPrices).length > 0) {
            setLoading(true);
        }
        showToast('Portfolio refreshed after successful bridge', 'success');
    };

    const handleWithdrawSuccess = () => {
        // Refresh portfolio data after successful withdrawal
        if (Object.keys(assetPrices).length > 0) {
            setLoading(true);
        }
        showToast('Portfolio refreshed after successful withdrawal', 'success');
    };

    const handleAddLiquiditySuccess = () => {
        // Refresh portfolio data after adding liquidity
        if (Object.keys(assetPrices).length > 0) {
            setLoading(true);
        }
        showToast('Portfolio refreshed after adding liquidity', 'success');
    };

    if (!isClient) {
        return null; // Prevent hydration errors
    }

    return (
        <Layout>
            <div className="container">
                {/* Portfolio Header */}
                <div className="portfolio-header">
                    <h2 className="portfolio-title">
                        Portfolio Overview
                    </h2>
                    <p className="portfolio-subtitle">
                        {isConnected 
                            ? `Manage your positions on ${getChainName(chainId || 97)}`
                            : 'Connect your wallet to view your portfolio'
                        }
                    </p>
                </div>

                {!isConnected ? (
                    /* Wallet Not Connected State */
                    <div className="glass-card portfolio-empty-state">
                        <div className="empty-state-icon">👛</div>
                        <h3 className="empty-state-title">
                            Wallet Not Connected
                        </h3>
                        <p className="empty-state-description">
                            Connect your wallet to view your portfolio, manage positions, and track your liquidity across multiple networks.
                        </p>
                        <button 
                            className="button button-primary"
                            onClick={handleConnectWallet}
                        >
                            Connect Wallet
                        </button>
                    </div>
                ) : loading ? (
                    /* Loading State */
                    <div className="glass-card portfolio-empty-state">
                        <div className="empty-state-icon">⏳</div>
                        <h3 className="empty-state-title">
                            Loading Portfolio...
                        </h3>
                        <p className="empty-state-description">
                            Fetching your positions and balances from the blockchain
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div className="portfolio-summary">
                            <div className="glass-card summary-card">
                                <div className="summary-label">
                                    Wallet Balance
                                </div>
                                <div className="summary-value">
                                    {formatCurrency(portfolioData.totalValue)}
                                </div>
                            </div>
                            
                            <div className="glass-card summary-card">
                                <div className="summary-label">
                                    Liquidity Provided
                                </div>
                                <div className="summary-value summary-value-blue">
                                    {formatCurrency(portfolioData.totalLiquidity)}
                                </div>
                            </div>
                            
                            <div className="glass-card summary-card">
                                <div className="summary-label">
                                    Active Positions
                                </div>
                                <div className="summary-value summary-value-green">
                                    {portfolioData.positionCount}
                                </div>
                            </div>
                            
                            <div className="glass-card summary-card">
                                <div className="summary-label">
                                    Total Net Worth
                                </div>
                                <div className={`summary-value ${portfolioData.netWorth >= 0 ? 'summary-value-green' : 'summary-value-red'}`}>
                                    {formatCurrency(portfolioData.netWorth)}
                                </div>
                            </div>
                        </div>

                        {/* Risk Monitor - Only show if user has borrowings */}
                        {hasActivePositions && userBorrowedValue > 0 && (
                            <RiskMonitor 
                                collateralValue={portfolioData.netWorth}
                                borrowedValue={userBorrowedValue}
                            />
                        )}

                        {/* Main Content - Responsive Layout */}
                        <div className="portfolio-main">
                            {/* Left Column - Primary: Multi-Chain Liquidity Positions */}
                            <div className="portfolio-main-left">
                                {/* Multi-Chain Liquidity Positions */}
                                <div className="portfolio-section">
                                    <div className="section-header">
                                        <h3 className="section-title">Multi-Chain Liquidity Positions</h3>
                                        <div className="section-icon">
                                            🏊‍♂️
                                        </div>
                                    </div>

                                    {positions.length === 0 ? (
                                        <div className="glass-card empty-positions">
                                            <div className="empty-positions-icon">🌊</div>
                                            <h4 className="empty-positions-title">
                                                No Active Liquidity Positions
                                            </h4>
                                            <p className="empty-positions-description">
                                                Start providing liquidity across multiple chains to earn fees and rewards from our DeFi protocol
                                            </p>
                                            <button 
                                                className="button button-primary"
                                                onClick={handleBrowsePools}
                                            >
                                                Explore Pools
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="positions-grid">
                                            {/* Group liquidity positions by chain */}
                                            {[97, 11155111].map(chainIdToShow => {
                                                const chainPositions = positions.filter(pos => 
                                                    pos.chain.includes(chainIdToShow === 97 ? 'BSC' : 'Sepolia')
                                                );
                                                
                                                if (chainPositions.length === 0) return null;
                                                
                                                return (
                                                    <div key={chainIdToShow} className={`chain-group ${chainIdToShow === chainId ? 'chain-group-active' : ''}`}>
                                                        <div className="chain-header">
                                                            <h4 className="chain-title">
                                                                <span className="chain-icon">
                                                                    {chainIdToShow === 97 ? '🟡' : '🔵'}
                                                                </span>
                                                                {getChainName(chainIdToShow)}
                                                            </h4>
                                                            <div className="chain-badges">
                                                                {chainIdToShow === chainId && (
                                                                    <span className="badge badge-success">
                                                                        Connected
                                                                    </span>
                                                                )}
                                                                <span className="badge badge-primary">
                                                                    {chainPositions.length} Position{chainPositions.length > 1 ? 's' : ''}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="positions-list">
                                                            {chainPositions.map((position, index) => (
                                                                <div key={`${chainIdToShow}-${index}`} className="position-card">
                                                                    <div className="position-info">
                                                                        <div className="position-icon">
                                                                            {position.token.slice(0, 2)}
                                                                        </div>
                                                                        <div className="position-details">
                                                                            <div className="position-name">
                                                                                {position.token} Liquidity Pool
                                                                            </div>
                                                                            <div className="position-meta">
                                                                                <span>APY: {position.apy}</span>
                                                                                <span className="meta-separator"></span>
                                                                                <span className="status-badge status-active">
                                                                                    Active
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="position-values">
                                                                        <div className="position-shares">
                                                                            {parseFloat(position.shares).toFixed(4)} LP
                                                                        </div>
                                                                        <div className="position-value">
                                                                            {formatCurrency(position.value)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column - Secondary: Simplified Overview */}
                            <div className="portfolio-main-right">
                                {/* Simplified Wallet Balances Summary */}
                                <div className="portfolio-section">
                                    <h3 className="section-title">
                                        Wallet Balance Summary
                                    </h3>
                                    
                                    <div className="balance-summary">
                                        {[97, 11155111].map(chainIdToShow => {
                                            const chainPools = poolList.filter(pool => pool.chainId === chainIdToShow);
                                            const chainTotalValue = chainPools.reduce((total, pool) => {
                                                const balance = balances[pool.id] || '0';
                                                const balanceNum = parseFloat(balance);
                                                const priceData = assetPrices[pool.name] || { price: 1 };
                                                return total + (balanceNum * priceData.price);
                                            }, 0);
                                            const hasBalance = chainTotalValue > 0;
                                            
                                            return (
                                                <div key={chainIdToShow} className={`balance-card ${hasBalance ? 'balance-card-active' : ''}`}>
                                                    <div className="balance-content">
                                                        <div className="balance-info">
                                                            <span className="chain-icon">
                                                                {chainIdToShow === 97 ? '🟡' : '🔵'}
                                                            </span>
                                                            <div>
                                                                <div className="balance-chain">
                                                                    {getChainName(chainIdToShow)}
                                                                </div>
                                                                <div className="balance-assets">
                                                                    {chainPools.length} assets
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="balance-values">
                                                            <div className={`balance-amount ${hasBalance ? 'balance-amount-active' : ''}`}>
                                                                {formatCurrency(chainTotalValue)}
                                                            </div>
                                                            {chainIdToShow === chainId && (
                                                                <div className="balance-current">
                                                                    Current
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="info-note">
                                        💡 These are testnet tokens. Get them from faucets to test the protocol.
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="portfolio-section">
                                    <h3 className="section-title">
                                        Quick Actions
                                    </h3>
                                    
                                    <div className="quick-actions">
                                        <button 
                                            className="button button-primary button-full"
                                            onClick={handleDeposit}
                                        >
                                            Deposit Assets
                                        </button>
                                        
                                        <button 
                                            className="button button-secondary button-full"
                                            onClick={handleBridge}
                                        >
                                            Cross-Chain Bridge
                                        </button>
                                        
                                        <button 
                                            className="button button-primary button-full"
                                            onClick={handleAnalytics}
                                        >
                                            View Analytics
                                        </button>
                                        
                                        <button 
                                            className="button button-secondary button-full"
                                            onClick={handleBrowsePools}
                                        >
                                            Browse Pools
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Modals */}
            <DepositModal
                isOpen={isDepositModalOpen}
                onClose={() => setIsDepositModalOpen(false)}
                onSuccess={handleDepositSuccess}
            />

            <AddLiquidityModal
                isOpen={isAddLiquidityModalOpen}
                onClose={() => setIsAddLiquidityModalOpen(false)}
                onSuccess={handleAddLiquiditySuccess}
            />

            <WithdrawModal
                isOpen={isWithdrawModalOpen}
                onClose={() => setIsWithdrawModalOpen(false)}
                onSuccess={handleWithdrawSuccess}
                userPositions={positions}
            />

            <AnalyticsModal
                isOpen={isAnalyticsModalOpen}
                onClose={() => setIsAnalyticsModalOpen(false)}
                portfolioData={portfolioData}
                userPositions={positions}
                assetPrices={assetPrices}
            />
            
            {/* Bridge Modal - Quick Bridge to main interface */}
            {isBridgeModalOpen && (
                <div 
                    className="modal-overlay"
                    onClick={() => setIsBridgeModalOpen(false)}
                >
                    <div 
                        className="glass-card bridge-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bridge-modal-icon">🌉</div>
                        <h3 className="bridge-modal-title">Cross-Chain Bridge</h3>
                        <p className="bridge-modal-description">
                            Transfer your assets between Ethereum Sepolia and BSC Testnet using our secure cross-chain bridge.
                        </p>
                        <div className="bridge-modal-info">
                            💡 Bridge transactions typically take 5-10 minutes to complete
                        </div>
                        <div className="bridge-modal-actions">
                            <button 
                                onClick={() => setIsBridgeModalOpen(false)}
                                className="button button-secondary"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => {
                                    setIsBridgeModalOpen(false);
                                    router.push('/?tab=bridge');
                                }}
                                className="button button-primary"
                            >
                                Open Bridge
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Portfolio Styles */}
            <style jsx>{`
                .portfolio-header {
                    margin-bottom: var(--space-lg);
                    text-align: center;
                }

                .portfolio-title {
                    font-size: 28px;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: var(--space-sm);
                }

                .portfolio-subtitle {
                    color: var(--text-secondary);
                    font-size: 16px;
                }

                .portfolio-empty-state {
                    text-align: center;
                    padding: var(--space-2xl) var(--space-xl);
                    max-width: 500px;
                    margin: 0 auto;
                }

                .empty-state-icon {
                    font-size: 48px;
                    margin-bottom: var(--space-lg);
                    color: var(--text-secondary);
                }

                .empty-state-title {
                    font-size: 24px;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: var(--space-md);
                }

                .empty-state-description {
                    color: var(--text-secondary);
                    font-size: 16px;
                    line-height: 1.5;
                    margin-bottom: var(--space-lg);
                }

                .portfolio-summary {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: var(--space-md);
                    margin-bottom: var(--space-lg);
                }

                .summary-card {
                    text-align: center;
                    padding: var(--space-md);
                }

                .summary-label {
                    font-size: 13px;
                    color: var(--text-secondary);
                    margin-bottom: var(--space-xs);
                    font-weight: 500;
                }

                .summary-value {
                    font-size: 24px;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .summary-value-blue {
                    color: var(--accent-secondary);
                }

                .summary-value-green {
                    color: var(--success);
                }

                .summary-value-red {
                    color: var(--danger);
                }

                .portfolio-main {
                    display: grid;
                    grid-template-columns: 1fr 320px;
                    gap: var(--space-lg);
                }

                .portfolio-section {
                    margin-bottom: var(--space-lg);
                }

                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--space-lg);
                    padding-bottom: var(--space-md);
                    border-bottom: 1px solid var(--border-glass);
                }

                .section-title {
                    margin: 0;
                    font-size: 20px;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .section-icon {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: var(--accent-gradient);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                }

                .empty-positions {
                    text-align: center;
                    padding: var(--space-2xl) var(--space-lg);
                    border: 2px dashed var(--border-glass);
                }

                .empty-positions-icon {
                    font-size: 48px;
                    margin-bottom: var(--space-md);
                    color: var(--text-secondary);
                }

                .empty-positions-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: var(--space-md);
                }

                .empty-positions-description {
                    color: var(--text-secondary);
                    font-size: 16px;
                    margin-bottom: var(--space-lg);
                    max-width: 400px;
                    margin: 0 auto var(--space-lg);
                }

                .positions-grid {
                    display: grid;
                    gap: var(--space-md);
                }

                .chain-group {
                    border: 2px solid var(--border-glass);
                    border-radius: var(--radius-lg);
                    padding: var(--space-lg);
                    background: var(--bg-card);
                    transition: all var(--transition-normal);
                }

                .chain-group-active {
                    border-color: var(--accent-primary);
                    background: linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(6, 182, 212, 0.03));
                }

                .chain-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: var(--space-md);
                }

                .chain-title {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                    color: var(--text-primary);
                    display: flex;
                    align-items: center;
                    gap: var(--space-sm);
                }

                .chain-icon {
                    font-size: 20px;
                }

                .chain-badges {
                    display: flex;
                    align-items: center;
                    gap: var(--space-sm);
                }

                .badge {
                    padding: 6px var(--space-sm);
                    font-size: 12px;
                    font-weight: 600;
                    border-radius: var(--radius-md);
                }

                .badge-success {
                    background: var(--success-bg);
                    color: var(--success);
                }

                .badge-primary {
                    background: rgba(59, 130, 246, 0.15);
                    color: var(--accent-secondary);
                }

                .positions-list {
                    display: grid;
                    gap: var(--space-md);
                }

                .position-card {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--space-md);
                    background: var(--bg-card-hover);
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-glass);
                    transition: all var(--transition-normal);
                    cursor: pointer;
                }

                .position-card:hover {
                    transform: translateY(-2px);
                    border-color: var(--accent-primary);
                    box-shadow: 0 4px 16px rgba(6, 182, 212, 0.2);
                }

                .position-info {
                    display: flex;
                    align-items: center;
                    gap: var(--space-md);
                }

                .position-icon {
                    width: 44px;
                    height: 44px;
                    border-radius: var(--radius-md);
                    background: var(--accent-gradient);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    font-weight: 600;
                }

                .position-name {
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: var(--space-xs);
                }

                .position-meta {
                    font-size: 13px;
                    color: var(--text-secondary);
                    display: flex;
                    align-items: center;
                    gap: var(--space-sm);
                }

                .meta-separator {
                    width: 4px;
                    height: 4px;
                    border-radius: 50%;
                    background: var(--text-secondary);
                }

                .status-badge {
                    padding: 2px 6px;
                    border-radius: var(--radius-sm);
                    font-size: 11px;
                    font-weight: 500;
                }

                .status-active {
                    background: var(--success-bg);
                    color: var(--success);
                }

                .position-values {
                    text-align: right;
                }

                .position-shares {
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: var(--space-xs);
                }

                .position-value {
                    font-size: 14px;
                    color: var(--success);
                    font-weight: 500;
                }

                .balance-summary {
                    display: grid;
                    gap: var(--space-md);
                }

                .balance-card {
                    padding: var(--space-md);
                    background: var(--bg-card);
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-glass);
                    transition: all var(--transition-normal);
                }

                .balance-card-active {
                    background: var(--success-bg);
                    border-color: var(--success);
                }

                .balance-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .balance-info {
                    display: flex;
                    align-items: center;
                    gap: var(--space-sm);
                }

                .balance-chain {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .balance-assets {
                    font-size: 12px;
                    color: var(--text-secondary);
                }

                .balance-amount {
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--text-secondary);
                }

                .balance-amount-active {
                    color: var(--success);
                }

                .balance-current {
                    font-size: 11px;
                    color: var(--success);
                    font-weight: 500;
                }

                .info-note {
                    margin-top: var(--space-md);
                    padding: var(--space-md);
                    background: rgba(59, 130, 246, 0.1);
                    border-radius: var(--radius-md);
                    font-size: 12px;
                    color: var(--text-secondary);
                    text-align: center;
                }

                .quick-actions {
                    display: grid;
                    gap: var(--space-sm);
                }

                .bridge-modal {
                    max-width: 450px;
                    text-align: center;
                    padding: var(--space-lg);
                }

                .bridge-modal-icon {
                    font-size: 48px;
                    margin-bottom: var(--space-md);
                }

                .bridge-modal-title {
                    margin-bottom: var(--space-md);
                    color: var(--text-primary);
                    font-size: 20px;
                    font-weight: 600;
                }

                .bridge-modal-description {
                    margin-bottom: var(--space-lg);
                    color: var(--text-secondary);
                    line-height: 1.5;
                }

                .bridge-modal-info {
                    background: rgba(59, 130, 246, 0.1);
                    padding: var(--space-md);
                    border-radius: var(--radius-md);
                    margin-bottom: var(--space-lg);
                    font-size: 14px;
                    color: var(--text-secondary);
                }

                .bridge-modal-actions {
                    display: flex;
                    gap: var(--space-md);
                }

                /* Responsive Design */
                @media (max-width: 1024px) {
                    .portfolio-main {
                        grid-template-columns: 1fr;
                        gap: var(--space-md);
                    }
                }

                @media (max-width: 768px) {
                    .portfolio-summary {
                        grid-template-columns: repeat(2, 1fr);
                        gap: var(--space-sm);
                    }

                    .summary-card {
                        padding: var(--space-sm);
                    }

                    .summary-value {
                        font-size: 20px;
                    }

                    .portfolio-title {
                        font-size: 24px;
                    }

                    .section-title {
                        font-size: 18px;
                    }

                    .chain-group {
                        padding: var(--space-md);
                    }

                    .position-card {
                        padding: var(--space-sm);
                    }

                    .position-info {
                        gap: var(--space-sm);
                    }

                    .position-icon {
                        width: 36px;
                        height: 36px;
                        font-size: 14px;
                    }

                    .bridge-modal-actions {
                        flex-direction: column;
                    }
                }

                @media (max-width: 480px) {
                    .portfolio-summary {
                        grid-template-columns: 1fr;
                    }

                    .portfolio-empty-state {
                        padding: var(--space-lg) var(--space-md);
                    }

                    .empty-state-icon {
                        font-size: 40px;
                    }

                    .empty-state-title {
                        font-size: 20px;
                    }

                    .chain-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: var(--space-sm);
                    }

                    .chain-badges {
                        align-self: flex-end;
                    }

                    .position-card {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: var(--space-sm);
                    }

                    .position-values {
                        text-align: left;
                        width: 100%;
                    }
                }
            `}</style>
        </Layout>
    );
};

export default Portfolio;