import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Asset, AssetAllocation, CrossChainAssetSelectorProps } from '../utils/types';
import ReactDOM from 'react-dom';
import { formatUnits } from 'ethers';
import { sepolia, bscTestnet } from 'wagmi/chains';
import { poolList } from '../config';
import { getAssetPriceFromPort  } from '@/utils/priceService';
import { getBalance } from '@/utils/balance';

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
    const [availableTargetAssets, setAvailableTargetAssets] = useState<any[]>([]);

    console.log('targetChain:', targetChain);   

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


    useEffect(() => { 
        async function loadAvailableAssets() {
            console.log("Loading available assets for target chain:", targetChain);
            if (!targetChain) return;

            poolList.forEach(pool => {
                console.log("Pool:", pool.name, "Chain ID:", pool.chainId, "Address:", pool.address, "Tokens:", pool.tokens, pool.chainId == targetChain);
            })
            
            const poolPromises = poolList.filter(pool => pool.chainId == targetChain).map(async pool => {
                console.log("Processing pool:", pool.name, "on chain", pool.chainId);
                const price = await getAssetPriceFromPort(pool.address, pool.chainId);
                console.log("Asset price for", pool.tokens[0], "on chain", pool.chainId, ":", price);
                
                // Add fallback price logic when smart contract price fails
                let finalPrice = price?.price || 0;
                if (finalPrice === 0) {
                    const symbol = pool.tokens[0].toUpperCase();
                    switch (symbol) {
                        case 'USDT':
                        case 'USDC':
                        case 'DAI':
                            finalPrice = 1; // Stablecoins
                            break;
                        case 'ETH':
                        case 'WETH':
                            finalPrice = 2500; // ETH fallback (from smart contract script)
                            break;
                        case 'BNB':
                            finalPrice = 660; // BNB fallback (from smart contract script)
                            break;
                        case 'LINK':
                            finalPrice = 15; // LINK fallback (from smart contract script)
                            break;
                        default:
                            finalPrice = 1; // Default for unknown assets
                    }
                    console.warn(`Using fallback price for ${symbol}: $${finalPrice} (original price was 0)`);
                }
                
                return getBalance(pool.address, pool.pool, pool.chainId).then(async balance => {
                    return {
                        id: pool.id,
                        symbol: pool.tokens[0],
                        name: pool.name,
                        icon: pool.tokens[0].toUpperCase(),
                        price: finalPrice,
                        balance: parseFloat(formatUnits(balance, 18)), // Assuming 18 decimals for simplicity
                        isNative: pool.isNative,
                        token: pool.address,
                        chainId: pool.chainId
                    };
                })
            })
                    
            const assetsWithBalance = await Promise.all(poolPromises);
            console.log("Assets with balance:", assetsWithBalance);

            const sortAssets = (assets: any[]) => {
                return [...assets].sort((a, b) => {
                const mainAssets = ['ETH', 'USDC', 'USDT', 'DAI', 'WETH', 'BNB'];
                const aPriority = mainAssets.indexOf(a.symbol?.toUpperCase()) !== -1 ? 0 : 1;
                const bPriority = mainAssets.indexOf(b.symbol?.toUpperCase()) !== -1 ? 0 : 1;
                
                if (aPriority !== bPriority) {
                    return aPriority - bPriority;
                }
                
                const aBalance = a.balance || 0;
                const bBalance = b.balance || 0;
                
                if (aBalance > 0 && bBalance === 0) return -1;
                if (aBalance === 0 && bBalance > 0) return 1;
                
                if (aBalance > 0 && bBalance > 0) {
                    return bBalance - aBalance;
                }
                
                return (a.symbol || '').localeCompare(b.symbol || '');
                });
            };
            console.log("Sorted assets:", assetsWithBalance);

            setAvailableTargetAssets(sortAssets(assetsWithBalance));
        }

        loadAvailableAssets();
    }, [targetChain]);


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
            token: asset.token,
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
            [sepolia.id]: 'Ethereum Sepolia',
            [bscTestnet.id]: 'BNB Testnet',
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
                    background: 'var(--bg-glass-strong)',
                    backdropFilter: 'blur(10px)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-glass-strong)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    color: 'var(--text-primary)'
                }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {data.symbol}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        Amount: {data.amount} {data.symbol}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                        Value: {formatValue(data.value)}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
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

    console.log("source Asset:", sourceAsset);  

    return (
        <div>
            {/* Source Asset Display */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(59, 130, 246, 0.05))',
                border: '1px solid var(--accent-primary)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-lg)',
                marginBottom: 'var(--space-lg)'
            }}>
                <h4 style={{ marginBottom: 'var(--space-sm)', fontSize: '16px', fontWeight: 600, color: 'var(--accent-primary)' }}>
                    Source Chain Collateral ({getChainName(sourceChain.toString())})
                </h4>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)'
                }}>
                    <div style={getTokenIconStyle(sourceAsset?.icon || 'ETH')}>{sourceAsset?.symbol || 'ETH'}</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {sourceAmount} {sourceAsset?.name || 'ETH'}
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                            Value: {formatValue(sourceAmount * (sourceAsset?.price || 3000))}
                        </div>
                    </div>
                    <div style={{
                        background: 'var(--success-bg)',
                        color: 'var(--success)',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        fontWeight: 500
                    }}>
                        Max Bridgeable: {formatValue(getMaxBridgeValue())}
                    </div>
                </div>
            </div>

            {/* Target Assets Selector */}
            <div className="glass-card" style={{
                marginBottom: 'var(--space-lg)'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 'var(--space-md)',
                    flexDirection: 'column'
                }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, marginBottom: 'var(--space-md)', color: 'var(--text-primary)' }}>
                        Target Chain Bridge Assets ({targetChain ? getChainName(targetChain.toString()) : 'Select Chain'})
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
                    <div style={{ display: 'grid', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                        {targetAssets.map((asset) => {
                            const assetInfo = availableTargetAssets.find(a => a.id === asset.id);
                            return (
                                <div key={asset.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-sm)',
                                    padding: 'var(--space-md)',
                                    background: 'var(--bg-card)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-glass-strong)',
                                    transition: 'all var(--transition-normal)'
                                }}>
                                    <div style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        background: asset.color
                                    }}></div>
                                    <div style={getTokenIconStyle(asset.symbol)}>{asset.symbol}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{asset.symbol}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            {assetInfo?.name}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        <input
                                            type="text"
                                            value={inputValues[asset.id] || ''}
                                            onChange={(e) => handleInputChange(asset.id, e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Enter amount"
                                            style={{
                                                width: '100px',
                                                padding: '8px',
                                                borderRadius: 'var(--radius-sm)',
                                                border: '1px solid var(--border-glass-strong)',
                                                background: 'var(--bg-secondary)',
                                                fontSize: '14px',
                                                color: 'var(--text-primary)'
                                            }}
                                        />
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', minWidth: '60px' }}>
                                            {formatValue(asset.value)}
                                        </div>
                                        <button
                                            onClick={() => removeTargetAsset(asset.id)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--danger)',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                borderRadius: 'var(--radius-sm)',
                                                transition: 'all var(--transition-fast)'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'var(--danger-bg)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'none';
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
                    padding: 'var(--space-sm)',
                    background: getTotalBridgeValue() > getMaxBridgeValue() 
                        ? 'var(--danger-bg)' 
                        : 'var(--success-bg)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: 'var(--space-md)'
                }}>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>Bridge Capacity Utilization:</span>
                    <span style={{ 
                        fontSize: '16px', 
                        fontWeight: 700,
                        color: getTotalBridgeValue() > getMaxBridgeValue() ? 'var(--danger)' : 'var(--success)'
                    }}>
                        {getMaxBridgeValue() > 0 ? ((getTotalBridgeValue() / getMaxBridgeValue()) * 100).toFixed(1) : '0'}%
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
                        background: 'rgba(15, 23, 42, 0.8)',
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
                            background: 'var(--bg-glass-strong)',
                            backdropFilter: 'blur(20px)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--space-lg)',
                            width: '100%',
                            maxWidth: '420px',
                            maxHeight: '60vh',
                            overflowY: 'auto',
                            position: 'relative',
                            boxShadow: 'var(--shadow-large)',
                            margin: 'auto',
                            border: '1px solid var(--border-glass-strong)'
                        }} onClick={(e) => e.stopPropagation()}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 'var(--space-md)',
                                paddingBottom: 'var(--space-sm)',
                                borderBottom: '1px solid var(--border-glass-strong)'
                            }}>
                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Select Bridge Assets</h3>
                                <button
                                    onClick={() => setShowAddAsset(false)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '22px',
                                        cursor: 'pointer',
                                        color: 'var(--text-secondary)',
                                        padding: '2px',
                                        borderRadius: 'var(--radius-sm)',
                                        lineHeight: 1,
                                        width: '28px',
                                        height: '28px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all var(--transition-fast)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'var(--bg-tertiary)';
                                        e.currentTarget.style.color = 'var(--text-primary)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'none';
                                        e.currentTarget.style.color = 'var(--text-secondary)';
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                            <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                                {availableTargetAssets
                                    .filter(asset => !targetAssets.find(ta => ta.id === asset.id))
                                    .map(asset => (
                                        <div key={asset.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--space-sm)',
                                                padding: 'var(--space-sm)',
                                                background: 'var(--bg-card)',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--border-glass-strong)',
                                                cursor: 'pointer',
                                                transition: 'all var(--transition-normal)',
                                            }}
                                            onClick={() => addTargetAsset(asset.id)}
                                            onMouseEnter={(e) => {
                                                const target = e.currentTarget as HTMLElement;
                                                target.style.background = 'var(--bg-card-hover)';
                                                target.style.borderColor = 'var(--accent-primary)';
                                            }}
                                            onMouseLeave={(e) => {
                                                const target = e.currentTarget as HTMLElement;
                                                target.style.background = 'var(--bg-card)';
                                                target.style.borderColor = 'var(--border-glass-strong)';
                                            }}
                                        >
                                            <div style={getTokenIconStyle(asset.icon)}>{asset.icon}</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{asset.symbol}</div>
                                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                    {asset.name}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    Available: {parseFloat(asset.balance).toFixed(2)}
                                                </div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
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
                <div className="glass-card" style={{
                    marginBottom: 'var(--space-lg)'
                }}>
                    <h4 style={{ marginBottom: 'var(--space-md)', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Bridge Asset Allocation</h4>
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
                                        <span style={{ color: 'var(--text-primary)' }}>
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
                        marginTop: 'var(--space-md)',
                        padding: 'var(--space-md)',
                        background: 'var(--bg-card)',
                        borderRadius: 'var(--radius-md)'
                    }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Total Bridge Value:</span>
                        <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-primary)' }}>
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
                        
                        if (ratio < 130) return 'var(--danger-bg)';
                        if (ratio < 150) return 'var(--warning-bg)';
                        return 'var(--success-bg)';
                    })(),
                    border: (() => {
                        const collateralValue = sourceAmount * (sourceAsset?.price || 3000);
                        const borrowValue = getTotalBridgeValue();
                        const ratio = (collateralValue / borrowValue) * 100;
                        
                        if (ratio < 130) return '2px solid var(--danger)';
                        if (ratio < 150) return '2px solid var(--warning)';
                        return '2px solid var(--success)';
                    })(),
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-md)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-sm)',
                        marginBottom: 'var(--space-sm)'
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
                                    
                                    if (ratio < 130) return 'var(--danger)';
                                    if (ratio < 150) return 'var(--warning)';
                                    return 'var(--success)';
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
                                color: 'var(--text-secondary)',
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
                            background: 'var(--bg-tertiary)',
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
                                background: 'var(--danger)',
                                zIndex: 2
                            }}></div>
                            
                            {/* Progress fill */}
                            <div style={{
                                height: '100%',
                                background: (() => {
                                    const collateralValue = sourceAmount * (sourceAsset?.price || 3000);
                                    const borrowValue = getTotalBridgeValue();
                                    const ratio = (collateralValue / borrowValue) * 100;
                                    
                                    if (ratio < 130) return 'var(--danger)';
                                    if (ratio < 150) return 'var(--warning)';
                                    return 'var(--success)';
                                })(),
                                width: `${Math.min(((sourceAmount * (sourceAsset?.price || 3000)) / getTotalBridgeValue()) * 100 / 3, 100)}%`,
                                borderRadius: '3px',
                                transition: 'width 0.3s ease'
                            }}></div>
                        </div>
                        <div style={{
                            fontSize: '10px',
                            color: 'var(--danger)',
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
