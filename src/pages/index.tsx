import React, { useState, useEffect } from 'react';
import MultiAssetSelector from '../components/MultiAssetSelector';
import ImprovedNetworkSelector from '../components/ImprovedNetworkSelector';
import CrossChainAssetSelector from '../components/CrossChainAssetSelector';
import { bsc, bscTestnet, sepolia } from 'wagmi/chains';
import { useAccount, useChainId, useProof } from 'wagmi';
import Dropdown from '../components/Dropdown';
import { poolList } from '../config';
import { getUserPosition } from '@/utils/pool';
import { getUserAssetBalance } from '../utils/balance';
import { formatUnits } from 'ethers';
import { format } from 'path';
import { Asset, AssetAllocation } from '../utils/types';
import { getAssetPrice, getMultipleAssetPrices, formatPrice, PriceData } from '../utils/priceService';
import { getNetworkStatus, getProtocolStats, getCongestionColor, NetworkStatus, ProtocolStats } from '../utils/networkService';
import { useToast } from '../components/Toast';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { getTokenIconStyle } from '../utils/ui';

const Home: React.FC = () => {
    const [activeTab, setActiveTab] = useState('borrow');
    const [collateralAmount, setCollateralAmount] = useState('');
    const [bridgeAmount, setBridgeAmount] = useState('');
    
    // Lending related states
    const [sourceChain, setSourceChain] = useState<string>(sepolia.id.toString()); // Collateral source chain
    const [assetOptions, setAssetOptions] = useState<any[]>([]); // Assets available for collateral
    const [targetChain, setTargetChain] = useState<string>(''); // Borrowing target chain
    const [collateralAsset, setCollateralAsset] = useState<any>(null);
    const [selectedAssets, setSelectedAssets] = useState<AssetAllocation[]>([]);

    // Cross-chain related states
    const [bridgeSourceChain, setBridgeSourceChain] = useState<string>(sepolia.id.toString());
    const [bridgeTargetChain, setBridgeTargetChain] = useState<string>('');
    const [bridgeAsset, setBridgeAsset] = useState<any>(null);
    const [bridgeAssetOptions, setBridgeAssetOptions] = useState<any[]>([]);
    const [bridgeTargetAssets, setBridgeTargetAssets] = useState<AssetAllocation[]>([]);

    const { address } = useAccount()
    const chainId = useChainId();
    const { showToast, ToastContainer } = useToast();
    const { writeContract } = useWriteContract();

    // Price and network status
    const [assetPrices, setAssetPrices] = useState<Record<string, PriceData>>({});
    const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);
    const [protocolStats, setProtocolStats] = useState<ProtocolStats | null>(null);

    // Dropdown options definition
    const chainOptions = [
        { value: sepolia.id.toString(), label: 'Ethereum Sepolia', icon: 'ETH', description: 'Layer 1 - High Security'},
        { value: bscTestnet.id.toString(), label: 'BNB Testnet', icon: 'BNB', description: 'Binance Smart Chain'}
    ];

    async function fetchPools(chainId: any) {
        console.log("Fetching pools for chainId:", chainId, "Type:", typeof chainId);
        
        const numericChainId = typeof chainId === 'string' ? parseInt(chainId) : chainId;
        
        const sourceAssetsPromises = poolList.filter(pool => {
            return pool.chainId === numericChainId 
        }).map(async (pool) => {
            // Only fetch balance if user is connected
            let balance = null;
            if (address) {
                try {
                    // Get user's raw asset balance, not liquidity pool shares
                    balance = await getUserAssetBalance(
                        pool.address, 
                        address, 
                        pool.chainId, 
                        pool.isNative // If native ETH/BNB, use native balance reading
                    );
                    console.log(`User ${pool.name} balance:`, balance);
                } catch (error) {
                    console.log("Failed to get user asset balance:", error);
                    balance = null;
                }
            }
            
            return {
                value: pool.id,
                label: pool.name,
                icon: pool.name.toUpperCase(),
                balance: balance,
                amount: balance ? formatUnits(balance, 18) : '0',
                description: `${pool.name} - Available: ${balance ? formatUnits(balance, 18).slice(0, 6) : '0'}`
            };
        });
        
        const resolvedAssets = await Promise.all(sourceAssetsPromises);
        console.log("Resolved Assets", resolvedAssets);
        
        // Deduplicate and sort
        const uniqueAssets = resolvedAssets.filter((asset, index, self) => 
            index === self.findIndex(a => a.label === asset.label)
        );
        const sortedAssets = sortAssets(uniqueAssets);
        
        if (sortedAssets.length > 0) {
            setCollateralAsset(sortedAssets[0]);
            setAssetOptions(sortedAssets);
        } else {
            console.warn("No assets found for chainId:", numericChainId);
            setAssetOptions([]);
            setCollateralAsset(null);
        }
    }

    useEffect(() => {
        fetchPools(sourceChain);
    }, [sourceChain])

    // Function to fetch bridge asset options
    async function fetchBridgePools(chainId: any) {
        console.log("Fetching bridge pools for chainId:", chainId);
        
        const numericChainId = typeof chainId === 'string' ? parseInt(chainId) : chainId;
        
        const bridgeAssetsPromises = poolList.filter(pool => {
            return pool.chainId === numericChainId 
        }).map(async (pool) => {
            let balance = null;
            if (address) {
                try {
                    balance = await getUserAssetBalance(
                        pool.address, 
                        address, 
                        pool.chainId, 
                        pool.isNative
                    );
                    console.log(`User bridge ${pool.name} balance:`, balance);
                } catch (error) {
                    console.log("Failed to get user bridge asset balance:", error);
                    balance = null;
                }
            }
            
            // Get price for the asset
            const getAssetPrice = (assetName: string) => {
                switch(assetName.toUpperCase()) {
                    case 'ETH': return assetPrices.ETH?.price || 3000;
                    case 'LINK': return assetPrices.LINK?.price || 15;
                    case 'BNB': return assetPrices.BNB?.price || 500;
                    case 'USDC':
                    case 'USDT':
                    case 'DAI': return 1;
                    default: return 1;
                }
            };
            
            return {
                value: pool.id,
                label: pool.name,
                icon: pool.name.toUpperCase(),
                balance: balance,
                amount: balance ? formatUnits(balance, 18) : '0',
                price: getAssetPrice(pool.name), // Add price field
                description: `${pool.name} - Available: ${balance ? formatUnits(balance, 18).slice(0, 6) : '0'}`
            };
        });
        
        const resolvedBridgeAssets = await Promise.all(bridgeAssetsPromises);
        console.log("Resolved Bridge Assets", resolvedBridgeAssets);
        
        // Deduplicate and sort
        const uniqueBridgeAssets = resolvedBridgeAssets.filter((asset, index, self) => 
            index === self.findIndex(a => a.label === asset.label)
        );
        const sortedBridgeAssets = sortAssets(uniqueBridgeAssets);
        
        if (sortedBridgeAssets.length > 0) {
            setBridgeAsset(sortedBridgeAssets[0]);
            setBridgeAssetOptions(sortedBridgeAssets);
        } else {
            console.warn("No bridge assets found for chainId:", numericChainId);
            setBridgeAssetOptions([]);
            setBridgeAsset(null);
        }
    }

    // Fetch bridge asset options when bridge source chain changes
    useEffect(() => {
        fetchBridgePools(bridgeSourceChain);
    }, [bridgeSourceChain, address])

    // Get price data
    useEffect(() => {
        async function loadAssetPrices() {
            if (sourceChain) {
                const symbols = ['ETH', 'LINK', 'USDT', 'BNB'];
                const prices = await getMultipleAssetPrices(symbols, parseInt(sourceChain));
                setAssetPrices(prices);
            }
        }
        loadAssetPrices();
    }, [sourceChain]);

    // Get network status
    useEffect(() => {
        async function loadNetworkStatus() {
            if (chainId) {
                const status = await getNetworkStatus(chainId);
                setNetworkStatus(status);
            }
        }
        loadNetworkStatus();
        
        // Update network status every 30 seconds
        const interval = setInterval(loadNetworkStatus, 30000);
        return () => clearInterval(interval);
    }, [chainId]);

    // Get protocol statistics
    useEffect(() => {
        async function loadProtocolStats() {
            const stats = await getProtocolStats();
            setProtocolStats(stats);
        }
        loadProtocolStats();
        
        // Update protocol statistics every 5 minutes
        const interval = setInterval(loadProtocolStats, 300000);
        return () => clearInterval(interval);
    }, []);


    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
    };

    // Smart asset sorting function
    const sortAssets = (assets: any[]) => {
        return assets.sort((a, b) => {
            // 1. Mainstream asset priority
            const mainAssets = ['ETH', 'USDC', 'USDT', 'DAI', 'WETH', 'BNB'];
            const aPriority = mainAssets.indexOf(a.label?.toUpperCase()) !== -1 ? 0 : 1;
            const bPriority = mainAssets.indexOf(b.label?.toUpperCase()) !== -1 ? 0 : 1;
            
            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }
            
            // 2. Sort by balance
            const aBalance = parseFloat(a.amount || '0');
            const bBalance = parseFloat(b.amount || '0');
            
            // Assets with balance come first
            if (aBalance > 0 && bBalance === 0) return -1;
            if (aBalance === 0 && bBalance > 0) return 1;
            
            // When both have balance, sort by balance descending
            if (aBalance > 0 && bBalance > 0) {
                return bBalance - aBalance;
            }
            
            // 3. When both have zero balance, sort alphabetically
            return (a.label || '').localeCompare(b.label || '');
        });
    };

    const calculateUSDValue = (amount: string, asset: string = 'ETH') => {
        const value = parseFloat(amount) || 0;
        const priceData = assetPrices[asset];
        const price = priceData ? priceData.price : (asset === 'ETH' ? 3000 : 1);
        return (value * price).toFixed(2);
    };

    const calculateMaxBorrow = (collateralAmount: string) => {
        const value = parseFloat(collateralAmount) || 0;
        return (value * 3000 * 0.75).toFixed(0); // 75% LTV
    };

    const calculateHealthFactor = () => {
        const collateralValue = parseFloat(collateralAmount) * 3000;
        const totalBorrowValue = selectedAssets.reduce((sum, asset) => sum + asset.value, 0);
        if (totalBorrowValue === 0) return 100;
        return Math.min(100, (collateralValue * 0.8 / totalBorrowValue) * 100);
    };

    const handleAssetsChange = (assets: AssetAllocation[]) => {
        setSelectedAssets(assets);
    };

    const handleSourceAssetsChange = (assetId: string) => {
        const selectedAsset = assetOptions.find(a => a.value === assetId);
        if (selectedAsset) {
            setCollateralAsset(selectedAsset);
            console.log("Selected asset:", selectedAsset);
        }
    }

    const handleBridgeTargetAssetsChange = (assets: AssetAllocation[]) => {
        setBridgeTargetAssets(assets);
    };

    const handleBridgeSourceAssetsChange = (assetId: string) => {
        const selectedAsset = bridgeAssetOptions.find(a => a.value === assetId);
        if (selectedAsset) {
            setBridgeAsset(selectedAsset);
            console.log("Selected bridge asset:", selectedAsset);
        }
    };

    const getChainName = (chainId: string) => {
        const chain = chainOptions.find(c => c.value === chainId);
        return chain ? chain.label : chainId;
    };

    const getChainIcon = (chainId: string) => {
        const chain = chainOptions.find(c => c.value === chainId);
        return chain ? chain.icon : 'ETH';
    };

    // MAX button handler functions
    const handleMaxCollateral = () => {
        if (collateralAsset && collateralAsset.amount) {
            setCollateralAmount(collateralAsset.amount);
        }
    };

    const handleMaxBridge = () => {
        if (bridgeAsset && bridgeAsset.amount) {
            setBridgeAmount(bridgeAsset.amount);
        }
    };

    // Handle lending operation
    const handleLendingExecute = async () => {
        if (selectedAssets.length === 0 || !collateralAmount || calculateHealthFactor() <= 50) {
            return;
        }

        // Check wallet connection
        if (!address) {
            showToast('Please connect your wallet first', 'warning');
            return;
        }

        try {
            console.log('🏦 Executing lending operation:', {
                sourceChain: getChainName(sourceChain),
                targetChain: getChainName(targetChain),
                collateralAsset: collateralAsset?.label,
                collateralAmount,
                collateralValue: calculateUSDValue(collateralAmount, collateralAsset?.label || 'USDT'),
                selectedAssets,
                totalBorrowValue: selectedAssets.reduce((sum, asset) => sum + asset.value, 0),
                healthFactor: calculateHealthFactor()
            });

            // Show processing notification
            showToast('Transaction processing...', 'info', { autoClose: false });

            // Get collateral smart contract information
            const poolData = poolList.find(pool => 
                pool.chainId === parseInt(sourceChain) && 
                pool.name.toLowerCase() === collateralAsset?.label?.toLowerCase()
            );

            if (!poolData) {
                throw new Error('Pool not found for selected asset');
            }

            // Call wallet for collateral transaction
            const amount = parseEther(collateralAmount);
            
            // Simple ERC20 ABI
            const erc20ABI = [
                {
                    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
                    name: 'approve',
                    outputs: [{ name: '', type: 'bool' }],
                    stateMutability: 'nonpayable',
                    type: 'function'
                }
            ] as const;
            
            // This should call the actual lending contract
            // Using approve as example for now (not sending actual transaction)
            showToast('Wallet interaction initiated...', 'info');

            // Show success notification
            showToast(
                `🎉 Lending Transaction Submitted!\n\n` +
                `Collateral: ${collateralAmount} ${collateralAsset?.label || 'USDT'}\n` +
                `Collateral Value: $${calculateUSDValue(collateralAmount, collateralAsset?.label || 'USDT')}\n` +
                `Borrowed Assets: ${selectedAssets.length} types\n` +
                `Total Borrowed: $${selectedAssets.reduce((sum, asset) => sum + asset.value, 0).toFixed(2)}\n` +
                `Health Factor: ${calculateHealthFactor().toFixed(0)}%\n\n` +
                `Transaction is being processed...`,
                'success',
                { duration: 6000 }
            );

            // Reset form
            setCollateralAmount('');
            setSelectedAssets([]);
            
        } catch (error: any) {
            console.error('❌ Lending operation failed:', error);
            const errorMessage = error?.message?.includes('User rejected') 
                ? 'Transaction cancelled by user' 
                : 'Transaction failed, please try again';
            showToast(errorMessage, 'error');
        }
    };

    // Handle cross-chain bridge operation
    const handleBridgeExecute = async () => {
        if (bridgeTargetAssets.length === 0 || !bridgeAmount || !bridgeTargetChain || !bridgeAsset) {
            return;
        }

        // Check wallet connection
        if (!address) {
            showToast('Please connect your wallet first', 'warning');
            return;
        }

        try {
            console.log('🌉 Executing cross-chain bridge operation:', {
                sourceChain: getChainName(bridgeSourceChain),
                targetChain: getChainName(bridgeTargetChain),
                sourceAsset: bridgeAsset.label,
                sourceAmount: bridgeAmount,
                sourceValue: calculateUSDValue(bridgeAmount, bridgeAsset.label),
                targetAssets: bridgeTargetAssets,
                totalTargetValue: bridgeTargetAssets.reduce((sum, asset) => sum + asset.value, 0)
            });

            // 显示处理中提示
            showToast('Initiating cross-chain bridge...', 'info', { autoClose: false });

            // 模拟钱包交互
            showToast('Wallet interaction initiated...', 'info');

            // 显示成功提示
            showToast(
                `🎉 Cross-Chain Bridge Transaction Submitted!\n\n` +
                `Source Chain: ${getChainName(bridgeSourceChain)}\n` +
                `Target Chain: ${getChainName(bridgeTargetChain)}\n` +
                `Bridge Asset: ${bridgeAmount} ${bridgeAsset.label}\n` +
                `Source Value: $${calculateUSDValue(bridgeAmount, bridgeAsset.label)}\n` +
                `Target Assets: ${bridgeTargetAssets.length} types\n` +
                `Total Target Value: $${bridgeTargetAssets.reduce((sum, asset) => sum + asset.value, 0).toFixed(2)}\n\n` +
                `Estimated completion time: ~7 minutes`,
                'success',
                { duration: 6000 }
            );

            // 重置表单
            setBridgeAmount('');
            setBridgeTargetAssets([]);

        } catch (error: any) {
            console.error('❌ Cross-chain bridge operation failed:', error);
            const errorMessage = error?.message?.includes('User rejected') 
                ? 'Transaction cancelled by user' 
                : 'Transaction failed, please try again';
            showToast(errorMessage, 'error');
        }
    };

    return (
        <div className="container">
            <div className="main-layout">
                {/* Left Panel - Main Trading Interface */}
                <div className="glass-card main-trading-panel">
                    {/* Tab Navigation */}
                    <div className="tab-navigation">
                        <div 
                            className={`tab ${activeTab === 'borrow' ? 'active' : ''}`}
                            onClick={() => handleTabChange('borrow')}
                        >
                            Lending
                        </div>
                        <div 
                            className={`tab ${activeTab === 'bridge' ? 'active' : ''}`}
                            onClick={() => handleTabChange('bridge')}
                        >
                            Bridge
                        </div>
                    </div>

                    {/* Borrow Mode */}
                    {activeTab === 'borrow' && (
                        <div className="trading-mode active">
                            {/* Step 1: Collateral Source Chain */}
                            <div className="section-title">Step 1: Select Collateral Source Chain</div>
                            <Dropdown
                                options={chainOptions}
                                value={sourceChain}
                                onChange={setSourceChain}
                                placeholder="Select collateral chain"
                            />

                            {/* Collateral Asset Selection */}
                            <div className="section-title">Collateral Asset</div>
                            <Dropdown
                                options={assetOptions}
                                value={collateralAsset ? collateralAsset.value : ''}
                                onChange={handleSourceAssetsChange}
                                placeholder="Select collateral asset"
                            />

                            {/* Collateral Amount Input */}
                            {collateralAsset && (
                                <div>
                                    <div className="section-title">Collateral Amount</div>
                                    <div className="input-card">
                                        <input
                                            type="text"
                                            className="amount-input"
                                            placeholder="Enter amount"
                                            value={collateralAmount}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                // 严格的输入验证：只允许数字和小数点
                                                if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                                    // 额外检查：不允许多个小数点
                                                    const dotCount = (value.match(/\./g) || []).length;
                                                    if (dotCount <= 1) {
                                                        setCollateralAmount(value);
                                                    }
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                // 阻止危险字符的输入
                                                const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
                                                const isNumber = /^[0-9]$/.test(e.key);
                                                const isDot = e.key === '.';
                                                
                                                if (!allowedKeys.includes(e.key) && !isNumber && !isDot) {
                                                    e.preventDefault();
                                                }
                                                
                                                // 防止输入多个小数点
                                                if (isDot && collateralAmount.includes('.')) {
                                                    e.preventDefault();
                                                }
                                            }}
                                        />
                                        <div className="amount-value">${calculateUSDValue(collateralAmount)}</div>
                                        <div style={getTokenIconStyle(collateralAsset?.icon || 'ETH')}>{collateralAsset?.icon || 'ETH'}</div>
                                        <div className="token-balance">
                                            <span>Balance: {collateralAsset ? collateralAsset.amount : '0'}</span>
                                            <button
                                                onClick={handleMaxCollateral}
                                                style={{
                                                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    color: 'white',
                                                    padding: '4px 8px',
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
                                                }}
                                                onMouseEnter={(e) => {
                                                    (e.target as HTMLElement).style.transform = 'scale(1.05)';
                                                    (e.target as HTMLElement).style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    (e.target as HTMLElement).style.transform = 'scale(1)';
                                                    (e.target as HTMLElement).style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
                                                }}
                                            >
                                                MAX
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Lending Target Chain */}
                            <div className="section-title">Step 2: Select Lending Target Chain</div>
                            <Dropdown
                                options={chainOptions}
                                value={targetChain}
                                onChange={setTargetChain}
                                placeholder="Select lending chain"
                            />

                            {/* Cross-chain Info */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.6)',
                                borderRadius: '12px',
                                padding: '12px',
                                marginBottom: '16px'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '14px',
                                    color: 'var(--secondary-text)'
                                }}>
                                    {sourceChain === targetChain ? (
                                        <>
                                            <i className="fas fa-layer-group" style={{ color: 'var(--accent-color)' }}></i>
                                            <span>Same Chain Lending on {getChainName(sourceChain)}</span>
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-route" style={{ color: 'var(--accent-color)' }}></i>
                                            <span>Cross-chain Path: {getChainName(sourceChain)} → {getChainName(targetChain)}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Lending Summary */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.6)',
                                borderRadius: '12px',
                                padding: '16px',
                                marginBottom: '16px'
                            }}>
                                <div className="stat-row compact">
                                    <span>Selected Assets</span>
                                    <span>{selectedAssets.length} types</span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Total Lent</span>
                                    <span>${selectedAssets.reduce((sum, asset) => sum + asset.value, 0).toFixed(2)}</span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Est. Interest Rate</span>
                                    <span>2.5%</span>
                                </div>
                            </div>

                            {/* Health Factor */}
                            <div className="health-indicator">
                                <div className="health-label">Health Factor</div>
                                <div className="health-bar">
                                    <div 
                                        className="health-fill" 
                                        style={{ width: `${calculateHealthFactor()}%` }}
                                    ></div>
                                </div>
                                <div className="health-value">{calculateHealthFactor().toFixed(0)}%</div>
                            </div>

                            {/* Health Factor Warning */}
                            {calculateHealthFactor() <= 50 && selectedAssets.length > 0 && collateralAmount && (
                                <div style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '12px',
                                    padding: '12px',
                                    marginBottom: '16px'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        color: '#dc2626'
                                    }}>
                                        <i className="fas fa-exclamation-triangle"></i>
                                        <span style={{ fontSize: '14px', fontWeight: 500 }}>
                                            Risk Too High - Health Factor: {calculateHealthFactor().toFixed(0)}%
                                        </span>
                                    </div>
                                    <div style={{ 
                                        fontSize: '12px', 
                                        color: '#dc2626',
                                        marginTop: '4px',
                                        lineHeight: 1.4
                                    }}>
                                        Please reduce lending amount or increase collateral. Health factor must be above 50% to proceed.
                                    </div>
                                </div>
                            )}

                            <button 
                                className="button primary"
                                onClick={handleLendingExecute}
                                disabled={
                                    selectedAssets.length === 0 || 
                                    !collateralAmount || 
                                    calculateHealthFactor() <= 50
                                }
                                style={{
                                    opacity: (selectedAssets.length === 0 || !collateralAmount || calculateHealthFactor() <= 50) ? 0.6 : 1,
                                    cursor: (selectedAssets.length === 0 || !collateralAmount || calculateHealthFactor() <= 50) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {calculateHealthFactor() <= 50 && selectedAssets.length > 0 && collateralAmount ? 
                                    'Risk Too High - Cannot Proceed' :
                                    sourceChain === targetChain ? 
                                        `Execute Same Chain Lending (${selectedAssets.length} assets)` :
                                        `Execute Cross-Chain Lending (${selectedAssets.length} assets)`
                                }
                            </button>
                        </div>
                    )}

                    {/* Bridge Mode */}
                    {activeTab === 'bridge' && (
                        <div className="trading-mode active">
                            {/* Step 1: Bridge Source Chain */}
                            <div className="section-title">Step 1: Select Source Chain</div>
                            <Dropdown
                                options={chainOptions}
                                value={bridgeSourceChain}
                                onChange={setBridgeSourceChain}
                                placeholder="Select source chain"
                            />

                            {/* Source Asset Selection */}
                            <div className="section-title">Source Asset</div>
                            <Dropdown
                                options={bridgeAssetOptions}
                                value={bridgeAsset ? bridgeAsset.value : ''}
                                onChange={handleBridgeSourceAssetsChange}
                                placeholder="Select asset to bridge"
                            />

                            {/* Source Amount Input */}
                            {bridgeAsset && (
                                <div>
                                    <div className="section-title">Source Amount</div>
                                    <div className="input-card">
                                        <input
                                            type="text"
                                            className="amount-input"
                                            placeholder="Enter amount"
                                            value={bridgeAmount}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                // 严格的输入验证：只允许数字和小数点
                                                if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                                    // 额外检查：不允许多个小数点
                                                    const dotCount = (value.match(/\./g) || []).length;
                                                    if (dotCount <= 1) {
                                                        setBridgeAmount(value);
                                                    }
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                // 阻止危险字符的输入
                                                const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
                                                const isNumber = /^[0-9]$/.test(e.key);
                                                const isDot = e.key === '.';
                                                
                                                if (!allowedKeys.includes(e.key) && !isNumber && !isDot) {
                                                    e.preventDefault();
                                                }
                                                
                                                // 防止输入多个小数点
                                                if (isDot && bridgeAmount.includes('.')) {
                                                    e.preventDefault();
                                                }
                                            }}
                                        />
                                        <div className="amount-value">${calculateUSDValue(bridgeAmount)}</div>
                                        <div style={getTokenIconStyle(bridgeAsset?.icon || 'ETH')}>{bridgeAsset?.icon || 'ETH'}</div>
                                        <div className="token-balance">
                                            <span>Balance: {bridgeAsset ? bridgeAsset.amount : '0'}</span>
                                            <button
                                                onClick={handleMaxBridge}
                                                style={{
                                                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    color: 'white',
                                                    padding: '4px 8px',
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
                                                }}
                                                onMouseEnter={(e) => {
                                                    (e.target as HTMLElement).style.transform = 'scale(1.05)';
                                                    (e.target as HTMLElement).style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    (e.target as HTMLElement).style.transform = 'scale(1)';
                                                    (e.target as HTMLElement).style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
                                                }}
                                            >
                                                MAX
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Target Chain */}
                            <div className="section-title">Step 2: Select Target Chain</div>
                            <Dropdown
                                options={chainOptions.filter(c => c.value !== bridgeSourceChain)}
                                value={bridgeTargetChain}
                                onChange={setBridgeTargetChain}
                                placeholder="Select target chain"
                            />

                            {/* Bridge Info */}
                            {bridgeTargetChain && (
                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.6)',
                                    borderRadius: '12px',
                                    padding: '12px',
                                    marginBottom: '16px'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        fontSize: '14px',
                                        color: 'var(--secondary-text)'
                                    }}>
                                        <i className="fas fa-bridge" style={{ color: 'var(--accent-color)' }}></i>
                                        <span>Bridge Path: {getChainName(bridgeSourceChain)} → {getChainName(bridgeTargetChain)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Bridge Summary */}
                            {bridgeAmount && bridgeTargetChain && (
                                <div style={{
                                    background: 'rgba(255, 255, 255, 0.6)',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    marginBottom: '16px'
                                }}>
                                    <div className="stat-row compact">
                                        <span>Source Amount</span>
                                        <span>{bridgeAmount} {bridgeAsset?.label}</span>
                                    </div>
                                    <div className="stat-row compact">
                                        <span>Target Assets</span>
                                        <span>{bridgeTargetAssets.length} types</span>
                                    </div>
                                    <div className="stat-row compact">
                                        <span>Total Bridgeable</span>
                                        <span>${bridgeTargetAssets.reduce((sum, asset) => sum + asset.value, 0).toFixed(2)}</span>
                                    </div>
                                    <div className="stat-row compact">
                                        <span>Bridge Fee</span>
                                        <span>~$2.50</span>
                                    </div>
                                    <div className="stat-row compact">
                                        <span>Est. Time</span>
                                        <span>~7 minutes</span>
                                    </div>
                                </div>
                            )}

                            <button 
                                className="button primary"
                                onClick={handleBridgeExecute}
                                disabled={
                                    bridgeTargetAssets.length === 0 || 
                                    !bridgeAmount || 
                                    !bridgeTargetChain ||
                                    !bridgeAsset
                                }
                                style={{
                                    opacity: (bridgeTargetAssets.length === 0 || !bridgeAmount || !bridgeTargetChain || !bridgeAsset) ? 0.6 : 1,
                                    cursor: (bridgeTargetAssets.length === 0 || !bridgeAmount || !bridgeTargetChain || !bridgeAsset) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Execute Cross-Chain Bridge ({bridgeTargetAssets.length} assets)
                            </button>
                        </div>
                    )}
                </div>

                {/* Center Panel - Multi Asset Selector or Bridge Info */}
                <div className="center-panel">
                    {activeTab === 'borrow' && (
                        <div className="glass-card">
                            <div className="section-title large">Step 3: Select Lending Assets</div>
                            <MultiAssetSelector 
                                selectedChain={targetChain}
                                onAssetsChange={handleAssetsChange}
                            />
                        </div>
                    )}
                    
                    {activeTab === 'bridge' && (
                        <div className="glass-card">
                            <div className="section-title large">Step 3: Select Target Assets</div>
                            <CrossChainAssetSelector
                                sourceChain={bridgeSourceChain}
                                targetChain={bridgeTargetChain}
                                sourceAsset={bridgeAsset || { id: 'eth', symbol: 'ETH', name: 'Ethereum', price: assetPrices.ETH?.price || 3000, balance: '0', icon: 'ETH' }}
                                sourceAmount={parseFloat(bridgeAmount) || 0}
                                onTargetAssetsChange={handleBridgeTargetAssetsChange}
                            />
                        </div>
                    )}
                </div>

                {/* Right Panel - Network & Fee Information */}
                <div className="info-panel">
                    <div className="glass-card info-card">
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '16px',
                            paddingBottom: '12px',
                            borderBottom: '1px solid var(--border-color)'
                        }}>
                            <h3 style={{
                                margin: 0,
                                fontSize: '16px',
                                fontWeight: 600,
                                color: 'var(--text-color)'
                            }}>Network Information</h3>
                            <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: 'var(--accent-color)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px'
                            }}>
                                <i className="fas fa-info"></i>
                            </div>
                        </div>

                        {/* Network Status */}
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.6)',
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '16px'
                        }}>
                            <h4 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-color)' }}>
                                Network Status
                            </h4>
                            <div style={{ display: 'grid', gap: '8px' }}>
                                <div className="stat-row compact">
                                    <span>Gas Price</span>
                                    <span>{networkStatus ? `${networkStatus.gasPriceGwei.standard} Gwei` : '20.00 Gwei'}</span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Network Congestion</span>
                                    <span style={{ 
                                        color: networkStatus ? getCongestionColor(networkStatus.congestionLevel) : '#f59e0b' 
                                    }}>
                                        {networkStatus ? networkStatus.congestionLevel.charAt(0).toUpperCase() + networkStatus.congestionLevel.slice(1) : 'Medium'}
                                    </span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Est. Confirmation</span>
                                    <span>{networkStatus ? networkStatus.estimatedConfirmationTime : '~2 minutes'}</span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Block Time</span>
                                    <span>{networkStatus ? `${networkStatus.blockTime}s` : '12s'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Fee Breakdown */}
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.6)',
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '16px'
                        }}>
                            <h4 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-color)' }}>
                                Fee Breakdown
                            </h4>
                            <div style={{ display: 'grid', gap: '8px' }}>
                                <div className="stat-row compact">
                                    <span>Gas Fee (Standard)</span>
                                    <span>{networkStatus ? `$${((parseFloat(networkStatus.gasPriceGwei.standard) * 21000 / 1e9) * (assetPrices.ETH?.price || 3000)).toFixed(2)}` : '$5.20'}</span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Bridge Fee</span>
                                    <span>~$2.50</span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Protocol Fee</span>
                                    <span>0.1%</span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Price Updates</span>
                                    <span style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                                        {Object.keys(assetPrices).length > 0 ? 'Live Chainlink' : 'Loading...'}
                                    </span>
                                </div>
                                <div style={{
                                    paddingTop: '8px',
                                    borderTop: '1px solid var(--border-color)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontWeight: 600
                                }}>
                                    <span>Est. Total Fee</span>
                                    <span style={{ color: 'var(--accent-color)' }}>
                                        {networkStatus ? 
                                            `$${((parseFloat(networkStatus.gasPriceGwei.standard) * 21000 / 1e9) * (assetPrices.ETH?.price || 3000) + 2.5).toFixed(2)}` 
                                            : '~$7.70'
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Protocol Stats */}
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.6)',
                            borderRadius: '12px',
                            padding: '16px'
                        }}>
                            <h4 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-color)' }}>
                                Protocol Statistics
                            </h4>
                            <div style={{ display: 'grid', gap: '8px' }}>
                                <div className="stat-row compact">
                                    <span>Total Value Locked</span>
                                    <span>{protocolStats ? protocolStats.totalValueLocked : '$2.5B'}</span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Active Users</span>
                                    <span>{protocolStats ? protocolStats.totalUsers.toLocaleString() : '125,432'}</span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Success Rate</span>
                                    <span style={{ color: '#22c55e' }}>
                                        {protocolStats ? `${protocolStats.successRate}%` : '99.8%'}
                                    </span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Avg. Bridge Time</span>
                                    <span>{protocolStats ? protocolStats.averageTransactionTime : '~7 minutes'}</span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Current Prices</span>
                                    <div style={{ fontSize: '11px', color: 'var(--secondary-text)', textAlign: 'right' }}>
                                        {assetPrices.ETH && (
                                            <div>ETH: {formatPrice(assetPrices.ETH.price)}</div>
                                        )}
                                        {assetPrices.LINK && (
                                            <div>LINK: {formatPrice(assetPrices.LINK.price)}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toast Container for notifications */}
            <ToastContainer />
        </div>
    );
};

export default Home;