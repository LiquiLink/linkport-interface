import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Asset, AssetAllocation, CrossChainAssetSelectorProps } from '../utils/types';


const CrossChainAssetSelector: React.FC<CrossChainAssetSelectorProps> = ({ 
    sourceChain, 
    targetChain, 
    sourceAsset, 
    sourceAmount,
    onTargetAssetsChange 
}) => {
    const [targetAssets, setTargetAssets] = useState<AssetAllocation[]>([]);
    const [showAddAsset, setShowAddAsset] = useState(false);

    const availableTargetAssets: Asset[] = [
        { id: 'usdc', symbol: 'USDC', name: 'USD Coin', price: 1, balance: 5000, icon: 'USDC' },
        { id: 'usdt', symbol: 'USDT', name: 'Tether', price: 1, balance: 3000, icon: 'USDT' },
        { id: 'dai', symbol: 'DAI', name: 'Dai Stablecoin', price: 1, balance: 2000, icon: 'DAI' },
        { id: 'weth', symbol: 'WETH', name: 'Wrapped Ethereum', price: 3000, balance: 1.5, icon: 'WETH' },
        { id: 'wbtc', symbol: 'WBTC', name: 'Wrapped Bitcoin', price: 50000, balance: 0.1, icon: 'WBTC' },
        { id: 'link', symbol: 'LINK', name: 'Chainlink', price: 15, balance: 200, icon: 'LINK' },
        { id: 'aave', symbol: 'AAVE', name: 'Aave', price: 100, balance: 50, icon: 'AAVE' },
        { id: 'uni', symbol: 'UNI', name: 'Uniswap', price: 7, balance: 300, icon: 'UNI' }
    ];

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

    const calculateAllocation = (assets: AssetAllocation[]): AssetAllocation[] => {
        const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
        return assets.map(asset => ({
            ...asset,
            percentage: totalValue > 0 ? (asset.value / totalValue) * 100 : 0
        }));
    };

    const addTargetAsset = (assetId: string) => {
        const asset = availableTargetAssets.find(a => a.id === assetId);
        if (!asset || targetAssets.find(a => a.id === assetId)) return;

        const newAsset: AssetAllocation = {
            id: asset.id,
            symbol: asset.symbol,
            amount: 0,
            value: 0,
            percentage: 0,
            color: colors[targetAssets.length % colors.length]
        };

        const updatedAssets = [...targetAssets, newAsset];
        const allocatedAssets = calculateAllocation(updatedAssets);
        setTargetAssets(allocatedAssets);
        onTargetAssetsChange(allocatedAssets);
        setShowAddAsset(false);
    };

    const updateTargetAssetAmount = (assetId: string, amount: number) => {
        const asset = availableTargetAssets.find(a => a.id === assetId);
        if (!asset) return;

        const updatedAssets = targetAssets.map(a => 
            a.id === assetId 
                ? { ...a, amount, value: amount * asset.price }
                : a
        );
        
        const allocatedAssets = calculateAllocation(updatedAssets);
        setTargetAssets(allocatedAssets);
        onTargetAssetsChange(allocatedAssets);
    };

    const removeTargetAsset = (assetId: string) => {
        const updatedAssets = targetAssets.filter(a => a.id !== assetId);
        const allocatedAssets = calculateAllocation(updatedAssets);
        setTargetAssets(allocatedAssets);
        onTargetAssetsChange(allocatedAssets);
    };

    const formatValue = (value: number) => {
        if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
        return `$${value.toFixed(2)}`;
    };

    const getChainName = (chainId: string) => {
        const chains: { [key: string]: string } = {
            'ethereum': 'Ethereum',
            'optimism': 'Optimism',
            'arbitrum': 'Arbitrum',
            'polygon': 'Polygon',
            'avalanche': 'Avalanche'
        };
        return chains[chainId] || chainId;
    };

    const getTotalBorrowValue = () => {
        return targetAssets.reduce((sum, asset) => sum + asset.value, 0);
    };

    const getMaxBorrowValue = () => {
        return sourceAmount * (sourceAsset?.price || 0) * 0.75; // 75% LTV
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-color)' }}>
                        {data.symbol}
                    </div>
                    <div style={{ color: 'var(--secondary-text)', fontSize: '14px' }}>
                        Amount: {data.amount} {data.symbol}
                    </div>
                    <div style={{ color: 'var(--secondary-text)', fontSize: '14px' }}>
                        Value: {formatValue(data.value)}
                    </div>
                    <div style={{ color: 'var(--secondary-text)', fontSize: '14px' }}>
                        Ratio: {data.percentage.toFixed(1)}%
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div>
            {/* Source Asset Display */}
            <div style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px'
            }}>
                <h4 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600, color: '#3b82f6' }}>
                    Source Chain Collateral ({getChainName(sourceChain)})
                </h4>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <div className="token-icon placeholder">{sourceAsset?.icon || 'ETH'}</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '16px', fontWeight: 600 }}>
                            {sourceAmount} {sourceAsset?.symbol || 'ETH'}
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--secondary-text)' }}>
                            Value: {formatValue(sourceAmount * (sourceAsset?.price || 3000))}
                        </div>
                    </div>
                    <div style={{
                        background: 'rgba(34, 197, 94, 0.1)',
                        color: '#22c55e',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500
                    }}>
                        Max Borrowable: {formatValue(getMaxBorrowValue())}
                    </div>
                </div>
            </div>

            {/* Target Assets Selector */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.6)',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '20px'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px'
                }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                        Target Chain Borrowing Assets ({getChainName(targetChain)})
                    </h4>
                    <button
                        className="button secondary compact"
                        onClick={() => setShowAddAsset(true)}
                    >
                        + Add Asset
                    </button>
                </div>

                {/* Selected Target Assets */}
                {targetAssets.length > 0 && (
                    <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
                        {targetAssets.map((asset) => {
                            const assetInfo = availableTargetAssets.find(a => a.id === asset.id);
                            return (
                                <div key={asset.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '16px',
                                    background: 'rgba(255, 255, 255, 0.8)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border-color)'
                                }}>
                                    <div style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        background: asset.color
                                    }}></div>
                                    <div className="token-icon placeholder">{asset.symbol}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{asset.symbol}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                                            {assetInfo?.name}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="number"
                                            value={asset.amount}
                                            onChange={(e) => updateTargetAssetAmount(asset.id, parseFloat(e.target.value) || 0)}
                                            placeholder="0"
                                            style={{
                                                width: '100px',
                                                padding: '8px',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border-color)',
                                                background: 'rgba(255, 255, 255, 0.9)',
                                                fontSize: '14px'
                                            }}
                                        />
                                        <div style={{ fontSize: '12px', color: 'var(--secondary-text)', minWidth: '60px' }}>
                                            {formatValue(asset.value)}
                                        </div>
                                        <button
                                            onClick={() => removeTargetAsset(asset.id)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                borderRadius: '4px'
                                            }}
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Borrowing Capacity */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    background: getTotalBorrowValue() > getMaxBorrowValue() 
                        ? 'rgba(239, 68, 68, 0.1)' 
                        : 'rgba(34, 197, 94, 0.1)',
                    borderRadius: '8px',
                    marginBottom: '16px'
                }}>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>Borrowing Capacity Utilization:</span>
                    <span style={{ 
                        fontSize: '16px', 
                        fontWeight: 700,
                        color: getTotalBorrowValue() > getMaxBorrowValue() ? '#ef4444' : '#22c55e'
                    }}>
                        {((getTotalBorrowValue() / getMaxBorrowValue()) * 100).toFixed(1)}%
                    </span>
                </div>

                {/* Add Asset Modal */}
                {showAddAsset && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '60px 20px'
                    }} onClick={() => setShowAddAsset(false)}>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(20px)',
                            borderRadius: '16px',
                            padding: '16px',
                            width: '100%',
                            maxWidth: '360px',
                            maxHeight: '50vh',
                            overflowY: 'auto',
                            position: 'relative',
                            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
                            margin: 'auto'
                        }} onClick={(e) => e.stopPropagation()}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '12px',
                                paddingBottom: '8px',
                                borderBottom: '1px solid var(--border-color)'
                            }}>
                                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Select Borrowing Assets</h3>
                                <button
                                    onClick={() => setShowAddAsset(false)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '18px',
                                        cursor: 'pointer',
                                        color: 'var(--secondary-text)',
                                        padding: '2px',
                                        borderRadius: '4px',
                                        lineHeight: 1,
                                        width: '24px',
                                        height: '24px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                            <div style={{ display: 'grid', gap: '6px' }}>
                                {availableTargetAssets
                                    .filter(asset => !targetAssets.find(ta => ta.id === asset.id))
                                    .map(asset => (
                                        <div key={asset.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                padding: '10px',
                                                background: 'rgba(255, 255, 255, 0.8)',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border-color)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                fontSize: '13px'
                                            }}
                                            onClick={() => addTargetAsset(asset.id)}
                                            onMouseEnter={(e) => {
                                                const target = e.currentTarget as HTMLElement;
                                                target.style.background = 'rgba(59, 130, 246, 0.1)';
                                                target.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                                            }}
                                            onMouseLeave={(e) => {
                                                const target = e.currentTarget as HTMLElement;
                                                target.style.background = 'rgba(255, 255, 255, 0.8)';
                                                target.style.borderColor = 'var(--border-color)';
                                            }}
                                        >
                                            <div className="token-icon small">{asset.icon}</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '13px', fontWeight: 600 }}>{asset.symbol}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>
                                                    {asset.name}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '11px', fontWeight: 600 }}>
                                                    Available: {asset.balance}
                                                </div>
                                                <div style={{ fontSize: '10px', color: 'var(--secondary-text)' }}>
                                                    ${(asset.balance * asset.price).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Pie Chart */}
            {targetAssets.length > 0 && targetAssets.some(asset => asset.value > 0) && (
                <div style={{
                    background: 'rgba(255, 255, 255, 0.6)',
                    borderRadius: '16px',
                    padding: '20px',
                    marginBottom: '20px'
                }}>
                    <h4 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>Borrowing Asset Allocation</h4>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={targetAssets.filter(asset => asset.value > 0)}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={120}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {targetAssets.filter(asset => asset.value > 0).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    formatter={(value, entry: any) => (
                                        <span style={{ color: 'var(--text-color)' }}>
                                            {value} ({entry.payload.percentage.toFixed(1)}%)
                                        </span>
                                    )}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '16px',
                        padding: '16px',
                        background: 'rgba(255, 255, 255, 0.8)',
                        borderRadius: '12px'
                    }}>
                        <span style={{ fontWeight: 600 }}>Total Borrow Value:</span>
                        <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-color)' }}>
                            {formatValue(getTotalBorrowValue())}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CrossChainAssetSelector; 