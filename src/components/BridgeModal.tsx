import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import ImprovedNetworkSelector from './ImprovedNetworkSelector';
import CrossChainAssetSelector from './CrossChainAssetSelector';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { bscTestnet, sepolia } from 'wagmi/chains';
import { poolList } from '../config';
import { getUserAssetBalance } from '../utils/balance';
import { formatUnits } from 'ethers';
import { AssetAllocation } from '../utils/types';
import { getAssetPriceFromPort, PriceData } from '../utils/priceService';
import { bridge } from '@/utils/pool';
import { useToast } from './Toast';

interface BridgeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const BridgeModal: React.FC<BridgeModalProps> = ({ isOpen, onClose, onSuccess }) => {
    // Core states
    const [bridgeAmount, setBridgeAmount] = useState('');
    const [bridgeSourceChain, setBridgeSourceChain] = useState<string>(sepolia.id.toString());
    const [bridgeTargetChain, setBridgeTargetChain] = useState<string>('');
    const [bridgeAsset, setBridgeAsset] = useState<any>(null);
    const [bridgeAssetOptions, setBridgeAssetOptions] = useState<any[]>([]);
    const [bridgeTargetAssets, setBridgeTargetAssets] = useState<AssetAllocation[]>([]);
    const [assetPrices, setAssetPrices] = useState<Record<string, PriceData>>({});
    const [isLoading, setIsLoading] = useState(false);

    // Network switching states
    const [isSwitchingNetwork, setIsSwitchingNetwork] = useState<boolean>(false);
    const [lastSwitchedChain, setLastSwitchedChain] = useState<string>('');
    const [shownToasts, setShownToasts] = useState<Set<string>>(new Set());

    const { address } = useAccount();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();
    const { showToast } = useToast();

    // Chain options for dropdown
    const chainOptions = [
        { value: sepolia.id.toString(), label: 'Ethereum Sepolia', icon: 'ETH', description: 'Layer 1 - High Security'},
        { value: bscTestnet.id.toString(), label: 'BNB Testnet', icon: 'BNB', description: 'Binance Smart Chain'}
    ];

