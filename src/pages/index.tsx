import React, { useState } from 'react';
import MultiAssetSelector from '../components/MultiAssetSelector';
import ImprovedNetworkSelector from '../components/ImprovedNetworkSelector';
import CrossChainAssetSelector from '../components/CrossChainAssetSelector';
import Dropdown from '../components/Dropdown';

interface AssetAllocation {
    id: string;
    symbol: string;
    amount: number;
    value: number;
    percentage: number;
    color: string;
}

interface Asset {
    id: string;
    symbol: string;
    name: string;
    price: number;
    balance: number;
    icon: string;
}

const Home: React.FC = () => {
    const [activeTab, setActiveTab] = useState('borrow');
    const [collateralAmount, setCollateralAmount] = useState('');
    const [bridgeAmount, setBridgeAmount] = useState('');
    
    // Lending related states
    const [sourceChain, setSourceChain] = useState('ethereum'); // Collateral source chain
    const [targetChain, setTargetChain] = useState('optimism'); // Borrowing target chain
    const [collateralAsset, setCollateralAsset] = useState('eth');
    const [selectedAssets, setSelectedAssets] = useState<AssetAllocation[]>([]);

    // Cross-chain related states
    const [bridgeSourceChain, setBridgeSourceChain] = useState('ethereum');
    const [bridgeTargetChain, setBridgeTargetChain] = useState('optimism');
    const [bridgeAsset, setBridgeAsset] = useState('eth');
    const [bridgeTargetAssets, setBridgeTargetAssets] = useState<AssetAllocation[]>([]);

    // Dropdown options definition
    const chainOptions = [
        { value: 'ethereum', label: 'Ethereum', icon: 'ETH', description: 'Layer 1 - High Security' },
        { value: 'optimism', label: 'Optimism', icon: 'OP', description: 'Layer 2 - Low Fees' },
        { value: 'arbitrum', label: 'Arbitrum', icon: 'ARB', description: 'Layer 2 - Fast Confirmation' },
        { value: 'polygon', label: 'Polygon', icon: 'POLY', description: 'Sidechain - High TPS' },
        { value: 'avalanche', label: 'Avalanche', icon: 'AVAX', description: 'Layer 1 - Rich Ecosystem' }
    ];

    const assetOptions = [
        { value: 'eth', label: 'ETH', icon: 'ETH', description: 'Ethereum Native Token' },
        { value: 'weth', label: 'WETH', icon: 'WETH', description: 'Wrapped Ethereum' },
        { value: 'usdc', label: 'USDC', icon: 'USDC', description: 'USD Coin' },
        { value: 'usdt', label: 'USDT', icon: 'USDT', description: 'Tether USD' },
        { value: 'dai', label: 'DAI', icon: 'DAI', description: 'Dai Stablecoin' }
    ];

    const sourceAsset: Asset = {
        id: 'eth',
        symbol: 'ETH',
        name: 'Ethereum',
        price: 3000,
        balance: 0.0123,
        icon: 'ETH'
    };

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
    };

    const calculateUSDValue = (amount: string, price: number = 3000) => {
        const value = parseFloat(amount) || 0;
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

    const handleBridgeTargetAssetsChange = (assets: AssetAllocation[]) => {
        setBridgeTargetAssets(assets);
    };

    const getChainName = (chainId: string) => {
        const chain = chainOptions.find(c => c.value === chainId);
        return chain ? chain.label : chainId;
    };

    const getChainIcon = (chainId: string) => {
        const chain = chainOptions.find(c => c.value === chainId);
        return chain ? chain.icon : 'ETH';
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
                                options={chainOptions.filter(c => ['ethereum', 'polygon', 'avalanche'].includes(c.value))}
                                value={sourceChain}
                                onChange={setSourceChain}
                                placeholder="Select collateral chain"
                            />

                            {/* Collateral Section */}
                            <div className="section-title">Collateral Asset</div>
                            <div className="input-card">
                                <input
                                    type="text"
                                    className="amount-input"
                                    placeholder="0.00"
                                    value={collateralAmount}
                                    onChange={(e) => setCollateralAmount(e.target.value)}
                                />
                                <div className="amount-value">${calculateUSDValue(collateralAmount)}</div>
                                <div className="token-balance">
                                    <span>Balance: 0.0123</span>
                                    <i className="fas fa-wallet"></i>
                                </div>
                            </div>

                            <Dropdown
                                options={assetOptions.filter(a => ['eth', 'weth'].includes(a.value))}
                                value={collateralAsset}
                                onChange={setCollateralAsset}
                                placeholder="Select collateral asset"
                            />

                            {/* Step 2: Borrowing Target Chain */}
                            <div className="section-title">Step 2: Select Borrowing Target Chain</div>
                            <Dropdown
                                options={chainOptions.filter(c => ['optimism', 'arbitrum', 'polygon', 'avalanche'].includes(c.value))}
                                value={targetChain}
                                onChange={setTargetChain}
                                placeholder="Select borrowing chain"
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
                                    <i className="fas fa-route" style={{ color: 'var(--accent-color)' }}></i>
                                    <span>Cross-chain Path: {getChainName(sourceChain)} → {getChainName(targetChain)}</span>
                                </div>
                            </div>

                            {/* Borrowing Summary */}
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
                                    <span>Total Borrowed</span>
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

                            <button 
                                className="button primary"
                                disabled={selectedAssets.length === 0 || !collateralAmount}
                                style={{
                                    opacity: selectedAssets.length === 0 || !collateralAmount ? 0.6 : 1,
                                    cursor: selectedAssets.length === 0 || !collateralAmount ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Execute Cross-Chain Lending ({selectedAssets.length} assets)
                            </button>
                        </div>
                    )}

                    {/* Bridge Mode */}
                    {activeTab === 'bridge' && (
                        <div className="trading-mode active">
                            {/* Bridge Direction */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr auto 1fr',
                                gap: '12px',
                                alignItems: 'center',
                                marginBottom: '20px'
                            }}>
                                <div style={{ textAlign: 'center' }}>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '6px',
                                        fontSize: '13px',
                                        color: 'var(--secondary-text)'
                                    }}>Deposit Source Chain</label>
                                    <Dropdown
                                        options={chainOptions.filter(c => ['ethereum', 'polygon', 'avalanche'].includes(c.value))}
                                        value={bridgeSourceChain}
                                        onChange={setBridgeSourceChain}
                                        placeholder="Select source chain"
                                    />
                                </div>

                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'var(--accent-color)',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '14px'
                                }}>
                                    <i className="fas fa-arrow-right"></i>
                                </div>

                                <div style={{ textAlign: 'center' }}>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '6px',
                                        fontSize: '13px',
                                        color: 'var(--secondary-text)'
                                    }}>Borrow Target Chain</label>
                                    <Dropdown
                                        options={chainOptions.filter(c => ['optimism', 'arbitrum', 'polygon', 'avalanche'].includes(c.value))}
                                        value={bridgeTargetChain}
                                        onChange={setBridgeTargetChain}
                                        placeholder="Select target chain"
                                    />
                                </div>
                            </div>

                            {/* Bridge Asset & Amount */}
                            <div className="section-title">Deposit Asset</div>
                            <div className="input-card">
                                <input
                                    type="text"
                                    className="amount-input"
                                    placeholder="0.00"
                                    value={bridgeAmount}
                                    onChange={(e) => setBridgeAmount(e.target.value)}
                                />
                                <div className="amount-value">${calculateUSDValue(bridgeAmount)}</div>
                                <div className="token-balance">
                                    <span>Balance: 0.0123</span>
                                    <i className="fas fa-wallet"></i>
                                </div>
                            </div>

                            <Dropdown
                                options={assetOptions.filter(a => ['eth', 'weth', 'usdc'].includes(a.value))}
                                value={bridgeAsset}
                                onChange={setBridgeAsset}
                                placeholder="Select asset"
                            />

                            {/* Bridge Summary */}
                            <div style={{
                                marginBottom: '20px',
                                padding: '14px',
                                background: 'rgba(255, 255, 255, 0.6)',
                                borderRadius: '12px',
                                backdropFilter: 'blur(10px)'
                            }}>
                                <div className="stat-row compact">
                                    <span>Bridge Time</span>
                                    <span>~7 minutes</span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Bridge Fee</span>
                                    <span>~$2.50</span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Total Borrowable Value</span>
                                    <span>${bridgeTargetAssets.reduce((sum, asset) => sum + asset.value, 0).toFixed(2)}</span>
                                </div>
                            </div>

                            <button 
                                className="button primary"
                                disabled={bridgeTargetAssets.length === 0 || !bridgeAmount}
                                style={{
                                    opacity: bridgeTargetAssets.length === 0 || !bridgeAmount ? 0.6 : 1,
                                    cursor: bridgeTargetAssets.length === 0 || !bridgeAmount ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Execute Cross-Chain Lending ({bridgeTargetAssets.length} assets)
                            </button>
                        </div>
                    )}
                </div>

                {/* Center Panel - Multi Asset Selector or Bridge Info */}
                <div className="center-panel">
                    {activeTab === 'borrow' && (
                        <div className="glass-card">
                            <div className="section-title large">Step 3: Select Borrowing Assets</div>
                            <MultiAssetSelector 
                                selectedChain={targetChain}
                                onAssetsChange={handleAssetsChange}
                            />
                        </div>
                    )}
                    
                    {activeTab === 'bridge' && (
                        <div className="glass-card">
                            <CrossChainAssetSelector
                                sourceChain={bridgeSourceChain}
                                targetChain={bridgeTargetChain}
                                sourceAsset={sourceAsset}
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
                                    <span>Gas Fees</span>
                                    <span style={{ color: '#22c55e' }}>Low</span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Network Congestion</span>
                                    <span style={{ color: '#f59e0b' }}>Medium</span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Est. Confirmation</span>
                                    <span>~2 minutes</span>
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
                                    <span>Transaction Fee</span>
                                    <span>~$5.20</span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Bridge Fee</span>
                                    <span>~$2.50</span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Protocol Fee</span>
                                    <span>0.1%</span>
                                </div>
                                <div style={{
                                    paddingTop: '8px',
                                    borderTop: '1px solid var(--border-color)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontWeight: 600
                                }}>
                                    <span>Total Fee</span>
                                    <span style={{ color: 'var(--accent-color)' }}>~$7.70</span>
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
                                    <span>$2.5B</span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Active Users</span>
                                    <span>125,432</span>
                                </div>
                                <div className="stat-row compact">
                                    <span>Success Rate</span>
                                    <span style={{ color: '#22c55e' }}>99.8%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;