import React, { useState, useEffect } from 'react';
import MultiAssetSelector from '../components/MultiAssetSelector';
import ImprovedNetworkSelector from '../components/ImprovedNetworkSelector';
import CrossChainAssetSelector from '../components/CrossChainAssetSelector';
import { bsc, bscTestnet, sepolia } from 'wagmi/chains';
import { useAccount, useChainId, useProof, useSwitchChain } from 'wagmi';
import  ERC20ABI  from '../abi/ERC20.json'
import Dropdown from '../components/Dropdown';
import { poolList, chainSelector } from '../config';
import { getUserPosition, loan, bridge} from '@/utils/pool';
import { linkPorts } from '../config';
import { getUserAssetBalance, getBalance } from '../utils/balance';
import { getMapToken } from '../utils/port';
import { formatUnits } from 'ethers';
import { format } from 'path';
import { Asset, AssetAllocation } from '../utils/types';
import { getAssetPrice, getAssetPriceFromPort, getMultipleAssetPrices, formatPrice, PriceData, getMultipleAssetPricesFromPort } from '../utils/priceService';

import { useToast } from '../components/Toast';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { getTokenIconStyle } from '../utils/ui';

// Interface for user staking positions
interface StakingPosition {
    token: string;
    poolId: string;
    amount: string;
    value: number;
    apy: string;
}

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

    // Staking positions and lending options
    const [userStakingPositions, setUserStakingPositions] = useState<StakingPosition[]>([]);
    const [useExistingStaking, setUseExistingStaking] = useState<boolean>(false);
    const [totalStakingValue, setTotalStakingValue] = useState<number>(0);
    
    // Network switching states
    const [isSwitchingNetwork, setIsSwitchingNetwork] = useState<boolean>(false);
    const [lastSwitchedChain, setLastSwitchedChain] = useState<string>('');
    
    // Global toast tracking - prevent duplicate toasts completely
    const [shownToasts, setShownToasts] = useState<Set<string>>(new Set());
    
    // Manual input control
    const [isManualInput, setIsManualInput] = useState<boolean>(false);

    const { address } = useAccount()
    const chainId = useChainId();
    const { showToast, ToastContainer } = useToast();
    const { writeContract } = useWriteContract();
    const { switchChain } = useSwitchChain();

    // Price data
    const [assetPrices, setAssetPrices] = useState<Record<string, PriceData>>({});

    // Dropdown options definition
    const chainOptions = [
        { value: sepolia.id.toString(), label: 'Ethereum Sepolia', icon: 'ETH', description: 'Layer 1 - High Security'},
        { value: bscTestnet.id.toString(), label: 'BNB Testnet', icon: 'BNB', description: 'Binance Smart Chain'}
    ];

    // Fetch user staking positions on the selected chain
    async function fetchUserStakingPositions(chainId: any) {
        if (!address) {
            setUserStakingPositions([]);
            setTotalStakingValue(0);
            return;
        }

        console.log("Fetching user staking positions for chainId:", chainId);
        
        const numericChainId = typeof chainId === 'string' ? parseInt(chainId) : chainId;
        
        try {
            const stakingPositions: StakingPosition[] = [];
            let totalValue = 0;

            // Get user positions in all pools on this chain
            const chainPools = poolList.filter(pool => pool.chainId === numericChainId);
            
            for (const pool of chainPools) {
                try {
                    // Get user's actual position value in the liquidity pool using the real calculation
                    const userPositionWei = await getUserPosition(pool, address);
                    const userPositionAmount = userPositionWei ? formatUnits(userPositionWei, 18) : '0';
                    const userPositionValue = parseFloat(userPositionAmount);
                    
                    if (userPositionValue > 0) {
                        // Get asset price to calculate USD value
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
                        
                        console.log(`${pool.name} staking position:`, {
                            userPositionWei: userPositionWei?.toString(),
                            userPositionAmount,
                            assetPrice,
                            assetUSDValue
                        });
                    }
                } catch (error) {
                    console.error(`Failed to get staking position for ${pool.name}:`, error);
                }
            }
            
            setUserStakingPositions(stakingPositions);
            setTotalStakingValue(totalValue);
            
            console.log("User staking positions:", stakingPositions);
            console.log("Total staking value:", totalValue);
            
        } catch (error) {
            console.error("Failed to fetch user staking positions:", error);
            setUserStakingPositions([]);
            setTotalStakingValue(0);
        }
    }

    // Hook to fetch staking positions when sourceChain or address changes
    useEffect(() => {
        fetchUserStakingPositions(sourceChain);
    }, [sourceChain, address, assetPrices]);

    // Auto-recalculate collateral when staking option changes
    useEffect(() => {
        // Allow recalculation if: no manual input OR collateral amount is empty
        const shouldAutoCalculate = !isManualInput || collateralAmount === '';
        
        if (selectedAssets.length > 0 && collateralAsset && shouldAutoCalculate) {
            const totalBorrowValue = selectedAssets.reduce((sum, asset) => sum + asset.value, 0);
            
            if (totalBorrowValue > 0) {
                // Calculate required total collateral value (LTV = 75%)
                const requiredTotalCollateralValue = totalBorrowValue / 0.75;
                
                // Subtract existing staking value if enabled
                const existingStakingValue = useExistingStaking ? totalStakingValue : 0;
                const requiredNewCollateralValue = Math.max(0, requiredTotalCollateralValue - existingStakingValue);
                
                // Convert to collateral asset amount
                const assetPrice = assetPrices[collateralAsset.token]?.price || 2400;
                const requiredCollateralAmount = requiredNewCollateralValue / assetPrice;
                
                // Auto-fill the collateral amount input
                setCollateralAmount(requiredCollateralAmount.toFixed(6));
            }
        }
    }, [useExistingStaking, totalStakingValue, selectedAssets, collateralAsset, assetPrices, isManualInput, collateralAmount]);

    // Update collateral calculation to include staking if enabled
    const calculateTotalCollateralValue = () => {
        const newCollateralValue = parseFloat(collateralAmount) || 0;
        const assetPrice = collateralAsset ? (assetPrices[collateralAsset.token]?.price || 2400) : 2400;
        const newCollateralUSDValue = newCollateralValue * assetPrice;
        
        const stakingValue = useExistingStaking ? totalStakingValue : 0;
        
        return newCollateralUSDValue + stakingValue;
    };

    // Calculate required collateral based on selected borrowing assets
    const calculateRequiredCollateral = () => {
        const totalBorrowValue = selectedAssets.reduce((sum, asset) => sum + asset.value, 0);
        if (totalBorrowValue === 0) return 0;
        
        // Need collateral worth 133.33% of borrow value (75% LTV = borrow/collateral = 0.75)
        const requiredCollateralValue = totalBorrowValue / 0.75;
        
        // Subtract existing staking value if enabled
        const stakingValue = useExistingStaking ? totalStakingValue : 0;
        const requiredNewCollateralValue = Math.max(0, requiredCollateralValue - stakingValue);
        
        // Convert to collateral asset amount
        const assetPrice = collateralAsset ? (assetPrices[collateralAsset.token]?.price || 2400) : 2400;
        return requiredNewCollateralValue / assetPrice;
    };

    // Auto-suggest collateral amount when borrowing assets change
    const [showCollateralSuggestion, setShowCollateralSuggestion] = useState(false);
    const [suggestedCollateralAmount, setSuggestedCollateralAmount] = useState('');

    // Update suggestions when selected assets change
    useEffect(() => {
        if (selectedAssets.length > 0 && !collateralAmount) {
            const requiredAmount = calculateRequiredCollateral();
            if (requiredAmount > 0) {
                setSuggestedCollateralAmount(requiredAmount.toFixed(6));
                setShowCollateralSuggestion(true);
            } else {
                setShowCollateralSuggestion(false);
            }
        } else {
            setShowCollateralSuggestion(false);
        }
    }, [selectedAssets, useExistingStaking, totalStakingValue, collateralAsset, assetPrices]);

    // Function to apply suggested collateral amount
    const applySuggestedCollateral = () => {
        setCollateralAmount(suggestedCollateralAmount);
        setShowCollateralSuggestion(false);
    };

    // Function to filter assets based on chain logic
    const filterAssetsByChain = (chainId: number, assets: any[]) => {
        return assets.filter(pool => {
            // Filter out illogical asset-chain combinations
            if (chainId === sepolia.id) {
                // On Sepolia: Allow ETH, USDT, LINK but NOT BNB
                return pool.name.toUpperCase() !== 'BNB';
            } else if (chainId === bscTestnet.id) {
                // On BSC Testnet: Allow BNB, USDT, LINK but NOT ETH (unless wrapped)
                return pool.name.toUpperCase() !== 'ETH';
            }
            return true; // Allow all for other chains
        });
    };

    async function fetchPools(chainId: any) {
        console.log("Fetching pools for chainId:", chainId, "Type:", typeof chainId);
        
        const numericChainId = typeof chainId === 'string' ? parseInt(chainId) : chainId;
        
        // Filter pools by chainId and logical asset-chain combinations
        const filteredPools = filterAssetsByChain(numericChainId, poolList.filter(pool => {
            return pool.chainId === numericChainId 
        }));
        
        const sourceAssetsPromises = filteredPools.map(async (pool) => {
            // Only fetch balance if user is connected
            let balance = null;
            if (address) {
                try {
                    // Get user's raw asset balance, not liquidity pool shares
                    const isNative = pool.name.toUpperCase() === 'ETH' || pool.name.toUpperCase() === 'BNB';
                    balance = await getUserAssetBalance(
                        pool.address, 
                        address, 
                        pool.chainId,
                        isNative
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
                token: pool.address,
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

    // Auto-switch network when sourceChain changes
    useEffect(() => {
        const handleNetworkSwitch = async () => {
            if (address && sourceChain && !isSwitchingNetwork) {
                const targetChainId = parseInt(sourceChain);
                
                // Only switch if chain is different AND not recently switched to this chain
                if (chainId !== targetChainId && lastSwitchedChain !== sourceChain) {
                    setIsSwitchingNetwork(true);
                    try {
                        console.log(`Switching network from ${chainId} to ${targetChainId}`);
                        await switchChain({ chainId: targetChainId as 11155111 | 97 });
                        setLastSwitchedChain(sourceChain);
                        
                        // Show success toast only once
                        setTimeout(() => {
                            showToastOnce(`Switched to ${getChainName(sourceChain)}`, 'success');
                        }, 100);
                        
                        // Reset the last switched chain after a delay to allow future switches
                        setTimeout(() => {
                            setLastSwitchedChain('');
                        }, 3000);
                    } catch (error: any) {
                        console.error('Failed to switch network:', error);
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

        fetchPools(sourceChain);
        if (address) {
            handleNetworkSwitch();
        }
    }, [sourceChain, address, chainId])

    // Function to fetch bridge asset options
    async function fetchBridgePools(chainId: any) {
        console.log("Fetching bridge pools for chainId:", chainId);
        
        const numericChainId = typeof chainId === 'string' ? parseInt(chainId) : chainId;
        
        // Filter pools by chainId and logical asset-chain combinations
        const filteredBridgePools = filterAssetsByChain(numericChainId, poolList.filter(pool => {
            return pool.chainId === numericChainId 
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
                    console.log(`User bridge ${pool.name} balance:`, balance);
                } catch (error) {
                    console.log("Failed to get user bridge asset balance:", error);
                    balance = null;
                }
            }
            
            /*
            // Get price for the asset
                                    const getAssetPrice = (assetName: string) => {
                            switch(assetName.toUpperCase()) {
                                case 'ETH': return assetPrices.ETH?.price || 2400; // More conservative fallback price
                                case 'LINK': return assetPrices.LINK?.price || 12; // More conservative fallback price
                                case 'BNB': return assetPrices.BNB?.price || 240; // More conservative fallback price
                                case 'USDC':
                                case 'USDT':
                                case 'DAI': return 1;
                                default: return 1;
                            }
                        };
            */
            
            return {
                value: pool.id,
                label: pool.name,
                icon: pool.name.toUpperCase(),
                balance: balance,
                token: pool.address,
                amount: balance ? formatUnits(balance, 18) : '0',
                //price: await getAssetPriceFromPort(pool.address, pool.chainId), // Add price field
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

    // Fetch bridge asset options when bridge source chain changes and auto-switch network
    useEffect(() => {
        const handleBridgeNetworkSwitch = async () => {
            if (address && bridgeSourceChain && activeTab === 'bridge' && !isSwitchingNetwork) {
                const targetChainId = parseInt(bridgeSourceChain);
                
                // Only switch if chain is different AND not recently switched to this chain
                if (chainId !== targetChainId && lastSwitchedChain !== bridgeSourceChain) {
                    setIsSwitchingNetwork(true);
                    try {
                        console.log(`Switching bridge network from ${chainId} to ${targetChainId}`);
                        await switchChain({ chainId: targetChainId as 11155111 | 97 });
                        setLastSwitchedChain(bridgeSourceChain);
                        
                        // Show success toast only once
                        setTimeout(() => {
                            showToastOnce(`Switched to ${getChainName(bridgeSourceChain)}`, 'success');
                        }, 100);
                        
                        // Reset the last switched chain after a delay to allow future switches
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
    }, [bridgeSourceChain, address, chainId, activeTab])

    // Get price data
    useEffect(() => {
        async function loadAssetPrices() {
            const pircePromises = poolList.map(async (pool) => {
                const token = pool.address
                return getAssetPriceFromPort(token, pool.chainId).then(price => ({ token, price }))
            })
           const results = await Promise.all(pircePromises);
  
           const assetPrices = results.reduce((acc, { token , price }) => {
               if (price) {
                   acc[token] = price;
               }
               return acc;
           }, {} as Record<string, PriceData>);
           console.log("Asset Prices:", assetPrices);
           setAssetPrices(assetPrices)
        }
        loadAssetPrices();
    }, [sourceChain]);





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

    const calculateUSDValue = (amount: string, asset: string) => {
        const value = parseFloat(amount) || 0;
        let priceData;
        
        if (asset && collateralAsset && asset === collateralAsset.token) {
            priceData = assetPrices[collateralAsset.token];
        } else {
            priceData = assetPrices[asset];
        }
        
        const price = priceData ? priceData.price : 0;
        return (value * price).toFixed(2);
    };

    const calculateMaxBorrow = (collateralAmount: string) => {
        const totalCollateralValue = calculateTotalCollateralValue();
        return (totalCollateralValue * 0.75).toFixed(0); // 75% LTV with total collateral including staking
    };

    const calculateHealthFactor = () => {
        const totalCollateralValue = calculateTotalCollateralValue();
        const totalBorrowValue = selectedAssets.reduce((sum, asset) => sum + asset.value, 0);
        if (totalBorrowValue === 0) return 100;
        return Math.min(100, (totalCollateralValue * 0.8 / totalBorrowValue) * 100);
    };

    const handleAssetsChange = (assets: AssetAllocation[]) => {
        setSelectedAssets(assets);
        
        // Reset manual input flag when assets change significantly or when starting fresh
        if (assets.length === 0) {
            setIsManualInput(false);
            setCollateralAmount('');
            return;
        }
        
        // Auto-calculate required collateral based on selected borrowing assets
        // Allow calculation if: no manual input OR collateral amount is empty
        const shouldAutoCalculate = !isManualInput || collateralAmount === '';
        
        if (assets.length > 0 && collateralAsset && shouldAutoCalculate) {
            const totalBorrowValue = assets.reduce((sum, asset) => sum + asset.value, 0);
            
            if (totalBorrowValue > 0) {
                // Calculate required total collateral value (LTV = 75%)
                const requiredTotalCollateralValue = totalBorrowValue / 0.75;
                
                // Subtract existing staking value if enabled
                const existingStakingValue = useExistingStaking ? totalStakingValue : 0;
                const requiredNewCollateralValue = Math.max(0, requiredTotalCollateralValue - existingStakingValue);
                
                // Convert to collateral asset amount
                const assetPrice = assetPrices[collateralAsset.token]?.price || 2400;
                const requiredCollateralAmount = requiredNewCollateralValue / assetPrice;
                
                // Auto-fill the collateral amount input
                setCollateralAmount(requiredCollateralAmount.toFixed(6));
                
                // If we just auto-calculated, reset the manual input flag
                if (collateralAmount === '') {
                    setIsManualInput(false);
                }
            }
        }
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
            setIsManualInput(true); // Mark as manual input
            setCollateralAmount(collateralAsset.amount);
        }
    };
    
    // Handle manual collateral input
    const handleCollateralAmountChange = (value: string) => {
        if (value === '') {
            // Reset manual input flag when user clears the input
            setIsManualInput(false);
        } else {
            // Mark as manual input when user types non-empty value
            setIsManualInput(true);
        }
        setCollateralAmount(value);
    };

    // Force single toast display function
    const showToastOnce = (message: string, type: 'success' | 'error' | 'warning' | 'info', options?: any) => {
        const timestamp = Date.now();
        const toastId = `${type}-${message.replace(/\s+/g, '_')}-${timestamp}`;
        
        if (!shownToasts.has(toastId)) {
            showToast(message, type, { ...options, toastId });
            setShownToasts(prev => new Set(prev).add(toastId));
            
            // Clear this toast ID after 5 seconds to allow showing it again later
            setTimeout(() => {
                setShownToasts(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(toastId);
                    return newSet;
                });
            }, 5000);
        }
    };

    // Network information utilities
    const getCongestionColor = (level: string) => {
        switch (level?.toLowerCase()) {
            case 'low': return '#22c55e';
            case 'medium': return '#f59e0b';
            case 'high': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const formatPrice = (price: number) => {
        return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };



    const handleMaxBridge = () => {
        if (bridgeAsset && bridgeAsset.amount) {
            setBridgeAmount(bridgeAsset.amount);
        }
    };

    // Handle lending operation
    const handleLendingExecute = async () => {
        // Allow borrowing if user has staking positions OR new collateral
        const hasValidCollateral = useExistingStaking && totalStakingValue > 0 || collateralAmount && parseFloat(collateralAmount) > 0;
        
        if (selectedAssets.length === 0 || !hasValidCollateral || calculateHealthFactor() <= 50) {
            if (!hasValidCollateral && selectedAssets.length > 0) {
                showToast('Please provide collateral or enable using existing staking positions', 'warning');
            }
            return;
        }

        // Check wallet connection
        if (!address) {
            showToast('Please connect your wallet first', 'warning');
            return;
        }

        try {
            const totalCollateralValue = calculateTotalCollateralValue();
            
            console.log('🏦 Executing lending operation:', {
                sourceChain: getChainName(sourceChain),
                targetChain: getChainName(targetChain),
                collateralAsset: collateralAsset?.label,
                newCollateralAmount: collateralAmount,
                newCollateralValue: collateralAmount ? calculateUSDValue(collateralAmount, collateralAsset?.token || 'ETH') : '$0',
                useExistingStaking,
                stakingValue: useExistingStaking ? `$${totalStakingValue.toFixed(2)}` : '$0',
                totalCollateralValue: `$${totalCollateralValue.toFixed(2)}`,
                selectedAssets,
                totalBorrowValue: selectedAssets.reduce((sum, asset) => sum + asset.value, 0),
                healthFactor: calculateHealthFactor()
            });


            // Show processing notification
            showToast('Transaction processing...', 'info', { autoClose: false });



            loan(sourceChain, targetChain, collateralAsset.token, parseEther(collateralAmount), selectedAssets.map(asset => asset.token), selectedAssets.map(asset => parseEther(asset.amount.toString())));

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

            // Reset form and refresh data after successful operation
            setTimeout(() => {
                // Clear input fields
                setCollateralAmount('');
                setSelectedAssets([]);
                setUseExistingStaking(false);
                
                // Refresh user staking positions
                if (sourceChain) {
                    fetchUserStakingPositions(sourceChain);
                }
                
                // Refresh pools and asset data
                if (sourceChain) {
                    fetchPools(sourceChain);
                }
                
                console.log('✅ Form cleared and data refreshed after successful lending operation');
            }, 2000); // Wait 2 seconds to allow transaction processing
            
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

            console.log("bridge",bridgeTargetAssets, bridgeTargetChain);

            let mapTokens = []
            for (let i = 0; i < bridgeTargetAssets.length; i++) {
                let token = await getMapToken(bridgeSourceChain, bridgeTargetChain, bridgeTargetAssets[i].token);
                console.log("Map Token", bridgeTargetAssets[i].token, token);
                mapTokens.push(token);
            }


            // Show processing notification
            showToast('Initiating cross-chain bridge...', 'info', { autoClose: false });

            bridge(bridgeSourceChain, bridgeTargetChain, bridgeAsset.token, parseEther(bridgeAmount), mapTokens, bridgeTargetAssets.map(asset => parseEther(asset.value.toString())));

            // Simulate wallet interaction
            showToast('Wallet interaction initiated...', 'info');

            // Show success notification
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

            // Reset form and refresh data after successful operation
            setTimeout(() => {
                // Clear input fields
                setBridgeAmount('');
                setBridgeTargetAssets([]);
                
                // Refresh bridge assets and balances
                if (bridgeSourceChain) {
                    fetchBridgePools(bridgeSourceChain);
                }
                if (bridgeTargetChain) {
                    fetchBridgePools(bridgeTargetChain);
                }
                
                console.log('✅ Form cleared and data refreshed after successful bridge operation');
            }, 2000); // Wait 2 seconds to allow transaction processing

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

                            {/* User Staking Positions Display - Compact Version */}
                            {userStakingPositions.length > 0 && (
                                <div style={{
                                    background: 'rgba(34, 197, 94, 0.08)',
                                    borderRadius: '10px',
                                    padding: '12px',
                                    marginBottom: '16px',
                                    border: '1px solid rgba(34, 197, 94, 0.2)'
                                }}>
                                    {/* Header without USD display */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        marginBottom: '8px'
                                    }}>
                                        <div style={{
                                            fontSize: '13px',
                                            fontWeight: 600,
                                            color: '#059669',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}>
                                            💰 Your Staking on {getChainName(sourceChain).split(' ')[0]}
                                        </div>
                                    </div>
                                    
                                    {/* Compact staking positions list */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                        {userStakingPositions.map((position, index) => (
                                            <div key={index} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: '4px 8px',
                                                background: 'rgba(255, 255, 255, 0.7)',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                border: '1px solid rgba(34, 197, 94, 0.15)'
                                            }}>
                                                <div style={{
                                                    ...getTokenIconStyle(position.token),
                                                    width: '16px',
                                                    height: '16px',
                                                    fontSize: '8px'
                                                }}>
                                                    {position.token}
                                                </div>
                                                <span style={{ fontWeight: 500 }}>
                                                    {parseFloat(position.amount).toFixed(1)} {position.token}
                                                </span>
                                                <span style={{ color: '#6b7280', fontSize: '10px' }}>
                                                    ${position.value.toFixed(0)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Compact option to use existing staking as collateral */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        paddingTop: '6px',
                                        borderTop: '1px solid rgba(34, 197, 94, 0.15)'
                                    }}>
                                        <input
                                            type="checkbox"
                                            id="useExistingStaking"
                                            checked={useExistingStaking}
                                            onChange={(e) => setUseExistingStaking(e.target.checked)}
                                            style={{
                                                width: '14px',
                                                height: '14px',
                                                accentColor: '#059669'
                                            }}
                                        />
                                        <label htmlFor="useExistingStaking" style={{
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            color: '#059669',
                                            cursor: 'pointer',
                                            lineHeight: 1.2
                                        }}>
                                            Use as additional collateral
                                        </label>
                                        {useExistingStaking && (
                                            <span style={{
                                                fontSize: '11px',
                                                color: '#047857',
                                                fontWeight: 600,
                                                marginLeft: 'auto'
                                            }}>
                                                ✓ Enabled
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Collateral Amount Input */}
                            {collateralAsset && (
                                <div>
                                    <div className="section-title">
                                        {useExistingStaking ? 'Additional Collateral Amount (Optional)' : 'Collateral Amount'}
                                    </div>
                                    <div className="input-card">
                                        <input
                                            type="text"
                                            className="amount-input"
                                            placeholder={selectedAssets.length > 0 ? "Auto-calculated" : (useExistingStaking ? "Additional amount" : "Enter amount")}
                                            value={collateralAmount}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                                    const dotCount = (value.match(/\./g) || []).length;
                                                    if (dotCount <= 1) {
                                                        if (value === '' || parseFloat(value) <= parseFloat(collateralAsset.amount)) {
                                                            handleCollateralAmountChange(value);
                                                        } else {
                                                            showToast('Insufficient collateral balance', 'warning');
                                                        }
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
                                                
                                                if (isDot && collateralAmount.includes('.')) {
                                                    e.preventDefault();
                                                }
                                            }}
                                        />
                                        <div className="amount-value">${calculateUSDValue(collateralAmount, collateralAsset?.token || 'ETH')}</div>
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
                                    
                                    {/* Auto-calculation hint */}
                                    {selectedAssets.length > 0 && (
                                        <div style={{
                                            fontSize: '12px',
                                            color: '#059669',
                                            marginTop: '4px',
                                            fontStyle: 'italic'
                                        }}>
                                            💡 Auto-calculated based on ${selectedAssets.reduce((sum, asset) => sum + asset.value, 0).toFixed(2)} borrowing (you can adjust manually)
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 2: Lending Target Chain */}
                            <div className="section-title">Step 2: Select Lending Target Chain</div>
                            <Dropdown
                                options={chainOptions.filter(c => c.value !== sourceChain)}
                                value={targetChain}
                                onChange={setTargetChain}
                                placeholder="Select lending chain"
                            />







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
                                                // Strict input validation: only allow numbers and decimal point
                                                if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                                                                                          // Additional check: no multiple decimal points allowed
                                                    const dotCount = (value.match(/\./g) || []).length;
                                                    if (dotCount <= 1) {
                                                        setBridgeAmount(value);
                                                    }
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                // Prevent dangerous character input
                                                const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
                                                const isNumber = /^[0-9]$/.test(e.key);
                                                const isDot = e.key === '.';
                                                
                                                if (!allowedKeys.includes(e.key) && !isNumber && !isDot) {
                                                    e.preventDefault();
                                                }
                                                
                                                // Prevent multiple decimal point input
                                                if (isDot && bridgeAmount.includes('.')) {
                                                    e.preventDefault();
                                                }
                                            }}
                                        />
                                        <div className="amount-value">${calculateUSDValue(bridgeAmount, bridgeAsset?.token || 'ETH')}</div>
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
                                sourceChain={parseInt(bridgeSourceChain)}
                                targetChain={parseInt(bridgeTargetChain)}
                                sourceAsset={bridgeAsset || { id: 'eth', symbol: 'ETH', name: 'Ethereum', price: assetPrices.ETH?.price || 3000, balance: '0', icon: 'ETH' }}
                                sourceAmount={parseFloat(bridgeAmount) || 0}
                                onTargetAssetsChange={handleBridgeTargetAssetsChange}
                            />
                        </div>
                    )}
                </div>

                {/* Right Panel - Collateral & Lending Summary */}
                <div className="info-panel glass-card info-card">
                    <div className="">
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
                            }}>💼 Collateral & Lending Summary</h3>
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
                                <i className="fas fa-chart-line"></i>
                            </div>
                        </div>

                        {/* Health Factor - Prominent Display */}
                        <div style={{
                            background: calculateHealthFactor() > 75 ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05))' : 
                                       calculateHealthFactor() > 50 ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(251, 191, 36, 0.05))' : 
                                       'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05))',
                            borderRadius: '16px',
                            padding: '20px',
                            marginBottom: '20px',
                            border: `2px solid ${calculateHealthFactor() > 75 ? 'rgba(34, 197, 94, 0.2)' : 
                                               calculateHealthFactor() > 50 ? 'rgba(251, 191, 36, 0.2)' : 
                                               'rgba(239, 68, 68, 0.2)'}`,
                            position: 'relative'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '12px'
                            }}>
                                <div style={{
                                    fontSize: '16px',
                                    fontWeight: 700,
                                    color: 'var(--text-color)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <i className="fas fa-heart-pulse" style={{
                                        color: calculateHealthFactor() > 75 ? '#22c55e' : 
                                               calculateHealthFactor() > 50 ? '#f59e0b' : 
                                               '#ef4444'
                                    }}></i>
                                    Health Factor
                                </div>
                                <div style={{
                                    fontSize: '24px',
                                    fontWeight: 800,
                                    color: calculateHealthFactor() > 75 ? '#22c55e' : 
                                           calculateHealthFactor() > 50 ? '#f59e0b' : 
                                           '#ef4444'
                                }}>
                                    {calculateHealthFactor().toFixed(0)}%
                                </div>
                            </div>
                            
                            {/* Health Factor Progress Bar */}
                            <div style={{
                                width: '100%',
                                height: '8px',
                                background: 'rgba(0, 0, 0, 0.1)',
                                borderRadius: '4px',
                                overflow: 'hidden',
                                marginBottom: '8px'
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${Math.min(100, calculateHealthFactor())}%`,
                                    background: calculateHealthFactor() > 75 ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 
                                               calculateHealthFactor() > 50 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 
                                               'linear-gradient(90deg, #ef4444, #dc2626)',
                                    transition: 'width 0.3s ease'
                                }}></div>
                            </div>
                            
                            <div style={{
                                fontSize: '12px',
                                color: 'var(--secondary-text)',
                                textAlign: 'center'
                            }}>
                                {calculateHealthFactor() > 75 ? '✅ Healthy - Low Risk' : 
                                 calculateHealthFactor() > 50 ? '⚠️ Moderate Risk' : 
                                 '🚨 High Risk - Increase Collateral'}
                            </div>
                        </div>

                        {/* Total Collateral */}
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.6)',
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '16px'
                        }}>
                            <div className="stat-row compact" style={{ 
                                background: 'rgba(59, 130, 246, 0.08)',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                marginBottom: '8px'
                            }}>
                                <span style={{ fontWeight: 600 }}>Total Collateral Value</span>
                                <span style={{ fontWeight: 600, color: '#3b82f6' }}>
                                    ${calculateTotalCollateralValue().toFixed(2)}
                                </span>
                            </div>
                            
                            {/* Collateral breakdown */}
                            {useExistingStaking && totalStakingValue > 0 && (
                                <div style={{ marginLeft: '8px', marginBottom: '8px' }}>
                                    <div className="stat-row compact" style={{ fontSize: '13px', color: '#6b7280' }}>
                                        <span>• From staking positions</span>
                                        <span>${totalStakingValue.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                            
                            {collateralAmount && (
                                <div style={{ marginLeft: '8px', marginBottom: '8px' }}>
                                    <div className="stat-row compact" style={{ fontSize: '13px', color: '#6b7280' }}>
                                        <span>• From new collateral</span>
                                        <span>${calculateUSDValue(collateralAmount, collateralAsset?.token || 'ETH')}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Borrowing Capacity */}
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.6)',
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '16px'
                        }}>
                            <h4 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-color)' }}>
                                Borrowing Information
                            </h4>
                            <div style={{ display: 'grid', gap: '8px' }}>
                                {/* Max borrowing capacity */}
                                <div className="stat-row compact" style={{ 
                                    background: 'rgba(34, 197, 94, 0.08)',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    marginBottom: '8px'
                                }}>
                                    <span>Max Borrowing Capacity (75% LTV)</span>
                                    <span style={{ fontWeight: 600, color: '#22c55e' }}>
                                        ${calculateMaxBorrow(collateralAmount)}
                                    </span>
                                </div>
                                
                                {/* Current borrowing */}
                                <div className="stat-row compact">
                                    <span>Selected Assets to Borrow</span>
                                    <span>{selectedAssets.length} types</span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Total Borrowing Amount</span>
                                    <span>${selectedAssets.reduce((sum, asset) => sum + asset.value, 0).toFixed(2)}</span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Est. Interest Rate</span>
                                    <span>2.5%</span>
                                </div>
                            </div>
                        </div>

                        {/* Asset Prices & Protocol Info */}
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.6)',
                            borderRadius: '12px',
                            padding: '16px'
                        }}>
                            <h4 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-color)' }}>
                                Market Information
                            </h4>
                            <div style={{ display: 'grid', gap: '8px' }}>
                                <div className="stat-row compact">
                                    <span>Current Prices</span>
                                    <div style={{ fontSize: '11px', color: 'var(--secondary-text)', textAlign: 'right' }}>
                                        {assetPrices.ETH && (
                                            <div>ETH: {formatPrice(assetPrices.ETH.price)}</div>
                                        )}
                                        {assetPrices.LINK && (
                                            <div>LINK: {formatPrice(assetPrices.LINK.price)}</div>
                                        )}
                                        {assetPrices.BNB && (
                                            <div>BNB: {formatPrice(assetPrices.BNB.price)}</div>
                                        )}
                                    </div>
                                </div>
                                <div className="stat-row compact">
                                    <span>Price Updates</span>
                                    <span style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                                        {Object.keys(assetPrices).length > 0 ? 'Live Chainlink' : 'Loading...'}
                                    </span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Cross-chain Path</span>
                                    <span style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                                        {sourceChain && targetChain ? 
                                            `${getChainName(sourceChain)} → ${getChainName(targetChain)}` :
                                            'Select chains'
                                        }
                                    </span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Protocol Fee</span>
                                    <span>0.1%</span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Est. Bridge Time</span>
                                    <span>~7 minutes</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>



            {/* Toast Container for notifications */}
            <ToastContainer />

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default Home;
