import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Asset, AssetAllocation } from '../utils/types';
import { useAccount } from 'wagmi';
import { getUserAssetBalance, getBalance } from '../utils/balance';
import { formatUnits } from 'ethers';
import { poolList } from '../config';
import ReactDOM from 'react-dom';
import { getTokenIconStyle } from '../utils/ui';
import { get } from 'node:https';
import { getAssetPriceFromPort } from '@/utils/priceService';

interface MultiAssetSelectorProps {
  selectedChain: string;
  onAssetsChange: (assets: AssetAllocation[]) => void;
}

const MultiAssetSelector: React.FC<MultiAssetSelectorProps> = ({
  selectedChain,
  onAssetsChange
}) => {
  const [selectedAssets, setSelectedAssets] = useState<AssetAllocation[]>([]);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [inputValues, setInputValues] = useState<{[key: string]: string}>({});
  const { address } = useAccount();

  // Load available assets for the selected chain
  useEffect(() => {
    async function loadAvailableAssets() {
      if (!selectedChain) return;
      
      const chainId = parseInt(selectedChain);
      console.log("Loading assets for chain:", chainId);
      

      const poolPromises = poolList.filter(pool => pool.chainId === chainId).map(async pool => {
        const price = await getAssetPriceFromPort(pool.address, pool.chainId);
        console.log("🔍 Asset price for", pool.tokens[0], "on chain", pool.chainId, ":", price);
        
        // Set reasonable fallback prices for different assets
        let fallbackPrice = 0;
        const symbol = pool.tokens[0].toUpperCase();
        switch (symbol) {
          case 'USDT':
          case 'USDC':
          case 'DAI':
            fallbackPrice = 1; // Stablecoins
            break;
          case 'ETH':
          case 'WETH':
            fallbackPrice = 2500; // ETH (matching smart contract value)
            break;
          case 'BNB':
            fallbackPrice = 660; // BNB (matching smart contract value)
            break;
          case 'LINK':
            fallbackPrice = 15; // LINK (matching smart contract value)
            break;
          default:
            fallbackPrice = 1; // Default for unknown assets
        }
        
        // Fix: Use fallback price when contract price is 0 or undefined
        let finalPrice = price?.price;
        if (!finalPrice || finalPrice === 0) {
          finalPrice = fallbackPrice;
          console.warn(`⚠️ Using fallback price for ${symbol}: $${fallbackPrice} (contract price was ${price?.price})`);
        }
        
        console.log(`💰 Final price for ${symbol}: $${finalPrice}`);
        
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

      setAvailableAssets(sortAssets(assetsWithBalance));
    }

    loadAvailableAssets();
  }, [selectedChain, address]);

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

  const addAsset = (assetId: string) => {
    const asset = availableAssets.find(a => a.id === assetId);
    if (!asset) return;

    const newAsset: AssetAllocation = {
      id: asset.id,
      symbol: asset.symbol,
      token: asset.token,
      amount: 0,
      value: 0,
      percentage: 0,
      color: colors[selectedAssets.length % colors.length]
    };

    const updatedAssets = [...selectedAssets, newAsset];
    setSelectedAssets(updatedAssets);
    setInputValues(prev => ({ ...prev, [assetId]: '' }));
    setShowAddAsset(false);
  };

  const removeAsset = (assetId: string) => {
    const updatedAssets = selectedAssets.filter(asset => asset.id !== assetId);
    setSelectedAssets(updatedAssets);
    setInputValues(prev => {
      const newValues = { ...prev };
      delete newValues[assetId];
      return newValues;
    });
  };

  const updateAssetAmount = (assetId: string, amount: number) => {
    const asset = availableAssets.find(a => a.id === assetId);
    
    console.log('🔍 DEBUG - Looking for asset:', { 
      assetId, 
      allAvailableAssets: availableAssets.map(a => ({ id: a.id, symbol: a.symbol, price: a.price })),
      foundAsset: asset 
    });
    
    if (!asset) {
      console.error('❌ Asset not found in availableAssets!', { assetId });
      return;
    }

    console.log('🧮 updateAssetAmount called:', { 
      assetId, 
      amount, 
      assetPrice: asset.price,
      assetSymbol: asset.symbol,
      assetData: asset
    });

    const updatedAssets = selectedAssets.map(sa => {
      if (sa.id === assetId) {
        const value = amount * asset.price;
        console.log('💰 Asset value calculation:', {
          symbol: asset.symbol,
          amount,
          price: asset.price,
          calculatedValue: value,
          isNaN: isNaN(value)
        });
        return { ...sa, amount, value };
      }
      return sa;
    });

    // Recalculate percentages
    const totalValue = updatedAssets.reduce((sum, asset) => sum + asset.value, 0);
    console.log('📊 Total borrowing value in MultiAssetSelector:', totalValue);
    
    const assetsWithPercentage = updatedAssets.map(asset => ({
      ...asset,
      percentage: totalValue > 0 ? (asset.value / totalValue) * 100 : 0
    }));

    console.log('📤 Sending assets to parent:', assetsWithPercentage);
    setSelectedAssets(assetsWithPercentage);
  };

  useEffect(() => {
    onAssetsChange(selectedAssets);
  }, [selectedAssets, onAssetsChange]);

  const totalValue = selectedAssets.reduce((sum, asset) => sum + asset.value, 0);
  const pieData = selectedAssets.filter(asset => asset.value > 0).map(asset => ({
    name: asset.symbol,
    value: asset.percentage,
    color: asset.color
  }));

  if (!selectedChain) {
    return (
      <div className="glass-card" style={{
        textAlign: 'center', 
        padding: 'var(--space-2xl)',
        background: 'var(--bg-glass)'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'var(--accent-gradient)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto var(--space-lg)',
          opacity: 0.3
        }}>
          <i className="fas fa-link" style={{ fontSize: '32px', color: 'white' }} />
        </div>
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '16px',
          fontWeight: 500
        }}>
          Please select a borrowing target chain first
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Enhanced Main Pool Interface */}
      <div className="glass-card glass-card-glow animate-slide-in" style={{
        marginBottom: 'var(--space-lg)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'var(--accent-gradient)'
        }} />
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-lg)'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'var(--accent-gradient)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <i className="fas fa-layer-group" />
          </div>
          <div>
            <h3 style={{ 
              margin: 0, 
              fontSize: '20px', 
              fontWeight: 700,
              color: 'var(--text-primary)'
            }}>
              Multi-Asset Borrowing Pool
            </h3>
            <div style={{
              fontSize: '14px',
              color: 'var(--text-secondary)'
            }}>
              Create your diversified borrowing strategy
            </div>
          </div>
        </div>

        {/* Enhanced Selected Assets List */}
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          {selectedAssets.length === 0 ? (
            <div className="glass-card" style={{
              textAlign: 'center', 
              padding: 'var(--space-2xl)',
              background: 'rgba(6, 182, 212, 0.05)',
              borderColor: 'var(--accent-primary)'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'var(--accent-gradient)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-md)',
                opacity: 0.7
              }}>
                <i className="fas fa-plus-circle" style={{ fontSize: '24px', color: 'white' }} />
              </div>
              <div style={{
                color: 'var(--accent-primary)',
                fontSize: '16px',
                fontWeight: 600,
                marginBottom: 'var(--space-xs)'
              }}>
                No assets selected yet
              </div>
              <div style={{
                color: 'var(--text-secondary)',
                fontSize: '14px'
              }}>
                Click the button below to add borrowing assets
              </div>
            </div>
          ) : (
            <div className="multi-asset-grid" style={{ gap: 'var(--space-md)' }}>
              {selectedAssets.map((asset) => {
                const assetInfo = availableAssets.find(a => a.id === asset.id);
                return (
                  <div key={asset.id} className="glass-card asset-item animate-scale-in" style={{
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all var(--transition-normal)'
                  }}>
                    {/* Asset color indicator */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      backgroundColor: asset.color
                    }} />
                    
                    {/* Asset header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-md)',
                      marginBottom: 'var(--space-md)'
                    }}>
                      <div className={`token-icon ${asset.symbol.toLowerCase()}`}>
                        {asset.symbol}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          fontSize: '16px', 
                          fontWeight: 700,
                          color: 'var(--text-primary)'
                        }}>
                          {asset.symbol}
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: 'var(--text-secondary)'
                        }}>
                          {assetInfo?.name}
                        </div>
                      </div>
                      <button
                        onClick={() => removeAsset(asset.id)}
                        className="button-ghost button-compact"
                        style={{
                          padding: 'var(--space-xs)',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          color: 'var(--danger)'
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = 'var(--danger-bg)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = 'transparent';
                        }}
                      >
                        <i className="fas fa-times" />
                      </button>
                    </div>
                    
                    {/* Enhanced input section */}
                    <div className="input-card" style={{
                      background: 'var(--bg-glass)',
                      marginBottom: 'var(--space-md)'
                    }}>
                      <input
                        type="text"
                        className="amount-input"
                        placeholder="Enter amount"
                        value={inputValues[asset.id] || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          
                          if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
                            const dotCount = (value.match(/\./g) || []).length;
                            if (dotCount <= 1) {
                              setInputValues(prev => ({ ...prev, [asset.id]: value }));
                              
                              const num = value === '' ? 0 : parseFloat(value) || 0;
                              updateAssetAmount(asset.id, num);
                            }
                          }
                        }}
                        style={{
                          fontSize: '20px',
                          fontWeight: 600,
                          marginBottom: 'var(--space-xs)'
                        }}
                      />
                      <div className="amount-value">
                        ${asset.value.toFixed(2)}
                      </div>
                    </div>

                    {/* Asset allocation display */}
                    <div className="stat-row" style={{
                      background: `linear-gradient(135deg, ${asset.color}15, ${asset.color}05)`,
                      borderColor: `${asset.color}40`
                    }}>
                      <span className="stat-label">Portfolio Weight</span>
                      <span className="stat-value" style={{ 
                        color: asset.color,
                        fontWeight: 700
                      }}>
                        {asset.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Enhanced Add Asset Button */}
        <button
          onClick={() => setShowAddAsset(true)}
          className="button-secondary button-full"
          style={{
            padding: 'var(--space-lg)',
            fontSize: '16px',
            fontWeight: 600,
            border: '2px dashed var(--accent-primary)',
            background: 'rgba(6, 182, 212, 0.05)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(6, 182, 212, 0.1)';
            (e.currentTarget as HTMLElement).style.borderStyle = 'solid';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(6, 182, 212, 0.05)';
            (e.currentTarget as HTMLElement).style.borderStyle = 'dashed';
          }}
        >
          <i className="fas fa-plus" style={{ marginRight: 'var(--space-sm)' }} />
          Select Borrowing Assets
        </button>

        {/* Enhanced Summary */}
        {selectedAssets.length > 0 && (
          <div className="glass-card animate-fade-in" style={{
            marginTop: 'var(--space-lg)',
            background: 'var(--accent-gradient)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)'
              }}>
                <i className="fas fa-chart-line" style={{ color: 'white' }} />
                <span style={{ 
                  fontSize: '16px', 
                  color: 'white',
                  fontWeight: 600
                }}>
                  Total Borrowing Value
                </span>
              </div>
              <span style={{ 
                fontSize: '24px', 
                fontWeight: 800, 
                color: 'white'
              }}>
                ${totalValue.toFixed(2)}
              </span>
            </div>
            <div style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.8)',
              marginTop: 'var(--space-xs)'
            }}>
              {selectedAssets.length} asset{selectedAssets.length !== 1 ? 's' : ''} selected
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Pie Chart Visualization */}
      {pieData.length > 0 && (
        <div className="glass-card glass-card-glow animate-fade-in" style={{
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'conic-gradient(from 0deg, ' + pieData.map(d => d.color).join(', ') + ')'
          }} />
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-lg)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'var(--accent-gradient)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <i className="fas fa-chart-pie" />
            </div>
            <div>
              <h3 style={{ 
                margin: 0, 
                fontSize: '18px', 
                fontWeight: 700,
                color: 'var(--text-primary)'
              }}>
                Asset Allocation Visualization
              </h3>
              <div style={{
                fontSize: '14px',
                color: 'var(--text-secondary)'
              }}>
                Portfolio distribution overview
              </div>
            </div>
          </div>
          
          <div style={{ height: '240px', marginBottom: 'var(--space-lg)' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Enhanced Legend */}
          <div className="multi-asset-grid" style={{ gap: 'var(--space-sm)' }}>
            {pieData.map((entry) => {
              const asset = selectedAssets.find(a => a.symbol === entry.name);
              return (
                <div key={entry.name} className="glass-card" style={{
                  background: `linear-gradient(135deg, ${entry.color}15, ${entry.color}05)`,
                  borderColor: `${entry.color}40`,
                  padding: 'var(--space-md)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    marginBottom: 'var(--space-sm)'
                  }}>
                    <div style={{ 
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      backgroundColor: entry.color,
                      boxShadow: `0 0 10px ${entry.color}40`
                    }} />
                    <span style={{ 
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--text-primary)'
                    }}>
                      {entry.name}
                    </span>
                  </div>
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: entry.color
                    }}>
                      {entry.value.toFixed(1)}%
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: 'var(--text-secondary)',
                      textAlign: 'right'
                    }}>
                      ${asset?.value.toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Enhanced Add Asset Modal */}
      {showAddAsset && (ReactDOM.createPortal(
          <div
            className="modal-overlay animate-fade-in"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '60px var(--space-lg)'
            }}
            onClick={() => setShowAddAsset(false)}
          >
            <div
              className="glass-card glass-card-strong animate-scale-in"
              style={{
                width: '100%',
                maxWidth: '480px',
                maxHeight: '70vh',
                overflowY: 'auto',
                position: 'relative'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Enhanced Modal Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-lg)',
                paddingBottom: 'var(--space-md)',
                borderBottom: '1px solid var(--border-glass)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-md)'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'var(--accent-gradient)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}>
                    <i className="fas fa-coins" />
                  </div>
                  <div>
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: '18px', 
                      fontWeight: 700,
                      color: 'var(--text-primary)'
                    }}>
                      Select Assets to Add
                    </h3>
                    <div style={{
                      fontSize: '14px',
                      color: 'var(--text-secondary)'
                    }}>
                      Choose from available borrowing assets
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddAsset(false)}
                  className="button-ghost button-compact"
                  style={{
                    padding: 'var(--space-sm)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px'
                  }}
                >
                  <i className="fas fa-times" />
                </button>
              </div>

              {/* Enhanced Asset List */}
              <div className="multi-asset-grid" style={{ gap: 'var(--space-sm)' }}>
                {availableAssets
                  .filter(asset => !selectedAssets.find(sa => sa.id === asset.id))
                  .map(asset => (
                    <div key={asset.id}
                      className="glass-card asset-item"
                      style={{
                        cursor: 'pointer',
                        transition: 'all var(--transition-normal)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onClick={() => addAsset(asset.id)}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-md)',
                        marginBottom: 'var(--space-sm)'
                      }}>
                        <div className={`token-icon ${asset.icon.toLowerCase()}`}>
                          {asset.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            fontSize: '16px', 
                            fontWeight: 600,
                            color: 'var(--text-primary)'
                          }}>
                            {asset.symbol}
                          </div>
                          <div style={{ 
                            fontSize: '12px', 
                            color: 'var(--text-secondary)'
                          }}>
                            {asset.name}
                          </div>
                        </div>
                        <i className="fas fa-plus" style={{
                          color: 'var(--accent-primary)',
                          fontSize: '16px'
                        }} />
                      </div>
                      
                      <div className="stat-row">
                        <span className="stat-label">Available Balance</span>
                        <div style={{ textAlign: 'right' }}>
                          <div className="stat-value">
                            {asset.balance.toFixed(4)} {asset.symbol}
                          </div>
                          <div style={{ 
                            fontSize: '11px', 
                            color: 'var(--text-secondary)'
                          }}>
                            ${(asset.balance * asset.price).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>, document.body) as any
      )}
    </div>
  );
};

export default MultiAssetSelector; 