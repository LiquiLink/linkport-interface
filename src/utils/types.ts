export interface Asset {
    id: string;
    symbol: string;
    name: string;
    price: number;
    balance: string;
    icon: string;
}

export interface AssetAllocation {
    id: string;
    symbol: string;
    amount: number;
    value: number;
    percentage: number;
    color: string;
}

export interface CrossChainAssetSelectorProps {
    sourceChain: string;
    targetChain: string;
    sourceAsset: Asset | null;
    sourceAmount: number;
    onTargetAssetsChange: (assets: AssetAllocation[]) => void;
}

export interface MultiAssetSelectorProps {
    selectedChain: string;
    onAssetsChange: (assets: AssetAllocation[]) => void;
}