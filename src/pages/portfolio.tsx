import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAccount, useChainId } from 'wagmi';
import { poolList } from '../config';
import { getUserAssetBalance, getBalance } from '../utils/balance';
import { getUserPosition, getPoolTvl } from '../utils/pool';
import { getMultipleAssetPrices, PriceData } from '../utils/priceService';
import { formatUnits } from 'ethers';

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

    // 防止hydration错误
    useEffect(() => {
        setIsClient(true);
    }, []);

    // 获取价格数据
    useEffect(() => {
        async function loadAssetPrices() {
            if (!isClient) return;
            
            try {
                const symbols = ['ETH', 'LINK', 'USDT', 'BNB'];
                const prices = await getMultipleAssetPrices(symbols, chainId || 97);
                setAssetPrices(prices);
                console.log("✅ 价格数据加载完成:", prices);
            } catch (error) {
                console.error("❌ 获取价格数据失败:", error);
                // 使用默认价格作为后备
                setAssetPrices({
                    ETH: { price: 3000, timestamp: Date.now(), decimals: 18, symbol: 'ETH' },
                    LINK: { price: 15, timestamp: Date.now(), decimals: 18, symbol: 'LINK' },
                    USDT: { price: 1, timestamp: Date.now(), decimals: 18, symbol: 'USDT' },
                    BNB: { price: 500, timestamp: Date.now(), decimals: 18, symbol: 'BNB' }
                });
            }
        }
        
        loadAssetPrices();
    }, [isClient, chainId]);

    // 获取用户余额和持仓数据
    useEffect(() => {
        async function fetchPortfolioData() {
            if (!isClient || !address || !chainId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                console.log("🔥 开始加载Portfolio数据...");
                
                const currentChainPools = poolList.filter(pool => pool.chainId === chainId);
                const userPositions: Position[] = [];
                const userBalances: {[key: string]: string} = {};
                let totalValue = 0;
                let totalLiquidity = 0;

                for (const pool of currentChainPools) {
                    try {
                        // 获取用户余额
                        const balance = await getUserAssetBalance(
                            pool.address, 
                            address, 
                            pool.chainId, 
                            pool.isNative
                        );
                        const formattedBalance = formatUnits(balance, 18);
                        userBalances[pool.id] = formattedBalance;

                        // 获取用户在池子中的份额
                        const shares = await getBalance(pool.pool, address, pool.chainId);
                        const formattedShares = formatUnits(shares, 18);

                        // 获取用户在池子中的价值
                        const userPosition = await getUserPosition(pool, address);
                        const formattedPosition = userPosition ? formatUnits(userPosition, 18) : '0';

                        // 获取代币价格
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

                        // 如果有余额，添加到钱包余额总值
                        if (parseFloat(formattedBalance) > 0) {
                            totalValue += balanceValue;
                        }

                        // 如果有池子份额，添加到流动性总值
                        if (parseFloat(formattedShares) > 0) {
                            totalLiquidity += positionValue;
                            
                            userPositions.push({
                                token: pool.name,
                                amount: formattedShares,
                                value: positionValue,
                                type: 'liquidity',
                                chain: chainId === 97 ? 'BSC Testnet' : 'Sepolia Testnet',
                                poolId: pool.id,
                                shares: formattedShares,
                                apy: pool.apy
                            });
                        }

                    } catch (error) {
                        console.error(`❌ 获取 ${pool.name} 数据失败:`, error);
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

                console.log("✅ Portfolio数据加载完成:", {
                    portfolioData: newPortfolioData,
                    positions: userPositions,
                    balances: userBalances
                });

            } catch (error) {
                console.error("❌ 加载Portfolio数据失败:", error);
            } finally {
                setLoading(false);
            }
        }

        // 只有当价格数据加载完成后才开始获取Portfolio数据
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

    if (!isClient) {
        return null; // 防止hydration错误
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
                        <button className="button primary" style={{
                            padding: '12px 24px',
                            fontSize: '16px'
                        }}>
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

                        {/* Main Content - Two Column Layout */}
                        <div className="portfolio-main">
                            {/* Left Column */}
                            <div>
                                {/* Wallet Balances Section */}
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
                                            fontSize: '18px',
                                            fontWeight: 600,
                                            color: 'var(--text-color)'
                                        }}>Wallet Balances</h3>
                                        <div style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            background: 'var(--accent-color)',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '12px'
                                        }}>
                                            💰
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gap: '12px' }}>
                                        {poolList
                                            .filter(pool => pool.chainId === chainId)
                                            .map((pool) => {
                                                const balance = balances[pool.id] || '0';
                                                const balanceNum = parseFloat(balance);
                                                const priceData = assetPrices[pool.name] || { price: 1 };
                                                const value = balanceNum * priceData.price;

                                                return (
                                                    <div key={pool.id} style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '14px',
                                                        background: 'rgba(255, 255, 255, 0.7)',
                                                        borderRadius: '12px',
                                                        border: `2px solid ${balanceNum > 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(156, 163, 175, 0.3)'}`
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <div className="token-icon placeholder" style={{
                                                                background: pool.isNative ? '#f59e0b' : '#3b82f6'
                                                            }}>
                                                                {pool.name}
                                                            </div>
                                                            <div>
                                                                <div style={{
                                                                    fontSize: '15px',
                                                                    fontWeight: 600,
                                                                    color: 'var(--text-color)'
                                                                }}>
                                                                    {pool.name}
                                                                </div>
                                                                <div style={{
                                                                    fontSize: '11px',
                                                                    color: 'var(--secondary-text)'
                                                                }}>
                                                                    {getChainName(pool.chainId)} {pool.isNative && '(Native)'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{
                                                                fontSize: '15px',
                                                                fontWeight: 600,
                                                                color: 'var(--text-color)'
                                                            }}>
                                                                {parseFloat(balance).toFixed(6)} {pool.name}
                                                            </div>
                                                            <div style={{
                                                                fontSize: '13px',
                                                                color: 'var(--secondary-text)'
                                                            }}>
                                                                {formatCurrency(value)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        }
                                    </div>

                                    {chainId && (
                                        <div style={{
                                            marginTop: '16px',
                                            padding: '12px',
                                            background: 'rgba(59, 130, 246, 0.1)',
                                            borderRadius: '12px',
                                            fontSize: '14px',
                                            color: 'var(--secondary-text)',
                                            textAlign: 'center'
                                        }}>
                                            💡 These are test tokens on {getChainName(chainId)}. 
                                            <br />Get test tokens from faucets to interact with the protocol.
                                        </div>
                                    )}
                                </div>

                                {/* Network Info */}
                                <div className="portfolio-section" style={{ marginTop: '20px' }}>
                                    <h3 style={{
                                        marginBottom: '16px',
                                        fontSize: '18px',
                                        fontWeight: 600,
                                        color: 'var(--text-color)'
                                    }}>
                                        Network Information
                                    </h3>
                                    
                                    <div style={{
                                        background: 'rgba(255, 255, 255, 0.7)',
                                        borderRadius: '12px',
                                        padding: '16px'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '8px'
                                        }}>
                                            <span style={{ color: 'var(--secondary-text)', fontSize: '14px' }}>Current Network</span>
                                            <span style={{ 
                                                fontWeight: 600, 
                                                color: 'var(--text-color)',
                                                fontSize: '16px'
                                            }}>
                                                {getChainName(chainId || 97)}
                                            </span>
                                        </div>
                                        
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '8px'
                                        }}>
                                            <span style={{ color: 'var(--secondary-text)', fontSize: '14px' }}>Chain ID</span>
                                            <span style={{ 
                                                fontWeight: 600, 
                                                color: 'var(--text-color)',
                                                fontSize: '16px'
                                            }}>
                                                {chainId || 97}
                                            </span>
                                        </div>

                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <span style={{ color: 'var(--secondary-text)', fontSize: '14px' }}>Status</span>
                                            <span style={{ 
                                                fontWeight: 600, 
                                                color: '#22c55e',
                                                fontSize: '16px'
                                            }}>
                                                Connected
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div>
                                {/* Liquidity Positions */}
                                <div className="portfolio-section">
                                    <h3 style={{
                                        marginBottom: '20px',
                                        fontSize: '18px',
                                        fontWeight: 600,
                                        color: 'var(--text-color)'
                                    }}>
                                        Liquidity Positions
                                    </h3>
                                    
                                    {positions.length === 0 ? (
                                        <div style={{
                                            textAlign: 'center',
                                            padding: '40px 20px',
                                            background: 'rgba(255, 255, 255, 0.7)',
                                            borderRadius: '12px',
                                            border: '2px dashed rgba(156, 163, 175, 0.5)'
                                        }}>
                                            <div style={{
                                                fontSize: '32px',
                                                marginBottom: '12px',
                                                color: 'var(--secondary-text)'
                                            }}>
                                                🏊‍♂️
                                            </div>
                                            <h4 style={{
                                                fontSize: '16px',
                                                fontWeight: 600,
                                                color: 'var(--text-color)',
                                                marginBottom: '8px'
                                            }}>
                                                No Liquidity Positions
                                            </h4>
                                            <p style={{
                                                color: 'var(--secondary-text)',
                                                fontSize: '14px',
                                                marginBottom: '16px'
                                            }}>
                                                Provide liquidity to pools to start earning rewards
                                            </p>
                                            <button className="button primary compact">
                                                Browse Pools
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gap: '12px' }}>
                                            {positions.map((position, index) => (
                                                <div key={index} style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '14px',
                                                    background: 'rgba(255, 255, 255, 0.7)',
                                                    borderRadius: '12px',
                                                    border: '2px solid rgba(59, 130, 246, 0.3)'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div className="token-icon placeholder">{position.token}</div>
                                                        <div>
                                                            <div style={{
                                                                fontSize: '15px',
                                                                fontWeight: 600,
                                                                color: 'var(--text-color)'
                                                            }}>
                                                                {position.token} Pool
                                                            </div>
                                                            <div style={{
                                                                fontSize: '11px',
                                                                color: 'var(--secondary-text)'
                                                            }}>
                                                                {position.chain} • APY: {position.apy}
                                                            </div>
                                                        </div>
                                                        <div style={{
                                                            padding: '3px 6px',
                                                            borderRadius: '6px',
                                                            fontSize: '11px',
                                                            fontWeight: 500,
                                                            background: 'rgba(59, 130, 246, 0.15)',
                                                            color: '#3b82f6'
                                                        }}>
                                                            Liquidity
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{
                                                            fontSize: '15px',
                                                            fontWeight: 600,
                                                            color: 'var(--text-color)'
                                                        }}>
                                                            {parseFloat(position.shares).toFixed(6)} LP
                                                        </div>
                                                        <div style={{
                                                            fontSize: '13px',
                                                            color: 'var(--secondary-text)'
                                                        }}>
                                                            {formatCurrency(position.value)}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    
                                    <div style={{
                                        display: 'flex',
                                        gap: '8px',
                                        marginTop: '16px'
                                    }}>
                                        <button className="button primary compact" style={{ flex: 1 }}>
                                            Add Liquidity
                                        </button>
                                        <button className="button secondary compact" style={{ flex: 1 }}>
                                            Withdraw
                                        </button>
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="portfolio-section" style={{ marginTop: '20px' }}>
                                    <h3 style={{
                                        marginBottom: '16px',
                                        fontSize: '18px',
                                        fontWeight: 600,
                                        color: 'var(--text-color)'
                                    }}>
                                        Quick Actions
                                    </h3>
                                    
                                    <div className="quick-actions-grid">
                                        <button className="action-card" style={{
                                            background: 'rgba(59, 130, 246, 0.1)',
                                            border: '2px solid rgba(59, 130, 246, 0.3)',
                                            color: '#3b82f6'
                                        }}>
                                            <i className="fas fa-plus-circle" style={{ fontSize: '20px', marginBottom: '8px' }}></i>
                                            <span style={{ fontSize: '14px', fontWeight: 500 }}>Deposit</span>
                                        </button>
                                        
                                        <button className="action-card" style={{
                                            background: 'rgba(34, 197, 94, 0.1)',
                                            border: '2px solid rgba(34, 197, 94, 0.3)',
                                            color: '#22c55e'
                                        }}>
                                            <i className="fas fa-minus-circle" style={{ fontSize: '20px', marginBottom: '8px' }}></i>
                                            <span style={{ fontSize: '14px', fontWeight: 500 }}>Withdraw</span>
                                        </button>
                                        
                                        <button className="action-card" style={{
                                            background: 'rgba(245, 158, 11, 0.1)',
                                            border: '2px solid rgba(245, 158, 11, 0.3)',
                                            color: '#f59e0b'
                                        }}>
                                            <i className="fas fa-exchange-alt" style={{ fontSize: '20px', marginBottom: '8px' }}></i>
                                            <span style={{ fontSize: '14px', fontWeight: 500 }}>Bridge</span>
                                        </button>
                                        
                                        <button className="action-card" style={{
                                            background: 'rgba(139, 92, 246, 0.1)',
                                            border: '2px solid rgba(139, 92, 246, 0.3)',
                                            color: '#8b5cf6'
                                        }}>
                                            <i className="fas fa-chart-line" style={{ fontSize: '20px', marginBottom: '8px' }}></i>
                                            <span style={{ fontSize: '14px', fontWeight: 500 }}>Analytics</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
};

export default Portfolio;