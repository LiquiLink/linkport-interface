import React, { useState, useEffect } from 'react';
import MultiAssetSelector from '../components/MultiAssetSelector';
import ImprovedNetworkSelector from '../components/ImprovedNetworkSelector';
import CrossChainAssetSelector from '../components/CrossChainAssetSelector';
import { bsc, bscTestnet, sepolia } from 'wagmi/chains';
import { useAccount, useChainId, useProof, useSwitchChain } from 'wagmi';
import  ERC20ABI  from '../abi/ERC20.json'
import Dropdown from '../components/Dropdown';
import { poolList, chainSelector } from '../config';
import linkPortABI from '../abi/LinkPort.json';
import { getUserPosition, loan, bridge} from '@/utils/pool';
import { linkPorts } from '../config';
import { getUserAssetBalance, getBalance } from '../utils/balance';
import { getMapToken } from '../utils/port';
import { formatUnits } from 'ethers';
import { config } from '../config'
import { format } from 'path';
import { Asset, AssetAllocation } from '../utils/types';
import { getAssetPrice, getAssetPriceFromPort, getMultipleAssetPrices, formatPrice, PriceData, getMultipleAssetPricesFromPort } from '../utils/priceService';

import { useToast } from '../components/Toast';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { useTransactionCreator } from '../hooks/useTransactions';
import { getTokenIconStyle } from '../utils/ui';
import { create } from 'domain';

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

    const { 
        createBorrowTransaction, 
        createBridgeTransaction 
    } = useTransactionCreator();

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

    // Auto-recalculate collateral when staking option changes (but respect user input)
    useEffect(() => {
        // Only auto-calculate if: no manual input AND collateral is empty
        const shouldAutoCalculate = !isManualInput && collateralAmount === '';
        
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
                
                // Auto-fill only when input is completely empty
                setCollateralAmount(requiredCollateralAmount.toFixed(6));
                
                console.log('🔄 useEffect auto-calculated collateral:', {
                    trigger: 'Staking/Asset/Price change',
                    totalBorrowValue: `$${totalBorrowValue.toFixed(2)}`,
                    requiredCollateral: `${requiredCollateralAmount.toFixed(6)} ${collateralAsset.token}`
                });
            }
        } else if (isManualInput) {
            console.log('🚫 useEffect skipping auto-calculation - user has manually input');
        }
    }, [useExistingStaking, totalStakingValue, selectedAssets, collateralAsset, assetPrices, isManualInput]); // Remove collateralAmount dependency

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
        
        // Clear collateral amount when no assets are selected
        if (assets.length === 0) {
            // Only clear if user hasn't manually input anything
            if (!isManualInput) {
                setCollateralAmount('');
            }
            return;
        }
        
        // Check current collateral amount value to determine if we should auto-calculate
        // This prevents race conditions with state updates
        const currentCollateralAmount = collateralAmount;
        const hasCollateralValue = currentCollateralAmount !== '' && parseFloat(currentCollateralAmount || '0') > 0;
        
        // Auto-calculate when:
        // 1. User hasn't manually input (isManualInput is false)
        // 2. AND we have collateral asset selected
        // 3. AND (collateral field is empty OR this is borrowing assets change - not manual input)
        const shouldAutoCalculate = !isManualInput && collateralAsset;
        
        if (assets.length > 0 && shouldAutoCalculate) {
            const totalBorrowValue = assets.reduce((sum, asset) => sum + asset.value, 0);
            
            // Debug: detailed asset information
            console.log('🔍 Debug asset calculation - DETAILED:', {
                assetsArray: assets,
                assetsCount: assets.length,
                individualAssets: assets.map(asset => ({ 
                    id: asset.id,
                    symbol: asset.symbol,
                    token: asset.token, 
                    amount: asset.amount, 
                    value: asset.value,
                    percentage: asset.percentage,
                    type: typeof asset.value,
                    isNumber: !isNaN(asset.value)
                })),
                totalBorrowValue: totalBorrowValue,
                totalBorrowValueType: typeof totalBorrowValue,
                calculationStep: `${assets.map(a => `${a.symbol}: ${a.amount} × price = $${a.value}`).join(', ')}`,
                sumCalculation: `Total = ${assets.map(a => a.value).join(' + ')} = ${totalBorrowValue}`,
                useExistingStaking: useExistingStaking,
                totalStakingValue: totalStakingValue,
                collateralAssetPrice: assetPrices[collateralAsset.token]
            });
            
            if (totalBorrowValue > 0) {
                // Calculate required total collateral value (LTV = 75%)
                const requiredTotalCollateralValue = totalBorrowValue / 0.75;
                
                // Subtract existing staking value if enabled
                const existingStakingValue = useExistingStaking ? totalStakingValue : 0;
                const requiredNewCollateralValue = Math.max(0, requiredTotalCollateralValue - existingStakingValue);
                
                // Convert to collateral asset amount
                const assetPrice = assetPrices[collateralAsset.token]?.price || 1; // Use 1 as fallback for stablecoins
                const requiredCollateralAmount = requiredNewCollateralValue / assetPrice;
                
                // Auto-fill only when appropriate
                setCollateralAmount(requiredCollateralAmount.toFixed(6));
                
                console.log('🔄 Auto-calculated collateral:', {
                    totalBorrowValue: `$${totalBorrowValue.toFixed(2)}`,
                    requiredTotalCollateralValue: `$${requiredTotalCollateralValue.toFixed(2)}`,
                    existingStakingValue: `$${existingStakingValue.toFixed(2)}`,
                    requiredNewCollateralValue: `$${requiredNewCollateralValue.toFixed(2)}`,
                    assetPrice: `$${assetPrice}`,
                    requiredCollateral: `${requiredCollateralAmount.toFixed(6)} ${collateralAsset.token}`,
                    reason: 'Empty input, auto-calculating',
                    calculations: {
                        ltv: '75%',
                        formula: `${totalBorrowValue} / 0.75 - ${existingStakingValue} = ${requiredNewCollateralValue}`
                    }
                });
            }
        } else {
            let reason = 'Unknown';
            if (isManualInput) reason = 'User is manually inputting';
            else if (!collateralAsset) reason = 'No collateral asset selected';
            else if (assets.length === 0) reason = 'No borrowing assets selected';
            
            console.log(`🚫 Skipping auto-calculation - ${reason}`, {
                isManualInput,
                currentCollateralAmount,
                hasCollateralValue,
                assetsCount: assets.length,
                hasCollateralAsset: !!collateralAsset,
                shouldAutoCalculate: shouldAutoCalculate
            });
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
        setCollateralAmount(value);
        
        // Set manual input state based on whether user is actively typing
        // When user clears the field, reset manual input to allow reverse calculation
        if (value === '') {
            setIsManualInput(false);
            console.log('🔄 User cleared collateral field - enabling reverse calculation');
        } else {
            setIsManualInput(true);
            console.log('🎯 User typing in collateral field - disabling reverse calculation');
        }
        
        console.log('🎯 User input change:', {
            value,
            isManualInput: value !== '',
            selectedAssetsCount: selectedAssets.length,
            timestamp: new Date().toLocaleTimeString()
        });
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
    const { writeContract: writeContractLoan, isPending: isPendingLoan} = useWriteContract();
    const { writeContract: writeContractBridge, isPending: isPendingBridge} = useWriteContract();
    const { writeContract: writeContractApprove, isPending: isPendingApprove} = useWriteContract();

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

            const totalBorrowValue = selectedAssets.reduce((sum, asset) => sum + asset.value, 0);

            const linkPort = chainId == sepolia.id ? linkPorts[sepolia.id] : linkPorts[bscTestnet.id];
            const destChainSelector = targetChain == sepolia.id ? chainSelector[sepolia.id] : chainSelector[bscTestnet.id];

            await writeContractApprove({
                address: collateralAsset.token as `0x${string}`,
                abi: ERC20ABI,
                functionName: 'approve',
                args: [linkPort as `0x${string}`, parseEther(collateralAmount)],
                chainId: chainId == sepolia.id ? sepolia.id : bscTestnet.id,
            }, 
            {
                onSuccess: (txHash) => {
                    console.log('✅ Approval successful:', txHash);
                    showToast('Approval confirmed! Now borrowing...', 'success');
                },
                onError: (error) => {
                    console.error('❌ Approval failed:', error);
                    showToast('Approval failed: ' + error.message, 'error');
                }
            });


            await writeContractLoan({
                address: linkPort as `0x${string}`,
                abi: linkPortABI,
                functionName: 'loan',
                args: [destChainSelector, collateralAsset.token, selectedAssets.map(asset => asset.token), selectedAssets.map(asset => parseEther(asset.amount.toString())), selectedAssets.map(asset => parseEther((asset.value * collateralAmount / totalBorrowValue).toString()))],
                chainId: chainId == sepolia.id ? sepolia.id : bscTestnet.id,
            }, 
            {
                onSuccess: async (txHash) => {
                    console.log('✅ Borrow successful:', txHash)
                    try {
                        await createBorrowTransaction(
                            collateralAsset.symbol,
                            collateralAmount,
                            totalBorrowValue.toString(),
                            getChainName(sourceChain),
                            getChainName(targetChain),
                            txHash,
                        );
                        console.log('📝 Transaction record created');
                    } catch (error) {
                        console.error('❌ Failed to create transaction record:', error);
                    }
                    showToast('Approval confirmed! Now depositing...', 'success');
                },
                onError: (error) => {
                    console.error('❌ Approval failed:', error);
                    showToast('Approval failed: ' + error.message, 'error');
                }
            })

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
                {/* Left Panel - Enhanced Trading Interface */}
                <div className="glass-card main-trading-panel">
                    {/* Compact Tab Navigation */}
                    <div className="tab-navigation">
                        <button 
                            className={`tab ${activeTab === 'borrow' ? 'active' : ''}`}
                            onClick={() => handleTabChange('borrow')}
                        >
                            Lending
                        </button>
                        <button 
                            className={`tab ${activeTab === 'bridge' ? 'active' : ''}`}
                            onClick={() => handleTabChange('bridge')}
                        >
                            Bridge
                        </button>
                    </div>

                    {/* Lending Mode */}
                    {activeTab === 'borrow' && (
                        <div className="trading-mode active animate-fade-in">
                            {/* Step 1: Collateral Source Chain */}
                            <div className="section-title">
                                Select Collateral Source Chain
                            </div>
                            <Dropdown
                                options={chainOptions}
                                value={sourceChain}
                                onChange={setSourceChain}
                                placeholder="Select collateral chain"
                            />

                            {/* Collateral Asset Selection */}
                            <div className="section-title" style={{ marginTop: 'var(--space-lg)' }}>
                                Collateral Asset
                            </div>
                            <Dropdown
                                options={assetOptions}
                                value={collateralAsset ? collateralAsset.value : ''}
                                onChange={handleSourceAssetsChange}
                                placeholder="Select collateral asset"
                            />

                            {/* Enhanced Staking Positions Display */}
                            {userStakingPositions.length > 0 && (
                                <div className="glass-card status-success" style={{
                                    margin: 'var(--space-md) 0',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: '2px',
                                        background: 'var(--accent-gradient)'
                                    }} />
                                    
                                    {/* Header */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        marginBottom: 'var(--space-sm)',
                                        gap: 'var(--space-sm)'
                                    }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            background: 'var(--accent-gradient)',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white'
                                        }}>
                                            <i className="fas fa-piggy-bank" />
                                        </div>
                                        <div>
                                            <div style={{
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                color: 'var(--text-primary)'
                                            }}>
                                                Your Staking on {getChainName(sourceChain).split(' ')[0]}
                                            </div>
                                            <div style={{
                                                fontSize: '12px',
                                                color: 'var(--text-secondary)'
                                            }}>
                                                Total Value: <span className="text-gradient" style={{ fontWeight: 600 }}>
                                                    ${totalStakingValue.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Staking positions grid */}
                                    <div className="multi-asset-grid" style={{ 
                                        gap: 'var(--space-sm)',
                                        marginBottom: 'var(--space-md)'
                                    }}>
                                        {userStakingPositions.map((position, index) => (
                                            <div key={index} className="glass-card" style={{
                                                padding: 'var(--space-sm)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--space-sm)',
                                                background: 'var(--bg-glass)',
                                                borderColor: 'var(--success)'
                                            }}>
                                                <div className={`token-icon small ${position.token.toLowerCase()}`}>
                                                    {position.token.slice(0, 3)}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        color: 'var(--text-primary)'
                                                    }}>
                                                        {parseFloat(position.amount).toFixed(2)} {position.token}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '11px',
                                                        color: 'var(--text-secondary)'
                                                    }}>
                                                        ${position.value.toFixed(0)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Enhanced staking option */}
                                    <div className="glass-card" style={{
                                        padding: 'var(--space-md)',
                                        background: useExistingStaking ? 'rgba(6, 182, 212, 0.1)' : 'var(--bg-glass)',
                                        borderColor: useExistingStaking ? 'var(--accent-primary)' : 'var(--border-glass)',
                                        transition: 'all var(--transition-normal)'
                                    }}>
                                        <label style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-sm)',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            color: 'var(--text-primary)'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={useExistingStaking}
                                                onChange={(e) => setUseExistingStaking(e.target.checked)}
                                                style={{
                                                    width: '16px',
                                                    height: '16px',
                                                    accentColor: 'var(--accent-primary)'
                                                }}
                                            />
                                            <i className="fas fa-shield-alt" style={{ color: 'var(--accent-primary)' }} />
                                            Use as additional collateral
                                            {useExistingStaking && (
                                                <span style={{
                                                    marginLeft: 'auto',
                                                    color: 'var(--success)',
                                                    fontWeight: 600,
                                                    fontSize: '12px'
                                                }}>
                                                    <i className="fas fa-check-circle" /> Enabled
                                                </span>
                                            )}
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Enhanced Collateral Amount Input */}
                            {collateralAsset && (
                                <div className="animate-slide-in">
                                    <div className="section-title" style={{ marginTop: 'var(--space-lg)' }}>
                                        {useExistingStaking ? 'Additional Collateral Amount (Optional)' : 'Collateral Amount'}
                                    </div>
                                    <div className="input-card">
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-sm)',
                                            marginBottom: 'var(--space-sm)'
                                        }}>
                                            <div className={`token-icon ${collateralAsset?.icon?.toLowerCase() || 'default'}`}>
                                                {collateralAsset?.icon || 'ETH'}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <input
                                                    type="text"
                                                    className="amount-input"
                                                    placeholder={selectedAssets.length > 0 ? "Auto-calculated (editable)" : (useExistingStaking ? "Additional amount" : "Enter amount")}
                                                    value={collateralAmount}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                                            const dotCount = (value.match(/\./g) || []).length;
                                                            if (dotCount <= 1) {
                                                                handleCollateralAmountChange(value);
                                                                if (value !== '' && parseFloat(value) > parseFloat(collateralAsset.amount || '0')) {
                                                                    showToast('Warning: Amount exceeds available balance', 'warning');
                                                                }
                                                            }
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <button
                                                onClick={handleMaxCollateral}
                                                className="max-button"
                                            >
                                                MAX
                                            </button>
                                        </div>
                                        
                                        <div className="amount-value">
                                            ${calculateUSDValue(collateralAmount, collateralAsset?.token || 'ETH')}
                                        </div>
                                        
                                        <div className="token-balance">
                                            <span>Balance: {collateralAsset ? collateralAsset.amount : '0'}</span>
                                            <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                                                {collateralAsset?.icon || 'ETH'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Auto-calculation hint */}
                                    {selectedAssets.length > 0 && (
                                        <div className="glass-card" style={{
                                            background: 'rgba(6, 182, 212, 0.05)',
                                            borderColor: 'var(--accent-primary)',
                                            padding: 'var(--space-sm)',
                                            marginTop: 'var(--space-sm)'
                                        }}>
                                            <div style={{
                                                fontSize: '12px',
                                                color: 'var(--accent-primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--space-xs)'
                                            }}>
                                                <i className="fas fa-lightbulb" />
                                                Auto-calculated for ${selectedAssets.reduce((sum, asset) => sum + asset.value, 0).toFixed(2)} borrowing
                                                <span style={{ marginLeft: 'auto', fontSize: '11px' }}>
                                                    (Editable)
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 2: Lending Target Chain */}
                            <div className="section-title" style={{ marginTop: 'var(--space-lg)' }}>
                                Select Lending Target Chain
                            </div>
                            <Dropdown
                                options={chainOptions.filter(c => c.value !== sourceChain)}
                                value={targetChain}
                                onChange={setTargetChain}
                                placeholder="Select lending chain"
                            />

                            {/* Enhanced Health Factor Warning */}
                            {calculateHealthFactor() <= 50 && selectedAssets.length > 0 && collateralAmount && (
                                <div className="glass-card status-danger animate-pulse" style={{
                                    margin: 'var(--space-md) 0',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: '2px',
                                        background: 'var(--danger)'
                                    }} />
                                    
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-sm)',
                                        marginBottom: 'var(--space-sm)'
                                    }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            background: 'var(--danger)',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white'
                                        }}>
                                            <i className="fas fa-exclamation-triangle" />
                                        </div>
                                        <div>
                                            <div style={{
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                color: 'var(--danger)'
                                            }}>
                                                Risk Too High - Health Factor: {calculateHealthFactor().toFixed(0)}%
                                            </div>
                                            <div style={{ 
                                                fontSize: '12px', 
                                                color: 'var(--danger)',
                                                lineHeight: 1.4
                                            }}>
                                                Reduce lending amount or increase collateral. Health factor must be above 50%.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Execute Button */}
                            <button 
                                className={`button button-primary button-full ${(selectedAssets.length === 0 || !collateralAmount || calculateHealthFactor() <= 50) ? 'disabled' : ''}`}
                                onClick={handleLendingExecute}
                                disabled={
                                    selectedAssets.length === 0 || 
                                    !collateralAmount || 
                                    calculateHealthFactor() <= 50
                                }
                                style={{
                                    marginTop: 'var(--space-lg)'
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
                        <div className="trading-mode active animate-fade-in">
                            {/* Step 1: Bridge Source Chain */}
                            <div className="section-title">
                                Select Source Chain
                            </div>
                            <Dropdown
                                options={chainOptions}
                                value={bridgeSourceChain}
                                onChange={setBridgeSourceChain}
                                placeholder="Select source chain"
                            />

                            {/* Source Asset Selection */}
                            <div className="section-title" style={{ marginTop: 'var(--space-lg)' }}>
                                Source Asset
                            </div>
                            <Dropdown
                                options={bridgeAssetOptions}
                                value={bridgeAsset ? bridgeAsset.value : ''}
                                onChange={handleBridgeSourceAssetsChange}
                                placeholder="Select asset to bridge"
                            />

                            {/* Enhanced Source Amount Input */}
                            {bridgeAsset && (
                                <div className="animate-slide-in">
                                    <div className="section-title" style={{ marginTop: 'var(--space-lg)' }}>
                                        Source Amount
                                    </div>
                                    <div className="input-card">
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-sm)',
                                            marginBottom: 'var(--space-sm)'
                                        }}>
                                            <div className={`token-icon ${bridgeAsset?.icon?.toLowerCase() || 'default'}`}>
                                                {bridgeAsset?.icon || 'ETH'}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <input
                                                    type="text"
                                                    className="amount-input"
                                                    placeholder="Enter amount"
                                                    value={bridgeAmount}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
                                                            const dotCount = (value.match(/\./g) || []).length;
                                                            if (dotCount <= 1) {
                                                                setBridgeAmount(value);
                                                            }
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <button
                                                onClick={handleMaxBridge}
                                                className="max-button"
                                            >
                                                MAX
                                            </button>
                                        </div>
                                        
                                        <div className="amount-value">
                                            ${calculateUSDValue(bridgeAmount, bridgeAsset?.token || 'ETH')}
                                        </div>
                                        
                                        <div className="token-balance">
                                            <span>Balance: {bridgeAsset ? bridgeAsset.amount : '0'}</span>
                                            <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                                                {bridgeAsset?.icon || 'ETH'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Target Chain */}
                            <div className="section-title" style={{ marginTop: 'var(--space-lg)' }}>
                                Select Target Chain
                            </div>
                            <Dropdown
                                options={chainOptions.filter(c => c.value !== bridgeSourceChain)}
                                value={bridgeTargetChain}
                                onChange={setBridgeTargetChain}
                                placeholder="Select target chain"
                            />

                            {/* Enhanced Bridge Info */}
                            {bridgeTargetChain && (
                                <div className="glass-card" style={{
                                    background: 'rgba(6, 182, 212, 0.1)',
                                    borderColor: 'var(--accent-primary)',
                                    margin: 'var(--space-md) 0'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-sm)',
                                        fontSize: '14px',
                                        color: 'var(--text-primary)'
                                    }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            background: 'var(--accent-gradient)',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white'
                                        }}>
                                            <i className="fas fa-route" />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>Bridge Path</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                {getChainName(bridgeSourceChain)} → {getChainName(bridgeTargetChain)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Enhanced Bridge Summary */}
                            {bridgeAmount && bridgeTargetChain && (
                                <div className="glass-card animate-slide-in" style={{
                                    margin: 'var(--space-md) 0'
                                }}>
                                    <div className="section-title" style={{ marginBottom: 'var(--space-md)' }}>
                                        <i className="fas fa-chart-bar" />
                                        Bridge Summary
                                    </div>
                                    
                                    <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                                        <div className="stat-row">
                                            <span className="stat-label">Source Amount</span>
                                            <span className="stat-value">{bridgeAmount} {bridgeAsset?.label}</span>
                                        </div>
                                        <div className="stat-row">
                                            <span className="stat-label">Target Assets</span>
                                            <span className="stat-value">{bridgeTargetAssets.length} types</span>
                                        </div>
                                        <div className="stat-row">
                                            <span className="stat-label">Total Bridgeable</span>
                                            <span className="stat-value text-gradient">
                                                ${bridgeTargetAssets.reduce((sum, asset) => sum + asset.value, 0).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="stat-row">
                                            <span className="stat-label">Bridge Fee</span>
                                            <span className="stat-value">~$2.50</span>
                                        </div>
                                        <div className="stat-row">
                                            <span className="stat-label">Est. Time</span>
                                            <span className="stat-value">~7 minutes</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Bridge Execute Button */}
                            <button 
                                className={`button button-primary button-full ${(bridgeTargetAssets.length === 0 || !bridgeAmount || !bridgeTargetChain || !bridgeAsset) ? 'disabled' : ''}`}
                                onClick={handleBridgeExecute}
                                disabled={
                                    bridgeTargetAssets.length === 0 || 
                                    !bridgeAmount || 
                                    !bridgeTargetChain ||
                                    !bridgeAsset
                                }
                                style={{
                                    marginTop: 'var(--space-lg)'
                                }}
                            >
                                Execute Cross-Chain Bridge ({bridgeTargetAssets.length} assets)
                            </button>
                        </div>
                    )}
                </div>

                {/* Center Panel - Multi Asset Selector */}
                <div className="center-panel">
                    {activeTab === 'borrow' && (
                        <div className="glass-card animate-slide-in">
                            <div className="section-title large">
                                Select Lending Assets
                            </div>
                            <MultiAssetSelector 
                                selectedChain={targetChain}
                                onAssetsChange={handleAssetsChange}
                            />
                        </div>
                    )}
                    
                    {activeTab === 'bridge' && (
                        <div className="glass-card animate-slide-in">
                            <div className="section-title large">
                                Select Target Assets
                            </div>
                            <CrossChainAssetSelector
                                sourceChain={parseInt(bridgeSourceChain)}
                                targetChain={parseInt(bridgeTargetChain)}
                                sourceAsset={{
                                    ...bridgeAsset,
                                    price: bridgeAsset?.token ? 
                                        (assetPrices[bridgeAsset.token]?.price || 
                                         calculateUSDValue('1', bridgeAsset.token) ||
                                         (bridgeAsset.label === 'ETH' ? assetPrices.ETH?.price || 2500 :
                                          bridgeAsset.label === 'USDT' ? 1 :
                                          bridgeAsset.label === 'LINK' ? assetPrices.LINK?.price || 15 :
                                          bridgeAsset.label === 'BNB' ? assetPrices.BNB?.price || 660 : 1)) :
                                        assetPrices.ETH?.price || 2500
                                }}
                                sourceAmount={parseFloat(bridgeAmount) || 0}
                                onTargetAssetsChange={handleBridgeTargetAssetsChange}
                            />
                        </div>
                    )}
                </div>

                {/* Right Panel - Summary Dashboard */}
                <div className="info-panel">
                    <div className="glass-card">
                        {/* Dynamic Header based on activeTab */}
                        <div style={{
                            marginBottom: 'var(--space-md)',
                            paddingBottom: 'var(--space-sm)',
                            borderBottom: '1px solid var(--border-glass)'
                        }}>
                            <h3 style={{
                                margin: 0,
                                fontSize: '16px',
                                fontWeight: 700,
                                color: 'var(--text-primary)'
                            }}>
                                {activeTab === 'bridge' ? 'Bridge Summary' : 'Portfolio Summary'}
                            </h3>
                            <div style={{
                                fontSize: '12px',
                                color: 'var(--text-secondary)',
                                marginTop: '4px'
                            }}>
                                {activeTab === 'bridge' ? 'Cross-Chain Bridge Overview' : 'Collateral & Lending Overview'}
                            </div>
                        </div>

                        {/* Bridge Mode Summary */}
                        {activeTab === 'bridge' && (
                            <>
                                {/* Bridge Statistics */}
                                <div className="glass-card" style={{ marginBottom: 'var(--space-lg)' }}>
                                    <div className="stat-row highlight">
                                        <span className="stat-label">
                                            <i className="fas fa-bridge" style={{ marginRight: 'var(--space-xs)' }} />
                                            Total Bridge Value
                                        </span>
                                        <span className="stat-value" style={{ fontSize: '18px', fontWeight: 700 }}>
                                            ${bridgeTargetAssets.reduce((sum, asset) => sum + asset.value, 0).toFixed(2)}
                                        </span>
                                    </div>
                                    
                                    {/* Bridge breakdown */}
                                    {bridgeAmount && bridgeAsset && (
                                        <div className="stat-row" style={{ fontSize: '13px', marginTop: 'var(--space-sm)' }}>
                                            <span className="stat-label">• Source amount</span>
                                            <span className="stat-value">{bridgeAmount} {bridgeAsset?.label}</span>
                                        </div>
                                    )}
                                    
                                    {bridgeTargetAssets.length > 0 && (
                                        <div className="stat-row" style={{ fontSize: '13px', marginTop: 'var(--space-sm)' }}>
                                            <span className="stat-label">• Target assets</span>
                                            <span className="stat-value">{bridgeTargetAssets.length} types</span>
                                        </div>
                                    )}
                                </div>

                                {/* Bridge Information */}
                                <div className="glass-card" style={{ marginBottom: 'var(--space-lg)' }}>
                                    <h4 className="section-title" style={{ fontSize: '16px' }}>
                                        <i className="fas fa-exchange-alt" />
                                        Bridge Information
                                    </h4>
                                    
                                    <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                                        <div className="stat-row">
                                            <span className="stat-label">Source Chain</span>
                                            <span className="stat-value">{getChainName(bridgeSourceChain)}</span>
                                        </div>
                                        <div className="stat-row">
                                            <span className="stat-label">Target Chain</span>
                                            <span className="stat-value">{bridgeTargetChain ? getChainName(bridgeTargetChain) : 'Not selected'}</span>
                                        </div>
                                        <div className="stat-row">
                                            <span className="stat-label">Bridge Fee</span>
                                            <span className="stat-value">~$2.50</span>
                                        </div>
                                        <div className="stat-row">
                                            <span className="stat-label">Est. Bridge Time</span>
                                            <span className="stat-value">~7 minutes</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Bridge Market Information */}
                                <div className="glass-card">
                                    <h4 className="section-title" style={{ fontSize: '16px' }}>
                                        <i className="fas fa-globe" />
                                        Market Information
                                    </h4>
                                    
                                    <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                                        <div className="stat-row">
                                            <span className="stat-label">Current Prices</span>
                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'right' }}>
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
                                        <div className="stat-row">
                                            <span className="stat-label">Price Updates</span>
                                            <span className="stat-value" style={{ 
                                                fontSize: '12px',
                                                color: Object.keys(assetPrices).length > 0 ? 'var(--success)' : 'var(--warning)'
                                            }}>
                                                {Object.keys(assetPrices).length > 0 ? 
                                                    <>
                                                        <i className="fas fa-satellite-dish" /> Live Chainlink
                                                    </> : 
                                                    <>
                                                        <i className="fas fa-spinner animate-spin" /> Loading...
                                                    </>
                                                }
                                            </span>
                                        </div>
                                        <div className="stat-row">
                                            <span className="stat-label">Protocol Fee</span>
                                            <span className="stat-value">0.1%</span>
                                        </div>
                                        <div className="stat-row">
                                            <span className="stat-label">Network Status</span>
                                            <span className="stat-value" style={{ fontSize: '12px', color: 'var(--success)' }}>
                                                <i className="fas fa-check-circle" /> Operational
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Lending Mode Summary */}
                        {activeTab === 'borrow' && (
                            <>
                                {/* Enhanced Health Factor Display */}
                                <div className="health-indicator" style={{
                                    background: calculateHealthFactor() > 75 ? 
                                        'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05))' : 
                                        calculateHealthFactor() > 50 ? 
                                        'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05))' : 
                                        'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05))',
                                    borderColor: calculateHealthFactor() > 75 ? 'var(--success)' : 
                                                calculateHealthFactor() > 50 ? 'var(--warning)' : 'var(--danger)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: '3px',
                                        background: calculateHealthFactor() > 75 ? 
                                            'linear-gradient(90deg, var(--success), #10b981)' : 
                                            calculateHealthFactor() > 50 ? 
                                            'linear-gradient(90deg, var(--warning), #f59e0b)' : 
                                            'linear-gradient(90deg, var(--danger), #ef4444)'
                                    }} />
                                    
                                    <div className="health-label">
                                        <i className="fas fa-heart-pulse" />
                                        Health Factor
                                    </div>
                                    
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: 'var(--space-sm)'
                                    }}>
                                        <div className="health-bar">
                                            <div 
                                                className="health-fill"
                                                style={{
                                                    width: `${Math.min(100, calculateHealthFactor())}%`
                                                }}
                                            />
                                        </div>
                                        <div className={`health-value ${calculateHealthFactor() > 75 ? 'health-good' : 
                                                      calculateHealthFactor() > 50 ? 'health-warning' : 'health-danger'}`}>
                                            {calculateHealthFactor().toFixed(0)}%
                                        </div>
                                    </div>
                                    
                                    <div style={{
                                        fontSize: '12px',
                                        textAlign: 'center',
                                        color: calculateHealthFactor() > 75 ? 'var(--success)' : 
                                               calculateHealthFactor() > 50 ? 'var(--warning)' : 'var(--danger)',
                                        fontWeight: 600
                                    }}>
                                        {calculateHealthFactor() > 75 ? '✅ Healthy - Low Risk' : 
                                         calculateHealthFactor() > 50 ? '⚠️ Moderate Risk' : 
                                         '🚨 High Risk - Increase Collateral'}
                                    </div>
                                </div>

                                {/* Enhanced Total Collateral */}
                                <div className="glass-card" style={{ marginBottom: 'var(--space-lg)' }}>
                                    <div className="stat-row highlight">
                                        <span className="stat-label">
                                            <i className="fas fa-shield-alt" style={{ marginRight: 'var(--space-xs)' }} />
                                            Total Collateral Value
                                        </span>
                                        <span className="stat-value" style={{ fontSize: '18px', fontWeight: 700 }}>
                                            ${calculateTotalCollateralValue().toFixed(2)}
                                        </span>
                                    </div>
                                    
                                    {/* Collateral breakdown */}
                                    {useExistingStaking && totalStakingValue > 0 && (
                                        <div className="stat-row" style={{ fontSize: '13px', marginTop: 'var(--space-sm)' }}>
                                            <span className="stat-label">• From staking positions</span>
                                            <span className="stat-value">${totalStakingValue.toFixed(2)}</span>
                                        </div>
                                    )}
                                    
                                    {collateralAmount && (
                                        <div className="stat-row" style={{ fontSize: '13px', marginTop: 'var(--space-sm)' }}>
                                            <span className="stat-label">• From new collateral</span>
                                            <span className="stat-value">
                                                ${calculateUSDValue(collateralAmount, collateralAsset?.token || 'ETH')}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Enhanced Borrowing Information */}
                                <div className="glass-card" style={{ marginBottom: 'var(--space-lg)' }}>
                                    <h4 className="section-title" style={{ fontSize: '16px' }}>
                                        <i className="fas fa-chart-pie" />
                                        Borrowing Information
                                    </h4>
                                    
                                    <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                                        <div className="stat-row highlight" style={{ marginBottom: 'var(--space-sm)' }}>
                                            <span className="stat-label">Max Borrowing Capacity (75% LTV)</span>
                                            <span className="stat-value text-gradient" style={{ fontWeight: 700 }}>
                                                ${calculateMaxBorrow(collateralAmount)}
                                            </span>
                                        </div>
                                        
                                        <div className="stat-row">
                                            <span className="stat-label">Selected Assets to Borrow</span>
                                            <span className="stat-value">{selectedAssets.length} types</span>
                                        </div>
                                        <div className="stat-row">
                                            <span className="stat-label">Total Borrowing Amount</span>
                                            <span className="stat-value">
                                                ${selectedAssets.reduce((sum, asset) => sum + asset.value, 0).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="stat-row">
                                            <span className="stat-label">Est. Interest Rate</span>
                                            <span className="stat-value">2.5%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Enhanced Market Information */}
                                <div className="glass-card">
                                    <h4 className="section-title" style={{ fontSize: '16px' }}>
                                        <i className="fas fa-globe" />
                                        Market Information
                                    </h4>
                                    
                                    <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                                        <div className="stat-row">
                                            <span className="stat-label">Current Prices</span>
                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'right' }}>
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
                                        <div className="stat-row">
                                            <span className="stat-label">Price Updates</span>
                                            <span className="stat-value" style={{ 
                                                fontSize: '12px',
                                                color: Object.keys(assetPrices).length > 0 ? 'var(--success)' : 'var(--warning)'
                                            }}>
                                                {Object.keys(assetPrices).length > 0 ? 
                                                    <>
                                                        <i className="fas fa-satellite-dish" /> Live Chainlink
                                                    </> : 
                                                    <>
                                                        <i className="fas fa-spinner animate-spin" /> Loading...
                                                    </>
                                                }
                                            </span>
                                        </div>
                                        <div className="stat-row">
                                            <span className="stat-label">Cross-chain Path</span>
                                            <span className="stat-value" style={{ fontSize: '12px' }}>
                                                {sourceChain && targetChain ? 
                                                    <>
                                                        <i className="fas fa-route" /> {getChainName(sourceChain)} → {getChainName(targetChain)}
                                                    </> :
                                                    'Select chains'
                                                }
                                            </span>
                                        </div>
                                        <div className="stat-row">
                                            <span className="stat-label">Protocol Fee</span>
                                            <span className="stat-value">0.1%</span>
                                        </div>
                                        <div className="stat-row">
                                            <span className="stat-label">Est. Bridge Time</span>
                                            <span className="stat-value">~7 minutes</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Toast Container for notifications */}
            <ToastContainer />
        </div>
    );
};

export default Home;