    // Toast utility function
    const showToastOnce = (message: string, type: 'success' | 'error' | 'warning' | 'info', options?: any) => {
        const timestamp = Date.now();
        const toastId = `${type}-${message}-${timestamp}`;
        
        if (!shownToasts.has(toastId)) {
            showToast(message, type, options);
            setShownToasts(prev => new Set(prev).add(toastId));
            
            setTimeout(() => {
                setShownToasts(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(toastId);
                    return newSet;
                });
            }, 5000);
        }
    };

    // Filter assets based on chain logic
    const filterAssetsByChain = (chainId: number, assets: any[]) => {
        return assets.filter(pool => {
            if (chainId === sepolia.id) {
                return pool.name.toUpperCase() !== 'BNB';
            } else if (chainId === bscTestnet.id) {
                return pool.name.toUpperCase() !== 'ETH';
            }
            return true;
        });
    };

    // Fetch asset prices
    useEffect(() => {
        async function loadAssetPrices() {
            const pricePromises = poolList.map(async (pool) => {
                const token = pool.address;
                return getAssetPriceFromPort(token, pool.chainId).then(price => ({ token, price }));
            });
            const results = await Promise.all(pricePromises);
            
            const prices = results.reduce((acc, { token, price }) => {
                if (price) {
                    acc[token] = price;
                }
                return acc;
            }, {} as Record<string, PriceData>);
            
            setAssetPrices(prices);
        }
        loadAssetPrices();
    }, [bridgeSourceChain]);

    // Fetch bridge asset options
    async function fetchBridgePools(chainId: any) {
        const numericChainId = typeof chainId === 'string' ? parseInt(chainId) : chainId;
        
        const filteredBridgePools = filterAssetsByChain(numericChainId, poolList.filter(pool => {
            return pool.chainId === numericChainId;
        }));
        
        const bridgeAssetsPromises = filteredBridgePools.map(async (pool) => {
            let balance = null;
            if (address) {
                try {
                    const isNative = pool.name.toUpperCase() === 'ETH' || pool.name.toUpperCase() === 'BNB';
                    balance = await getUserAssetBalance(
                        pool.address, 
                        address, 
                        pool.chainId,
                        isNative
                    );
                } catch (error) {
                    balance = null;
                }
            }
            
            return {
                value: pool.id,
                label: pool.name,
                icon: pool.name.toUpperCase(),
                balance: balance,
                token: pool.address,
                amount: balance ? formatUnits(balance, 18) : '0',
                description: `${pool.name} - Available: ${balance ? formatUnits(balance, 18).slice(0, 6) : '0'}`
            };
        });
        
        const resolvedBridgeAssets = await Promise.all(bridgeAssetsPromises);
        const uniqueBridgeAssets = resolvedBridgeAssets.filter((asset, index, self) => 
            index === self.findIndex(a => a.label === asset.label)
        );
        
        if (uniqueBridgeAssets.length > 0) {
            setBridgeAsset(uniqueBridgeAssets[0]);
            setBridgeAssetOptions(uniqueBridgeAssets);
        } else {
            setBridgeAssetOptions([]);
            setBridgeAsset(null);
        }
    }

    // Handle network switching
    useEffect(() => {
        const handleBridgeNetworkSwitch = async () => {
            if (address && bridgeSourceChain && !isSwitchingNetwork) {
                const targetChainId = parseInt(bridgeSourceChain);
                
                if (chainId !== targetChainId && lastSwitchedChain !== bridgeSourceChain) {
                    setIsSwitchingNetwork(true);
                    try {
                        await switchChain({ chainId: targetChainId as 11155111 | 97 });
                        setLastSwitchedChain(bridgeSourceChain);
                        
                        setTimeout(() => {
                            showToastOnce(`Switched to ${getChainName(bridgeSourceChain)}`, 'success');
                        }, 100);
                        
                        setTimeout(() => {
                            setLastSwitchedChain('');
                        }, 3000);
                    } catch (error: any) {
                        console.error('Failed to switch bridge network:', error);
                        if (error?.code === 4001) {
                            showToastOnce('Network switch cancelled by user', 'warning');
                        } else {
                            showToastOnce('Failed to switch network. Please switch manually in your wallet.', 'error');
                        }
                    } finally {
                        setTimeout(() => setIsSwitchingNetwork(false), 500);
                    }
                }
            }
        };

        fetchBridgePools(bridgeSourceChain);
        handleBridgeNetworkSwitch();
    }, [bridgeSourceChain, address, chainId]);

    // Utility functions
    const getChainName = (chainId: string) => {
        return chainId === sepolia.id.toString() ? 'Ethereum Sepolia' : 'BNB Testnet';
    };

    const handleMaxBridge = () => {
        if (bridgeAsset?.balance) {
            const maxAmount = formatUnits(bridgeAsset.balance, 18);
            setBridgeAmount(parseFloat(maxAmount).toFixed(6));
        }
    };

    const handleBridgeTargetAssetsChange = (assets: AssetAllocation[]) => {
        setBridgeTargetAssets(assets);
    };

    const handleBridgeSourceAssetsChange = (assetId: string) => {
        const selectedAsset = bridgeAssetOptions.find(asset => asset.value === assetId);
        setBridgeAsset(selectedAsset);
    };

    // Handle bridge execution
    const handleBridge = async () => {
        if (!address) {
            showToastOnce('Please connect your wallet', 'error');
            return;
        }

        if (!bridgeAmount || parseFloat(bridgeAmount) <= 0) {
            showToastOnce('Please enter a valid bridge amount', 'error');
            return;
        }

        if (!bridgeTargetChain) {
            showToastOnce('Please select target chain', 'error');
            return;
        }

        if (bridgeTargetAssets.length === 0) {
            showToastOnce('Please select target assets', 'error');
            return;
        }

        setIsLoading(true);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Cross-Chain Bridge" size="large">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Step 1: Select Source Chain */}
                <div className="glass-card" style={{ padding: '20px' }}>
                    <h3 style={{ 
                        margin: '0 0 16px 0', 
                        fontSize: '18px', 
                        fontWeight: 600, 
                        color: 'var(--text-color)' 
                    }}>
                        Step 1: Select Source Chain
                    </h3>
                    <ImprovedNetworkSelector
                        label="Source Chain"
                        value={bridgeSourceChain}
                        onChange={setBridgeSourceChain}
                        options={chainOptions}
                        description="Choose the network where your assets are located"
                    />
                </div>

                {/* Step 2: Choose Source Asset and Amount */}
                <div className="glass-card" style={{ padding: '20px' }}>
                    <h3 style={{ 
                        margin: '0 0 16px 0', 
                        fontSize: '18px', 
                        fontWeight: 600, 
                        color: 'var(--text-color)' 
                    }}>
                        Step 2: Choose Asset & Amount to Bridge
                    </h3>
                    
                    {/* Asset Selection */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ 
                            display: 'block', 
                            marginBottom: '8px', 
                            fontWeight: 500, 
                            color: 'var(--text-color)' 
                        }}>
                            Source Asset
                        </label>
                        <select
                            value={bridgeAsset?.value || ''}
                            onChange={(e) => handleBridgeSourceAssetsChange(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '12px',
                                border: '2px solid rgba(0, 0, 0, 0.1)',
                                background: 'rgba(255, 255, 255, 0.8)',
                                fontSize: '16px',
                                color: 'var(--text-color)'
                            }}
                        >
                            {bridgeAssetOptions.map((asset) => (
                                <option key={asset.value} value={asset.value}>
                                    {asset.label} - Available: {parseFloat(asset.amount).toFixed(6)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Amount Input */}
                    <div>
                        <label style={{ 
                            display: 'block', 
                            marginBottom: '8px', 
                            fontWeight: 500, 
                            color: 'var(--text-color)' 
                        }}>
                            Bridge Amount
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="number"
                                value={bridgeAmount}
                                onChange={(e) => setBridgeAmount(e.target.value)}
                                placeholder="0.0"
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: '2px solid rgba(0, 0, 0, 0.1)',
                                    background: 'rgba(255, 255, 255, 0.8)',
                                    fontSize: '16px',
                                    color: 'var(--text-color)'
                                }}
                            />
                            <button
                                onClick={handleMaxBridge}
                                className="button secondary compact"
                                style={{ whiteSpace: 'nowrap' }}
                            >
                                MAX
                            </button>
                        </div>
                        
                        {bridgeAsset && bridgeAmount && (
                            <div style={{ 
                                marginTop: '8px', 
                                fontSize: '14px', 
                                color: 'var(--secondary-text)' 
                            }}>
                                ≈ ${((parseFloat(bridgeAmount) || 0) * (assetPrices[bridgeAsset.token]?.price || 1)).toFixed(2)} USD
                            </div>
                        )}
                    </div>
                </div>

                {/* Step 3: Select Target Chain and Assets */}
                <div className="glass-card" style={{ padding: '20px' }}>
                    <h3 style={{ 
                        margin: '0 0 16px 0', 
                        fontSize: '18px', 
                        fontWeight: 600, 
                        color: 'var(--text-color)' 
                    }}>
                        Step 3: Select Destination
                    </h3>
                    
                    {/* Target Chain Selection */}
                    <div style={{ marginBottom: '16px' }}>
                        <ImprovedNetworkSelector
                            label="Target Chain"
                            value={bridgeTargetChain}
                            onChange={setBridgeTargetChain}
                            options={chainOptions.filter(option => option.value !== bridgeSourceChain)}
                            description="Choose the destination network"
                        />
                    </div>

                    {/* Target Assets Selection */}
                    {bridgeTargetChain && (
                        <div>
                            <label style={{ 
                                display: 'block', 
                                marginBottom: '8px', 
                                fontWeight: 500, 
                                color: 'var(--text-color)' 
                            }}>
                                Target Assets Distribution
                            </label>
                            <CrossChainAssetSelector
                                selectedAssets={bridgeTargetAssets}
                                onAssetsChange={handleBridgeTargetAssetsChange}
                                assetPrices={assetPrices}
                                maxBorrowValue={parseFloat(bridgeAmount) * (assetPrices[bridgeAsset?.token]?.price || 1)}
                                sourceChain={bridgeTargetChain}
                            />
                        </div>
                    )}
                </div>

                {/* Bridge Summary */}
                {bridgeAmount && bridgeTargetAssets.length > 0 && (
                    <div className="glass-card" style={{ padding: '20px' }}>
                        <h3 style={{ 
                            margin: '0 0 16px 0', 
                            fontSize: '18px', 
                            fontWeight: 600, 
                            color: 'var(--text-color)' 
                        }}>
                            Bridge Summary
                        </h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <div style={{ fontSize: '14px', color: 'var(--secondary-text)', marginBottom: '4px' }}>
                                    From: {getChainName(bridgeSourceChain)}
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 600, color: '#ef4444' }}>
                                    -{bridgeAmount} {bridgeAsset?.label}
                                </div>
                            </div>
                            
                            <div>
                                <div style={{ fontSize: '14px', color: 'var(--secondary-text)', marginBottom: '4px' }}>
                                    To: {getChainName(bridgeTargetChain)}
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 600, color: '#22c55e' }}>
                                    +{bridgeTargetAssets.reduce((sum, asset) => sum + asset.amount, 0).toFixed(6)} Assets
                                </div>
                            </div>
                        </div>
                        
                        <div style={{
                            marginTop: '16px',
                            padding: '12px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: '8px',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            color: '#3b82f6',
                            fontSize: '14px'
                        }}>
                            ℹ️ Bridge transactions typically take 5-10 minutes to complete across chains.
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        className="button secondary"
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleBridge}
                        className="button primary"
                        disabled={isLoading || !bridgeAmount || !bridgeTargetChain || bridgeTargetAssets.length === 0}
                        style={{ minWidth: '120px' }}
                    >
                        {isLoading ? 'Processing...' : 'Bridge Assets'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default BridgeModal; 
 
 