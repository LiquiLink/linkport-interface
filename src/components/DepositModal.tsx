import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import ImprovedNetworkSelector from './ImprovedNetworkSelector';
import MultiAssetSelector from './MultiAssetSelector';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { bscTestnet, sepolia } from 'wagmi/chains';
import { poolList } from '../config';
import { getUserAssetBalance } from '../utils/balance';
import { getUserPosition } from '../utils/pool';
import { formatUnits } from 'ethers';
import { Asset, AssetAllocation } from '../utils/types';
import { getAssetPriceFromPort, PriceData } from '../utils/priceService';
import { loan } from '@/utils/pool';
import { useToast } from './Toast';
import { getTokenIconStyle } from '../utils/ui';

interface DepositModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

interface StakingPosition {
    token: string;
    poolId: string;
    amount: string;
    value: number;
    apy: string;
}

const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose, onSuccess }) => {
    // Core states
    const [collateralAmount, setCollateralAmount] = useState('');
    const [sourceChain, setSourceChain] = useState<string>(sepolia.id.toString());
    const [assetOptions, setAssetOptions] = useState<any[]>([]);
    const [collateralAsset, setCollateralAsset] = useState<any>(null);
    const [selectedAssets, setSelectedAssets] = useState<AssetAllocation[]>([]);
    const [userStakingPositions, setUserStakingPositions] = useState<StakingPosition[]>([]);
    const [useExistingStaking, setUseExistingStaking] = useState<boolean>(false);
    const [totalStakingValue, setTotalStakingValue] = useState<number>(0);
    const [assetPrices, setAssetPrices] = useState<Record<string, PriceData>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isManualInput, setIsManualInput] = useState<boolean>(false);

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
    }, [sourceChain]);

    // Fetch user staking positions
    async function fetchUserStakingPositions(chainId: any) {
        if (!address) {
            setUserStakingPositions([]);
            setTotalStakingValue(0);
            return;
        }

        const numericChainId = typeof chainId === 'string' ? parseInt(chainId) : chainId;
        
        try {
            const stakingPositions: StakingPosition[] = [];
            let totalValue = 0;

            const chainPools = poolList.filter(pool => pool.chainId === numericChainId);
            
            for (const pool of chainPools) {
                try {
                    const userPositionWei = await getUserPosition(pool, address);
                    const userPositionAmount = userPositionWei ? formatUnits(userPositionWei, 18) : '0';
                    const userPositionValue = parseFloat(userPositionAmount);
                    
                    if (userPositionValue > 0) {
                        const priceData = assetPrices[pool.address];
                        const assetPrice = priceData?.price || 1;
                        const assetUSDValue = userPositionValue * assetPrice;
                        
                        stakingPositions.push({
                            token: pool.name,
                            poolId: pool.id,
                            amount: userPositionValue.toString(),
                            value: assetUSDValue,
                            apy: pool.apy
                        });
                        
                        totalValue += assetUSDValue;
                    }
                } catch (error) {
                    console.error(`Failed to get staking position for ${pool.name}:`, error);
                }
            }
            
            setUserStakingPositions(stakingPositions);
            setTotalStakingValue(totalValue);
            
        } catch (error) {
            console.error("Failed to fetch user staking positions:", error);
            setUserStakingPositions([]);
            setTotalStakingValue(0);
        }
    }

    // Fetch pools for collateral
    async function fetchPools(chainId: any) {
        const numericChainId = typeof chainId === 'string' ? parseInt(chainId) : chainId;
        
        const filteredPools = filterAssetsByChain(numericChainId, poolList.filter(pool => {
            return pool.chainId === numericChainId;
        }));
        
        const sourceAssetsPromises = filteredPools.map(async (pool) => {
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
                token: pool.address,
                balance: balance,
                amount: balance ? formatUnits(balance, 18) : '0',
                description: `${pool.name} - Available: ${balance ? formatUnits(balance, 18).slice(0, 6) : '0'}`
            };
        });
        
        const resolvedAssets = await Promise.all(sourceAssetsPromises);
        const uniqueAssets = resolvedAssets.filter((asset, index, self) => 
            index === self.findIndex(a => a.label === asset.label)
        );
        
        if (uniqueAssets.length > 0) {
            setCollateralAsset(uniqueAssets[0]);
            setAssetOptions(uniqueAssets);
        } else {
            setAssetOptions([]);
            setCollateralAsset(null);
        }
    }

    // Handle network switching with user confirmation
    useEffect(() => {
        fetchPools(sourceChain);
        
        // Show network switch suggestion instead of auto-switching
        if (address && sourceChain && chainId && !isSwitchingNetwork) {
            const targetChainId = parseInt(sourceChain);
            if (chainId !== targetChainId && lastSwitchedChain !== sourceChain) {
                // Only show a toast notification, don't auto-switch
                showToastOnce(
                    `Selected chain: ${getChainName(sourceChain)}. Current wallet chain: ${getChainName(chainId.toString())}. You may need to switch manually.`, 
                    'info'
                );
                setLastSwitchedChain(sourceChain);
                
                setTimeout(() => {
                    setLastSwitchedChain('');
                }, 5000);
            }
        }
    }, [sourceChain, address, chainId]);

    // Fetch staking positions when sourceChain changes
    useEffect(() => {
        fetchUserStakingPositions(sourceChain);
    }, [sourceChain, address, assetPrices]);

    // Auto-calculate collateral amount
    useEffect(() => {
        const shouldAutoCalculate = !isManualInput || collateralAmount === '';
        
        if (selectedAssets.length > 0 && collateralAsset && shouldAutoCalculate) {
            const totalBorrowValue = selectedAssets.reduce((sum, asset) => sum + asset.value, 0);
            
            if (totalBorrowValue > 0) {
                const requiredTotalCollateralValue = totalBorrowValue / 0.75;
                const existingStakingValue = useExistingStaking ? totalStakingValue : 0;
                const requiredNewCollateralValue = Math.max(0, requiredTotalCollateralValue - existingStakingValue);
                
                const assetPrice = assetPrices[collateralAsset.token]?.price || 2400;
                const requiredCollateralAmount = requiredNewCollateralValue / assetPrice;
                
                setCollateralAmount(requiredCollateralAmount.toFixed(6));
            }
        }
    }, [useExistingStaking, totalStakingValue, selectedAssets, collateralAsset, assetPrices, isManualInput, collateralAmount]);

    // Utility functions
    const getChainName = (chainId: string) => {
        return chainId === sepolia.id.toString() ? 'Ethereum Sepolia' : 'BNB Testnet';
    };

    const calculateTotalCollateralValue = () => {
        const newCollateralValue = parseFloat(collateralAmount) || 0;
        const assetPrice = collateralAsset ? (assetPrices[collateralAsset.token]?.price || 2400) : 2400;
        const newCollateralUSDValue = newCollateralValue * assetPrice;
        const stakingValue = useExistingStaking ? totalStakingValue : 0;
        return newCollateralUSDValue + stakingValue;
    };

    const calculateHealthFactor = () => {
        const totalCollateralValue = calculateTotalCollateralValue();
        const totalBorrowValue = selectedAssets.reduce((sum, asset) => sum + asset.value, 0);
        
        if (totalBorrowValue === 0) return 999;
        return (totalCollateralValue * 0.75) / totalBorrowValue;
    };

    const handleAssetsChange = (assets: AssetAllocation[]) => {
        setSelectedAssets(assets);
        if (assets.length === 0) {
            setIsManualInput(false);
        }
    };

    const handleCollateralAmountChange = (value: string) => {
        setCollateralAmount(value);
        setIsManualInput(value !== '');
    };

    const handleMaxCollateral = () => {
        if (collateralAsset?.balance) {
            const maxAmount = formatUnits(collateralAsset.balance, 18);
            setCollateralAmount(parseFloat(maxAmount).toFixed(6));
            setIsManualInput(true);
        }
    };

    // Handle deposit execution
    const handleDeposit = async () => {
        if (!address) {
            showToastOnce('Please connect your wallet', 'error');
            return;
        }

        if (!collateralAmount || parseFloat(collateralAmount) <= 0) {
            showToastOnce('Please enter a valid collateral amount', 'error');
            return;
        }

        if (selectedAssets.length === 0) {
            showToastOnce('Please select assets to borrow', 'error');
            return;
        }

        const healthFactor = calculateHealthFactor();
        if (healthFactor < 1.2) {
            showToastOnce('Health factor too low. Reduce borrow amount or increase collateral.', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const collateralPool = poolList.find(pool => pool.id === collateralAsset.value);
            if (!collateralPool) {
                throw new Error('Collateral pool not found');
            }

            const result = await loan(
                collateralPool,
                collateralAmount,
                selectedAssets,
                useExistingStaking ? userStakingPositions : []
            );

            if (result.success) {
                showToastOnce('Deposit and borrowing completed successfully!', 'success');
                
                // Reset form
                setTimeout(() => {
                    setCollateralAmount('');
                    setSelectedAssets([]);
                    setUseExistingStaking(false);
                    fetchUserStakingPositions(sourceChain);
                    fetchPools(sourceChain);
                    onSuccess?.();
                    onClose();
                }, 2000);
            } else {
                throw new Error(result.error || 'Transaction failed');
            }
        } catch (error: any) {
            console.error('Deposit failed:', error);
            showToastOnce(error.message || 'Deposit failed. Please try again.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const healthFactor = calculateHealthFactor();
    const totalCollateralValue = calculateTotalCollateralValue();
    const totalBorrowValue = selectedAssets.reduce((sum, asset) => sum + asset.value, 0);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Deposit & Borrow" size="large">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Step 1: Select Collateral Source Chain */}
                <div className="glass-card" style={{ padding: '20px' }}>
                    <h3 style={{ 
                        margin: '0 0 16px 0', 
                        fontSize: '18px', 
                        fontWeight: 600, 
                        color: 'var(--text-color)' 
                    }}>
                        Step 1: Select Collateral Source Chain
                    </h3>
                    <ImprovedNetworkSelector
                        value={sourceChain}
                        onChange={setSourceChain}
                        options={chainOptions}
                        description="Choose the network where your collateral is located"
                    />
                    
                    {/* Network Switch Helper */}
                    {address && sourceChain && chainId && parseInt(sourceChain) !== chainId && (
                        <div style={{
                            marginTop: '12px',
                            padding: '12px',
                            background: 'rgba(245, 158, 11, 0.1)',
                            borderRadius: '8px',
                            border: '1px solid rgba(245, 158, 11, 0.3)'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        color: '#d97706',
                                        marginBottom: '4px'
                                    }}>
                                        Network Mismatch
                                    </div>
                                    <div style={{
                                        fontSize: '13px',
                                        color: 'var(--secondary-text)',
                                        lineHeight: 1.4
                                    }}>
                                        Your wallet is on {getChainName(chainId.toString())}, but you selected {getChainName(sourceChain)}. 
                                        Switch networks to deposit collateral.
                                    </div>
                                </div>
                                <button
                                    onClick={async () => {
                                        setIsSwitchingNetwork(true);
                                        try {
                                            await switchChain({ chainId: parseInt(sourceChain) as 11155111 | 97 });
                                            showToastOnce(`Switched to ${getChainName(sourceChain)}`, 'success');
                                        } catch (error: any) {
                                            console.error('Failed to switch network:', error);
                                            if (error?.code === 4001) {
                                                showToastOnce('Network switch cancelled', 'warning');
                                            } else {
                                                showToastOnce('Failed to switch network', 'error');
                                            }
                                        } finally {
                                            setIsSwitchingNetwork(false);
                                        }
                                    }}
                                    disabled={isSwitchingNetwork}
                                    className="button primary compact"
                                    style={{
                                        minWidth: '80px',
                                        fontSize: '13px',
                                        padding: '8px 12px'
                                    }}
                                >
                                    {isSwitchingNetwork ? 'Switching...' : 'Switch'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Step 2: Choose Collateral Asset and Amount */}
                <div className="glass-card" style={{ padding: '20px' }}>
                    <h3 style={{ 
                        margin: '0 0 16px 0', 
                        fontSize: '18px', 
                        fontWeight: 600, 
                        color: 'var(--text-color)' 
                    }}>
                        Step 2: Choose Collateral Asset & Amount
                    </h3>
                    
                    {/* Asset Selection */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ 
                            display: 'block', 
                            marginBottom: '8px', 
                            fontWeight: 500, 
                            color: 'var(--text-color)' 
                        }}>
                            Collateral Asset
                        </label>
                        <select
                            value={collateralAsset?.value || ''}
                            onChange={(e) => {
                                const selected = assetOptions.find(asset => asset.value === e.target.value);
                                setCollateralAsset(selected);
                            }}
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
                            {assetOptions.map((asset) => (
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
                            Collateral Amount
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="number"
                                value={collateralAmount}
                                onChange={(e) => handleCollateralAmountChange(e.target.value)}
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
                                onClick={handleMaxCollateral}
                                className="button secondary compact"
                                style={{ whiteSpace: 'nowrap' }}
                            >
                                MAX
                            </button>
                        </div>
                        
                        {collateralAsset && collateralAmount && (
                            <div style={{ 
                                marginTop: '8px', 
                                fontSize: '14px', 
                                color: 'var(--secondary-text)' 
                            }}>
                                ≈ ${((parseFloat(collateralAmount) || 0) * (assetPrices[collateralAsset.token]?.price || 2400)).toFixed(2)} USD
                            </div>
                        )}
                    </div>
                </div>

                {/* Step 3: Existing Staking Positions (if any) */}
                {userStakingPositions.length > 0 && (
                    <div className="glass-card" style={{ padding: '20px' }}>
                        <h3 style={{ 
                            margin: '0 0 16px 0', 
                            fontSize: '18px', 
                            fontWeight: 600, 
                            color: 'var(--text-color)' 
                        }}>
                            Your Staking Positions
                        </h3>
                        
                        <div style={{ marginBottom: '16px' }}>
                            {userStakingPositions.map((position, index) => (
                                <div key={index} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px',
                                    background: 'rgba(255, 255, 255, 0.6)',
                                    borderRadius: '8px',
                                    marginBottom: '8px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={getTokenIconStyle(position.token)}>{position.token}</div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '14px' }}>
                                                {position.token}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                                                APY: {position.apy}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 600, fontSize: '14px' }}>
                                            {parseFloat(position.amount).toFixed(4)}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                                            ${position.value.toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500
                        }}>
                            <input
                                type="checkbox"
                                checked={useExistingStaking}
                                onChange={(e) => setUseExistingStaking(e.target.checked)}
                                style={{ marginRight: '4px' }}
                            />
                            Use as additional collateral (Total: ${totalStakingValue.toFixed(2)})
                        </label>
                    </div>
                )}

                {/* Step 4: Select Borrowing Assets */}
                <div className="glass-card" style={{ padding: '20px' }}>
                    <h3 style={{ 
                        margin: '0 0 16px 0', 
                        fontSize: '18px', 
                        fontWeight: 600, 
                        color: 'var(--text-color)' 
                    }}>
                        Step 3: Select Assets to Borrow
                    </h3>
                    <MultiAssetSelector
                        selectedAssets={selectedAssets}
                        onAssetsChange={handleAssetsChange}
                        assetPrices={assetPrices}
                        maxBorrowValue={(totalCollateralValue * 0.75)}
                        sourceChain={sourceChain}
                    />
                </div>

                {/* Risk Summary */}
                {(totalCollateralValue > 0 || totalBorrowValue > 0) && (
                    <div className="glass-card" style={{ padding: '20px' }}>
                        <h3 style={{ 
                            margin: '0 0 16px 0', 
                            fontSize: '18px', 
                            fontWeight: 600, 
                            color: 'var(--text-color)' 
                        }}>
                            Risk Summary
                        </h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '14px', color: 'var(--secondary-text)', marginBottom: '4px' }}>
                                    Total Collateral
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 600, color: '#22c55e' }}>
                                    ${totalCollateralValue.toFixed(2)}
                                </div>
                            </div>
                            
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '14px', color: 'var(--secondary-text)', marginBottom: '4px' }}>
                                    Total Borrow
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 600, color: '#3b82f6' }}>
                                    ${totalBorrowValue.toFixed(2)}
                                </div>
                            </div>
                            
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '14px', color: 'var(--secondary-text)', marginBottom: '4px' }}>
                                    Health Factor
                                </div>
                                <div style={{ 
                                    fontSize: '18px', 
                                    fontWeight: 600, 
                                    color: healthFactor >= 1.5 ? '#22c55e' : healthFactor >= 1.2 ? '#f59e0b' : '#ef4444'
                                }}>
                                    {healthFactor >= 999 ? '∞' : healthFactor.toFixed(2)}
                                </div>
                            </div>
                        </div>
                        
                        {healthFactor < 1.2 && healthFactor < 999 && (
                            <div style={{
                                marginTop: '16px',
                                padding: '12px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                borderRadius: '8px',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                color: '#dc2626',
                                fontSize: '14px'
                            }}>
                                ⚠️ Warning: Health factor is too low. Your position may be liquidated. 
                                Please reduce borrow amount or increase collateral.
                            </div>
                        )}
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
                        onClick={handleDeposit}
                        className="button primary"
                        disabled={isLoading || !collateralAmount || selectedAssets.length === 0 || healthFactor < 1.2}
                        style={{ minWidth: '120px' }}
                    >
                        {isLoading ? 'Processing...' : 'Deposit & Borrow'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default DepositModal; 
 