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
        console.log("Asset price for", pool.tokens[0], "on chain", pool.chainId, ":", price);
        
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
            fallbackPrice = 2400; // ETH
            break;
          case 'BNB':
            fallbackPrice = 660; // BNB
            break;
          case 'LINK':
            fallbackPrice = 15; // LINK
            break;
          default:
            fallbackPrice = 1; // Default for unknown assets
        }
        
        return getBalance(pool.address, pool.pool, pool.chainId).then(async balance => {
          return {
            id: pool.id,
            symbol: pool.tokens[0],
            name: pool.name,
            icon: pool.tokens[0].toUpperCase(),
            price: price?.price || fallbackPrice,
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
    if (!asset) return;

    console.log('🧮 updateAssetAmount called:', { 
      assetId, 
      amount, 
      assetPrice: asset.price,
      assetSymbol: asset.symbol 
    });

    const updatedAssets = selectedAssets.map(sa => {
      if (sa.id === assetId) {
        const value = amount * asset.price;
        console.log('💰 Asset value calculation:', {
          symbol: asset.symbol,
          amount,
          price: asset.price,
          calculatedValue: value
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
      <div style={{ 
        textAlign: 'center', 
        padding: '40px', 
        color: 'var(--secondary-text)' 
      }}>
        <i className="fas fa-link" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}></i>
        <p>Please select a borrowing target chain first</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        background: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--border-color)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>
          Multi-Asset Borrowing Pool
        </h3>

        {/* Selected Assets List */}
        <div style={{ marginBottom: '16px' }}>
          {selectedAssets.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px 20px',
              color: 'var(--secondary-text)',
              fontSize: '14px'
            }}>
              <i className="fas fa-plus-circle" style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.5 }}></i>
              <div>Click the button below to add borrowing assets</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {selectedAssets.map((asset) => {
                const assetInfo = availableAssets.find(a => a.id === asset.id);
                return (
                  <div key={asset.id} style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    borderRadius: '12px',
                    padding: '16px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '12px'
                    }}>
                      <div
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: asset.color
                        }}
                      ></div>
                      <div style={getTokenIconStyle(asset.symbol)}>{asset.symbol}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{asset.symbol}</div>
                        <div style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                          {assetInfo?.name}
                        </div>
                      </div>
                      <button
                        onClick={() => removeAsset(asset.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--secondary-text)',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px'
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLElement).style.background = 'rgba(239, 68, 68, 0.1)';
                          (e.target as HTMLElement).style.color = '#ef4444';
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.background = 'none';
                          (e.target as HTMLElement).style.color = 'var(--secondary-text)';
                        }}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center' }}>
                      <input
                        type="text"
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
                        onKeyDown={(e) => {
                          const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
                          const isNumber = /^[0-9]$/.test(e.key);
                          const isDot = e.key === '.';
                          
                          if (!allowedKeys.includes(e.key) && !isNumber && !isDot) {
                            e.preventDefault();
                          }
                          
                          if (isDot && (inputValues[asset.id] || '').includes('.')) {
                            e.preventDefault();
                          }
                        }}
                        style={{
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '14px',
                          background: 'white',
                          color: 'var(--text-color)'
                        }}
                        className="amount-input-placeholder"
                      />
                      <div style={{ textAlign: 'right', minWidth: '80px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600 }}>
                          ${asset.value.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--secondary-text)' }}>
                          {asset.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Add Asset Button */}
        <button
          onClick={() => setShowAddAsset(true)}
          style={{
            width: '100%',
            padding: '12px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))',
            border: '2px dashed rgba(59, 130, 246, 0.3)',
            borderRadius: '12px',
            color: 'var(--accent-color)',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15))';
            (e.target as HTMLElement).style.borderColor = 'rgba(59, 130, 246, 0.5)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))';
            (e.target as HTMLElement).style.borderColor = 'rgba(59, 130, 246, 0.3)';
          }}
        >
          <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
          Select Borrowing Assets
        </button>

        {/* Summary */}
        {selectedAssets.length > 0 && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: 'rgba(59, 130, 246, 0.05)',
            borderRadius: '12px',
            border: '1px solid rgba(59, 130, 246, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--secondary-text)' }}>
                Total Borrowing Value
              </span>
              <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--accent-color)' }}>
                ${totalValue.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Pie Chart */}
      {pieData.length > 0 && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '16px',
          padding: '20px',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--border-color)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>
            Asset Allocation Visualization
          </h3>
          
          <div style={{ height: '200px', marginBottom: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
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

          {/* Legend */}
          <div style={{ display: 'grid', gap: '8px' }}>
            {pieData.map((entry) => {
              const asset = selectedAssets.find(a => a.symbol === entry.name);
              return (
                <div key={entry.name} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: entry.color
                    }}></div>
                    <span style={{ fontSize: '13px' }}>{entry.name}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>
                      {entry.value.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>
                      ${asset?.value.toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Asset Modal */}
      {showAddAsset && (ReactDOM.createPortal(
          <div
            style={{
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
            }}
            onClick={() => setShowAddAsset(false)}
          >
            <div
              style={{
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
                margin: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '1px solid var(--border-color)'
              }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Select Assets to Add</h3>
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
                {availableAssets
                  .filter(asset => !selectedAssets.find(sa => sa.id === asset.id))
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
                      onClick={() => addAsset(asset.id)}
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
                          Balance: {asset.balance.toFixed(2)}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                          ${(asset.balance * asset.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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