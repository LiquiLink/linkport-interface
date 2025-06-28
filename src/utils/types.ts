export interface Asset {
    id: string;
    symbol: string;
    name: string;
    price: number;
    balance: string;
    icon: string;
    token: string,
}

export interface AssetAllocation {
    id: string;
    symbol: string;
    amount: number;
    value: number;
    token: string,
    percentage: number;
    color: string;
}

export interface CrossChainAssetSelectorProps {
    sourceChain: number;
    targetChain: number;
    sourceAsset: Asset | null;
    sourceAmount: number;
    onTargetAssetsChange: (assets: AssetAllocation[]) => void;
}

export interface MultiAssetSelectorProps {
    selectedChain: string;
    onAssetsChange: (assets: AssetAllocation[]) => void;
}