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
                <div style={{ 
                    marginBottom: '24px', 
                    textAlign: 'center'
                }}>
                    <h2 style={{ 
                        fontSize: '28px',
                        fontWeight: 600,
                        color: 'var(--text-color)',
                        marginBottom: '8px'
                    }}>
                        Portfolio Overview
                    </h2>
                    <p style={{ 
                        color: 'var(--secondary-text)',
                        fontSize: '16px'
                    }}>
                        {isConnected 
                            ? `Manage your positions on ${getChainName(chainId || 97)}`
                            : 'Connect your wallet to view your portfolio'
                        }
                    </p>
                </div>

                {!isConnected ? (
                    /* Wallet Not Connected State */
                    <div className="glass-card" style={{ 
                        textAlign: 'center', 
                        padding: '60px 40px',
                        maxWidth: '500px',
                        margin: '0 auto'
                    }}>
                        <div style={{
                            fontSize: '48px',
                            marginBottom: '20px',
                            color: 'var(--secondary-text)'
                        }}>
                            👛
                        </div>
                        <h3 style={{
                            fontSize: '24px',
                            fontWeight: 600,
                            color: 'var(--text-color)',
                            marginBottom: '12px'
                        }}>
                            Wallet Not Connected
                        </h3>
                        <p style={{
                            color: 'var(--secondary-text)',
                            fontSize: '16px',
                            lineHeight: 1.5,
                            marginBottom: '24px'
                        }}>
                            Connect your wallet to view your portfolio, manage positions, and track your liquidity across multiple networks.
                        </p>
                        <button 
                            className="button primary" 
                            style={{
                                padding: '12px 24px',
                                fontSize: '16px'
                            }}
                            onClick={handleConnectWallet}
                        >
                            Connect Wallet
                        </button>
                    </div>
                ) : loading ? (
                    /* Loading State */
                    <div className="glass-card" style={{ 
                        textAlign: 'center', 
                        padding: '60px 40px',
                        maxWidth: '500px',
                        margin: '0 auto'
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
                            Loading Portfolio...
                        </h3>
                        <p style={{
                            color: 'var(--secondary-text)',
                            fontSize: '16px'
                        }}>
                            Fetching your positions and balances from the blockchain
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div className="portfolio-summary">
                            <div className="glass-card" style={{ textAlign: 'center', padding: '16px' }}>
                                <div style={{
                                    fontSize: '13px',
                                    color: 'var(--secondary-text)',
                                    marginBottom: '6px',
                                    fontWeight: 500
                                }}>
                                    Wallet Balance
                                </div>
                                <div style={{
                                    fontSize: '24px',
                                    fontWeight: 700,
                                    color: 'var(--text-color)'
                                }}>
                                    {formatCurrency(portfolioData.totalValue)}
                                </div>
                            </div>
                            
                            <div className="glass-card" style={{ textAlign: 'center', padding: '16px' }}>
                                <div style={{
                                    fontSize: '13px',
                                    color: 'var(--secondary-text)',
                                    marginBottom: '6px',
                                    fontWeight: 500
                                }}>
                                    Liquidity Provided
                                </div>
                                <div style={{
                                    fontSize: '24px',
                                    fontWeight: 700,
                                    color: '#3b82f6'
                                }}>
                                    {formatCurrency(portfolioData.totalLiquidity)}
                                </div>
                            </div>
                            
                            <div className="glass-card" style={{ textAlign: 'center', padding: '16px' }}>
                                <div style={{
                                    fontSize: '13px',
                                    color: 'var(--secondary-text)',
                                    marginBottom: '6px',
                                    fontWeight: 500
                                }}>
                                    Active Positions
                                </div>
                                <div style={{
                                    fontSize: '24px',
                                    fontWeight: 700,
                                    color: '#22c55e'
                                }}>
                                    {portfolioData.positionCount}
                                </div>
                            </div>
                            
                            <div className="glass-card" style={{ textAlign: 'center', padding: '16px' }}>
                                <div style={{
                                    fontSize: '13px',
                                    color: 'var(--secondary-text)',
                                    marginBottom: '6px',
                                    fontWeight: 500
                                }}>
                                    Total Net Worth
                                </div>
                                <div style={{
                                    fontSize: '24px',
                                    fontWeight: 700,
                                    color: portfolioData.netWorth >= 0 ? '#22c55e' : '#ef4444'
                                }}>
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

                        {/* Main Content - New Layout: Liquidity First */}
                        <div className="portfolio-main">
                            {/* Left Column - Primary: Multi-Chain Liquidity Positions */}
                            <div>
                                {/* Multi-Chain Liquidity Positions */}
                                <div className="portfolio-section">
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '20px',
                                        paddingBottom: '12px',
                                        borderBottom: '1px solid var(--border-color)'
                                    }}>
                                        <h3 style={{
                                            margin: 0,
                                            fontSize: '20px',
                                            fontWeight: 700,
                                            color: 'var(--text-color)'
                                        }}>Multi-Chain Liquidity Positions</h3>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '14px'
                                        }}>
                                            🏊‍♂️
                                        </div>
                                    </div>

                                    {positions.length === 0 ? (
                                        <div style={{
                                            textAlign: 'center',
                                            padding: '60px 20px',
                                            background: 'rgba(255, 255, 255, 0.7)',
                                            borderRadius: '16px',
                                            border: '2px dashed rgba(156, 163, 175, 0.5)'
                                        }}>
                                            <div style={{
                                                fontSize: '48px',
                                                marginBottom: '16px',
                                                color: 'var(--secondary-text)'
                                            }}>
                                                🌊
                                            </div>
                                            <h4 style={{
                                                fontSize: '18px',
                                                fontWeight: 600,
                                                color: 'var(--text-color)',
                                                marginBottom: '12px'
                                            }}>
                                                No Active Liquidity Positions
                                            </h4>
                                            <p style={{
                                                color: 'var(--secondary-text)',
                                                fontSize: '16px',
                                                marginBottom: '24px',
                                                maxWidth: '400px',
                                                margin: '0 auto 24px'
                                            }}>
                                                Start providing liquidity across multiple chains to earn fees and rewards from our DeFi protocol
                                            </p>
                                            <button 
                                                className="button primary"
                                                onClick={handleBrowsePools}
                                                style={{
                                                    padding: '12px 24px',
                                                    fontSize: '16px'
                                                }}
                                            >
                                                Explore Pools
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gap: '16px' }}>
                                            {/* Group liquidity positions by chain */}
                                            {[97, 11155111].map(chainIdToShow => {
                                                const chainPositions = positions.filter(pos => 
                                                    pos.chain.includes(chainIdToShow === 97 ? 'BSC' : 'Sepolia')
                                                );
                                                
                                                if (chainPositions.length === 0) return null;
                                                
                                                return (
                                                    <div key={chainIdToShow} style={{
                                                        border: `2px solid ${chainIdToShow === chainId ? 'rgba(59, 130, 246, 0.4)' : 'rgba(156, 163, 175, 0.3)'}`,
                                                        borderRadius: '16px',
                                                        padding: '20px',
                                                        background: chainIdToShow === chainId ? 
                                                            'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(59, 130, 246, 0.03))' : 
                                                            'rgba(255, 255, 255, 0.6)'
                                                    }}>
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            marginBottom: '16px'
                                                        }}>
                                                            <h4 style={{
                                                                margin: 0,
                                                                fontSize: '18px',
                                                                fontWeight: 600,
                                                                color: 'var(--text-color)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '10px'
                                                            }}>
                                                                <span style={{
                                                                    fontSize: '20px'
                                                                }}>
                                                                    {chainIdToShow === 97 ? '🟡' : '🔵'}
                                                                </span>
                                                                {getChainName(chainIdToShow)}
                                                            </h4>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                {chainIdToShow === chainId && (
                                                                    <span style={{
                                                                        padding: '6px 10px',
                                                                        background: 'rgba(34, 197, 94, 0.15)',
                                                                        color: '#22c55e',
                                                                        fontSize: '12px',
                                                                        fontWeight: 600,
                                                                        borderRadius: '8px'
                                                                    }}>
                                                                        Connected
                                                                    </span>
                                                                )}
                                                                <span style={{
                                                                    padding: '6px 10px',
                                                                    background: 'rgba(59, 130, 246, 0.15)',
                                                                    color: '#3b82f6',
                                                                    fontSize: '12px',
                                                                    fontWeight: 600,
                                                                    borderRadius: '8px'
                                                                }}>
                                                                    {chainPositions.length} Position{chainPositions.length > 1 ? 's' : ''}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div style={{ display: 'grid', gap: '12px' }}>
                                                            {chainPositions.map((position, index) => (
                                                                <div key={`${chainIdToShow}-${index}`} style={{
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                    padding: '16px',
                                                                    background: 'rgba(255, 255, 255, 0.8)',
                                                                    borderRadius: '12px',
                                                                    border: '1px solid rgba(59, 130, 246, 0.2)',
                                                                    transition: 'all 0.2s ease',
                                                                    cursor: 'pointer'
                                                                }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                                        <div style={{
                                                                            width: '44px',
                                                                            height: '44px',
                                                                            borderRadius: '12px',
                                                                            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                                                                            color: 'white',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            fontSize: '16px',
                                                                            fontWeight: 600
                                                                        }}>
                                                                            {position.token.slice(0, 2)}
                                                                        </div>
                                                                        <div>
                                                                            <div style={{
                                                                                fontSize: '16px',
                                                                                fontWeight: 600,
                                                                                color: 'var(--text-color)',
                                                                                marginBottom: '4px'
                                                                            }}>
                                                                                {position.token} Liquidity Pool
                                                                            </div>
                                                                            <div style={{
                                                                                fontSize: '13px',
                                                                                color: 'var(--secondary-text)',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: '8px'
                                                                            }}>
                                                                                <span>APY: {position.apy}</span>
                                                                                <span style={{
                                                                                    width: '4px',
                                                                                    height: '4px',
                                                                                    borderRadius: '50%',
                                                                                    background: 'var(--secondary-text)'
                                                                                }}></span>
                                                                                <span style={{
                                                                                    padding: '2px 6px',
                                                                                    background: 'rgba(34, 197, 94, 0.1)',
                                                                                    color: '#22c55e',
                                                                                    borderRadius: '4px',
                                                                                    fontSize: '11px',
                                                                                    fontWeight: 500
                                                                                }}>
                                                                                    Active
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ textAlign: 'right' }}>
                                                                        <div style={{
                                                                            fontSize: '16px',
                                                                            fontWeight: 600,
                                                                            color: 'var(--text-color)',
                                                                            marginBottom: '4px'
                                                                        }}>
                                                                            {parseFloat(position.shares).toFixed(4)} LP
                                                                        </div>
                                                                        <div style={{
                                                                            fontSize: '14px',
                                                                            color: '#22c55e',
                                                                            fontWeight: 500
                                                                        }}>
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
                            <div>
                                {/* Simplified Wallet Balances Summary */}
                                <div className="portfolio-section">
                                    <h3 style={{
                                        marginBottom: '16px',
                                        fontSize: '16px',
                                        fontWeight: 600,
                                        color: 'var(--text-color)'
                                    }}>
                                        Wallet Balance Summary
                                    </h3>
                                    
                                    <div style={{ display: 'grid', gap: '12px' }}>
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
                                                <div key={chainIdToShow} style={{
                                                    padding: '16px',
                                                    background: hasBalance ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 255, 255, 0.7)',
                                                    borderRadius: '12px',
                                                    border: `1px solid ${hasBalance ? 'rgba(34, 197, 94, 0.3)' : 'rgba(156, 163, 175, 0.2)'}`
                                                }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center'
                                                    }}>
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px'
                                                        }}>
                                                            <span style={{ fontSize: '16px' }}>
                                                                {chainIdToShow === 97 ? '🟡' : '🔵'}
                                                            </span>
                                                            <div>
                                                                <div style={{
                                                                    fontSize: '14px',
                                                                    fontWeight: 600,
                                                                    color: 'var(--text-color)'
                                                                }}>
                                                                    {getChainName(chainIdToShow)}
                                                                </div>
                                                                <div style={{
                                                                    fontSize: '12px',
                                                                    color: 'var(--secondary-text)'
                                                                }}>
                                                                    {chainPools.length} assets
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div style={{
                                                            textAlign: 'right'
                                                        }}>
                                                            <div style={{
                                                                fontSize: '16px',
                                                                fontWeight: 600,
                                                                color: hasBalance ? '#22c55e' : 'var(--secondary-text)'
                                                            }}>
                                                                {formatCurrency(chainTotalValue)}
                                                            </div>
                                                            {chainIdToShow === chainId && (
                                                                <div style={{
                                                                    fontSize: '11px',
                                                                    color: '#22c55e',
                                                                    fontWeight: 500
                                                                }}>
                                                                    Current
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div style={{
                                        marginTop: '12px',
                                        padding: '12px',
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        color: 'var(--secondary-text)',
                                        textAlign: 'center'
                                    }}>
                                        💡 These are testnet tokens. Get them from faucets to test the protocol.
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="portfolio-section" style={{ marginTop: '20px' }}>
                                    <h3 style={{
                                        marginBottom: '16px',
                                        fontSize: '16px',
                                        fontWeight: 600,
                                        color: 'var(--text-color)'
                                    }}>
                                        Quick Actions
                                    </h3>
                                    
                                    <div style={{ display: 'grid', gap: '10px' }}>
                                        <button 
                                            className="button primary compact"
                                            onClick={handleDeposit}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                padding: '12px 16px',
                                                fontSize: '14px'
                                            }}
                                        >
                                            💰 Deposit Assets
                                        </button>
                                        
                                        <button 
                                            className="button secondary compact"
                                            onClick={handleBridge}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                padding: '12px 16px',
                                                fontSize: '14px'
                                            }}
                                        >
                                            🌉 Cross-Chain Bridge
                                        </button>
                                        
                                        <button 
                                            className="button primary compact"
                                            onClick={handleAnalytics}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                padding: '12px 16px',
                                                fontSize: '14px'
                                            }}
                                        >
                                            📊 View Analytics
                                        </button>
                                        
                                        <button 
                                            className="button secondary compact"
                                            onClick={handleBrowsePools}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                padding: '12px 16px',
                                                fontSize: '14px'
                                            }}
                                        >
                                            🏊‍♂️ Browse Pools
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
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '20px'
                    }}
                    onClick={() => setIsBridgeModalOpen(false)}
                >
                    <div 
                        style={{
                            background: 'white',
                            borderRadius: '20px',
                            padding: '24px',
                            maxWidth: '450px',
                            textAlign: 'center'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌉</div>
                        <h3 style={{ marginBottom: '12px', color: 'var(--text-color)' }}>Cross-Chain Bridge</h3>
                        <p style={{ marginBottom: '20px', color: 'var(--secondary-text)', lineHeight: 1.5 }}>
                            Transfer your assets between Ethereum Sepolia and BSC Testnet using our secure cross-chain bridge.
                        </p>
                        <div style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            padding: '12px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            fontSize: '14px',
                            color: 'var(--secondary-text)'
                        }}>
                            💡 Bridge transactions typically take 5-10 minutes to complete
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                                onClick={() => setIsBridgeModalOpen(false)}
                                className="button secondary"
                                style={{ flex: 1 }}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => {
                                    setIsBridgeModalOpen(false);
                                    router.push('/?tab=bridge');
                                }}
                                className="button primary"
                                style={{ flex: 1 }}
                            >
                                Open Bridge
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Portfolio;