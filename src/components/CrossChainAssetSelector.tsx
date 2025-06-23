import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Asset, AssetAllocation, CrossChainAssetSelectorProps } from '../utils/types';
import ReactDOM from 'react-dom';

const getTokenIconStyle = (symbol: string) => {
    const baseStyle: React.CSSProperties = {
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '13px',
      fontWeight: 'bold',
      color: 'white',
      textTransform: 'uppercase',
      background: '#7F8C8D' // Default background
    };
  
    const themes: { [key: string]: { background: string } } = {
      'USDC': { background: '#2775CA' },
      'USDT': { background: '#50AF95' },
      'DAI': { background: '#F5AC37' },
      'WETH': { background: 'linear-gradient(135deg, #4D4D4D, #7F8C8D)' },
      'WBTC': { background: 'linear-gradient(135deg, #F7931A, #FDB95D)' },
      'LINK': { background: 'linear-gradient(135deg, #2A5ADA, #3B82F6)' },
      'AAVE': { background: 'linear-gradient(135deg, #B6509E, #E069D4)' },
      'UNI': { background: 'linear-gradient(135deg, #FF007A, #FF7A9F)' },
      'ETH': { background: 'linear-gradient(135deg, #627EEA, #8A9FFF)' },
      'BNB': { background: 'linear-gradient(135deg, #F3BA2F, #F8D06B)' },
    };
  
    const theme = themes[(symbol || '').toUpperCase()];
    return theme ? { ...baseStyle, ...theme } : baseStyle;
  };

const CrossChainAssetSelector: React.FC<CrossChainAssetSelectorProps> = ({ 
    sourceChain, 
    targetChain, 
    sourceAsset, 
    sourceAmount,
    onTargetAssetsChange 
}) => {
    const [targetAssets, setTargetAssets] = useState<AssetAllocation[]>([]);
    const [showAddAsset, setShowAddAsset] = useState(false);
    const [inputValues, setInputValues] = useState<{ [key: string]: string }>({});

    // Smart asset sorting function
    const sortAssets = (assets: Asset[]) => {
        return [...assets].sort((a, b) => {
            // 1. Mainstream asset priority
            const mainAssets = ['ETH', 'USDC', 'USDT', 'DAI', 'WETH', 'BNB'];
            const aPriority = mainAssets.indexOf(a.symbol?.toUpperCase()) !== -1 ? 0 : 1;
            const bPriority = mainAssets.indexOf(b.symbol?.toUpperCase()) !== -1 ? 0 : 1;
            
            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }
            
            // 2. Sort by balance
            const aBalance = parseFloat(a.balance || '0');
            const bBalance = parseFloat(b.balance || '0');
            
            // Assets with balance come first
            if (aBalance > 0 && bBalance === 0) return -1;
            if (aBalance === 0 && bBalance > 0) return 1;
            
            // When both have balance, sort by balance descending
            if (aBalance > 0 && bBalance > 0) {
                return bBalance - aBalance;
            }
            
            // 3. When both have zero balance, sort alphabetically
            return (a.symbol || '').localeCompare(b.symbol || '');
        });
    };

    const unsortedAssets: Asset[] = [
        { id: 'usdc', symbol: 'USDC', name: 'USD Coin', price: 1, balance: '5000', icon: 'USDC' },
        { id: 'usdt', symbol: 'USDT', name: 'Tether', price: 1, balance: '3000', icon: 'USDT' },
        { id: 'dai', symbol: 'DAI', name: 'Dai Stablecoin', price: 1, balance: '2000', icon: 'DAI' },
        { id: 'weth', symbol: 'WETH', name: 'Wrapped Ethereum', price: 3000, balance: '1.5', icon: 'WETH' },
        { id: 'wbtc', symbol: 'WBTC', name: 'Wrapped Bitcoin', price: 50000, balance: '0.1', icon: 'WBTC' },
        { id: 'link', symbol: 'LINK', name: 'Chainlink', price: 15, balance: '200', icon: 'LINK' },
        { id: 'aave', symbol: 'AAVE', name: 'Aave', price: 100, balance: '50', icon: 'AAVE' },
        { id: 'uni', symbol: 'UNI', name: 'Uniswap', price: 7, balance: '300', icon: 'UNI' }
    ];

    const availableTargetAssets: Asset[] = sortAssets(unsortedAssets);


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

    const updateTargetAssetAmount = (assetId: string, inputValue: string) => {
        const asset = availableTargetAssets.find(a => a.id === assetId);
        if (!asset) return;

        // Update input value state
        setInputValues(prev => ({
            ...prev,
            [assetId]: inputValue
        }));

        // Convert to number for calculations
        const amount = parseFloat(inputValue) || 0;

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
        
        // Clean up input value
        setInputValues(prev => {
            const newValues = { ...prev };
            delete newValues[assetId];
            return newValues;
        });
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

    const getTotalBridgeValue = () => {
        return targetAssets.reduce((sum, asset) => sum + asset.value, 0);
    };

    const getMaxBridgeValue = () => {
        return sourceAmount * (sourceAsset?.price || 0) * 0.8; // 80% maximum bridge ratio
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

    const handleInputChange = (assetId: string, value: string) => {
        // Allow empty string, digits, and decimal point
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            updateTargetAssetAmount(assetId, value);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Block invalid characters
        const invalidChars = ['-', '+', 'e', 'E'];
        if (invalidChars.includes(e.key)) {
            e.preventDefault();
        }
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
                    <div style={getTokenIconStyle(sourceAsset?.symbol || 'ETH')}>{sourceAsset?.symbol || 'ETH'}</div>
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
                        Max Bridgeable: {formatValue(getMaxBridgeValue())}
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
                    alignItems: 'baseline',
                    marginBottom: '16px',
                    flexDirection: 'column'
                }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
                        Target Chain Bridge Assets ({getChainName(targetChain)})
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
                                    <div style={getTokenIconStyle(asset.symbol)}>{asset.symbol}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{asset.symbol}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                                            {assetInfo?.name}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="text"
                                            value={inputValues[asset.id] || ''}
                                            onChange={(e) => handleInputChange(asset.id, e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Enter amount"
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

                {/* Bridge Capacity */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    background: getTotalBridgeValue() > getMaxBridgeValue() 
                        ? 'rgba(239, 68, 68, 0.1)' 
                        : 'rgba(34, 197, 94, 0.1)',
                    borderRadius: '8px',
                    marginBottom: '16px'
                }}>
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>Bridge Capacity Utilization:</span>
                    <span style={{ 
                        fontSize: '16px', 
                        fontWeight: 700,
                        color: getTotalBridgeValue() > getMaxBridgeValue() ? '#ef4444' : '#22c55e'
                    }}>
                        {getMaxBridgeValue() > 0 ? ((getTotalBridgeValue() / getMaxBridgeValue()) * 100).toFixed(1) : 'Infinity'}%
                    </span>
                </div>

                {/* Add Asset Modal */}
                {showAddAsset && (ReactDOM.createPortal(
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(255, 255, 255, 0.25)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '60px 20px',
                        transition: 'opacity 0.2s ease, backdrop-filter 0.2s, -webkit-backdrop-filter 0.2s',
                    }} onClick={() => setShowAddAsset(false)}>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(20px)',
                            borderRadius: '16px',
                            padding: '20px',
                            width: '100%',
                            maxWidth: '420px',
                            maxHeight: '60vh',
                            overflowY: 'auto',
                            position: 'relative',
                            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
                            margin: 'auto'
                        }} onClick={(e) => e.stopPropagation()}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '16px',
                                paddingBottom: '12px',
                                borderBottom: '1px solid var(--border-color)'
                            }}>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Select Bridge Assets</h3>
                                <button
                                    onClick={() => setShowAddAsset(false)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '22px',
                                        cursor: 'pointer',
                                        color: 'var(--secondary-text)',
                                        padding: '2px',
                                        borderRadius: '4px',
                                        lineHeight: 1,
                                        width: '28px',
                                        height: '28px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                            <div style={{ display: 'grid', gap: '8px' }}>
                                {availableTargetAssets
                                    .filter(asset => !targetAssets.find(ta => ta.id === asset.id))
                                    .map(asset => (
                                        <div key={asset.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '12px',
                                                background: 'rgba(255, 255, 255, 0.8)',
                                                borderRadius: '10px',
                                                border: '1px solid var(--border-color)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
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
                                            <div style={getTokenIconStyle(asset.icon)}>{asset.icon}</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '15px', fontWeight: 600 }}>{asset.symbol}</div>
                                                <div style={{ fontSize: '13px', color: 'var(--secondary-text)' }}>
                                                    {asset.name}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '13px', fontWeight: 600 }}>
                                                    Available: {parseFloat(asset.balance).toFixed(2)}
                                                </div>
                                                <div style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                                                    ${(parseFloat(asset.balance) * asset.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>, document.body) as any
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
                    <h4 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>Bridge Asset Allocation</h4>
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
                        <span style={{ fontWeight: 600 }}>Total Bridge Value:</span>
                        <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-color)' }}>
                            {formatValue(getTotalBridgeValue())}
                        </span>
                    </div>
                </div>
            )}

            {/* Risk Indicator */}
            {getTotalBridgeValue() > 0 && sourceAmount > 0 && (
                <div style={{
                    background: (() => {
                        const collateralValue = sourceAmount * (sourceAsset?.price || 3000);
                        const borrowValue = getTotalBridgeValue();
                        const ratio = (collateralValue / borrowValue) * 100;
                        
                        if (ratio < 130) return 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.05))';
                        if (ratio < 150) return 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.05))';
                        return 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(21, 128, 61, 0.05))';
                    })(),
                    border: (() => {
                        const collateralValue = sourceAmount * (sourceAsset?.price || 3000);
                        const borrowValue = getTotalBridgeValue();
                        const ratio = (collateralValue / borrowValue) * 100;
                        
                        if (ratio < 130) return '2px solid #ef4444';
                        if (ratio < 150) return '2px solid #f59e0b';
                        return '2px solid #22c55e';
                    })(),
                    borderRadius: '12px',
                    padding: '16px'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px'
                    }}>
                        <div style={{ fontSize: '24px' }}>
                            {(() => {
                                const collateralValue = sourceAmount * (sourceAsset?.price || 3000);
                                const borrowValue = getTotalBridgeValue();
                                const ratio = (collateralValue / borrowValue) * 100;
                                
                                if (ratio < 130) return '🚨';
                                if (ratio < 150) return '⚠️';
                                return '✅';
                            })()}
                        </div>
                        <div>
                            <div style={{
                                fontSize: '16px',
                                fontWeight: 600,
                                color: (() => {
                                    const collateralValue = sourceAmount * (sourceAsset?.price || 3000);
                                    const borrowValue = getTotalBridgeValue();
                                    const ratio = (collateralValue / borrowValue) * 100;
                                    
                                    if (ratio < 130) return '#ef4444';
                                    if (ratio < 150) return '#f59e0b';
                                    return '#22c55e';
                                })()
                            }}>
                                Collateral Ratio: {(() => {
                                    const collateralValue = sourceAmount * (sourceAsset?.price || 3000);
                                    const borrowValue = getTotalBridgeValue();
                                    return ((collateralValue / borrowValue) * 100).toFixed(1);
                                })()}%
                            </div>
                            <div style={{
                                fontSize: '14px',
                                color: '#6b7280',
                                marginTop: '4px'
                            }}>
                                {(() => {
                                    const collateralValue = sourceAmount * (sourceAsset?.price || 3000);
                                    const borrowValue = getTotalBridgeValue();
                                    const ratio = (collateralValue / borrowValue) * 100;
                                    
                                    if (ratio < 130) return 'DANGER: Position at risk of liquidation!';
                                    if (ratio < 150) return 'WARNING: Low collateral ratio detected';
                                    return 'SAFE: Healthy collateral ratio';
                                })()}
                            </div>
                        </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div>
                        <div style={{
                            height: '6px',
                            background: '#f3f4f6',
                            borderRadius: '3px',
                            overflow: 'hidden',
                            position: 'relative'
                        }}>
                            {/* Liquidation threshold line */}
                            <div style={{
                                position: 'absolute',
                                left: 'calc(130px / 3)', // Rough position for 130% on a 300% scale
                                width: '2px',
                                height: '100%',
                                background: '#ef4444',
                                zIndex: 2
                            }}></div>
                            
                            {/* Progress fill */}
                            <div style={{
                                height: '100%',
                                background: (() => {
                                    const collateralValue = sourceAmount * (sourceAsset?.price || 3000);
                                    const borrowValue = getTotalBridgeValue();
                                    const ratio = (collateralValue / borrowValue) * 100;
                                    
                                    if (ratio < 130) return '#ef4444';
                                    if (ratio < 150) return '#f59e0b';
                                    return '#22c55e';
                                })(),
                                width: `${Math.min(((sourceAmount * (sourceAsset?.price || 3000)) / getTotalBridgeValue()) * 100 / 3, 100)}%`,
                                borderRadius: '3px',
                                transition: 'width 0.3s ease'
                            }}></div>
                        </div>
                        <div style={{
                            fontSize: '10px',
                            color: '#ef4444',
                            marginTop: '4px'
                        }}>
                            ↑ Liquidation at 130%
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CrossChainAssetSelector; 
