import { readContract } from 'wagmi/actions';
import { config, linkPorts } from '../config';
import { sepolia, bscTestnet, bsc } from 'wagmi/chains';
import  LinkPortABI  from '../abi/LinkPort.json';
import  ERC20ABI from '../abi/ERC20.json';

// Chainlink Price Feed ABI (只需要latestRoundData函数)
const CHAINLINK_ABI = [
  {
    inputs: [],
    name: "latestRoundData",
    outputs: [
      { internalType: "uint80", name: "roundId", type: "uint80" },
      { internalType: "int256", name: "answer", type: "int256" },
      { internalType: "uint256", name: "startedAt", type: "uint256" },
      { internalType: "uint256", name: "updatedAt", type: "uint256" },
      { internalType: "uint80", name: "answeredInRound", type: "uint80" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function"
  }
];

// Chainlink价格预言机地址配置
export const PRICE_FEEDS = {
  [sepolia.id]: {
    'ETH/USD': '0x694AA1769357215DE4FAC081bf1f309aDC325306',
    'LINK/USD': '0xc59E3633BAAC79493d908e63626716e204A45EdF',
    'BTC/USD': '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43',
  },
  [bscTestnet.id]: {
    'BNB/USD': '0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526',
    'ETH/USD': '0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7',
    'LINK/USD': '0x1B329402Cb1825C4797703f854985F06cD6067bc',
    'BTC/USD': '0x5741306c21795FdCBb9b265Ea0255F499DFe515C',
  }
};

export interface PriceData {
  price: number;
  timestamp?: number;
  decimals: number;
  symbol?: string;
}

export async function getAssetPriceFromPort(token: string, chainId: any): Promise<PriceData | null> {
  try {

    const linkPortAddress = chainId == 97 ? linkPorts[bscTestnet.id] : linkPorts[sepolia.id];
    const callChainId = chainId == 97 ? bscTestnet.id : sepolia.id;

    console.log("getAssetPriceFromPort", token, chainId, linkPortAddress);
    const price = await readContract(config, {
      address: linkPortAddress as `0x${string}`,
      abi: LinkPortABI,
      functionName: 'getTokenPrice',
      args: [token],
      chainId: callChainId,
    });

    const decimals = await readContract(config, {
        address: token as `0x${string}`,
        abi: ERC20ABI,
        functionName: 'decimals',
        chainId: callChainId,
      })


    const priceDecimals = decimals as number;
    
    return {
      price:  Number(price),
      decimals: priceDecimals,
    };
    
  } catch (error) {
    return {
      price: 0,
      decimals: 18
    };
  }
}

export async function getAssetPrice(symbol: string, chainId: number): Promise<PriceData | null> {
  try {
    const feedKey = `${symbol}/USD`;
    const chainFeeds = PRICE_FEEDS[chainId as keyof typeof PRICE_FEEDS];
    const feedAddress = chainFeeds?.[feedKey as keyof typeof chainFeeds];
    
    if (!feedAddress) {
      console.warn(`Price feed not found for ${symbol} on chain ${chainId}`);
      // 返回模拟价格数据
      return getMockPrice(symbol);
    }

    // 获取价格数据
    const [roundData, decimals] = await Promise.all([
      readContract(config, {
        address: feedAddress as `0x${string}`,
        abi: CHAINLINK_ABI,
        functionName: 'latestRoundData',
        chainId: chainId as 11155111 | 97,
      }),
      readContract(config, {
        address: feedAddress as `0x${string}`,
        abi: CHAINLINK_ABI,
        functionName: 'decimals',
        chainId: chainId as 11155111 | 97,
      })
    ]);

    const [, answer, , updatedAt] = roundData as [bigint, bigint, bigint, bigint, bigint];
    const priceDecimals = decimals as number;
    
    const price = Number(answer) / Math.pow(10, priceDecimals);
    
    return {
      price,
      timestamp: Number(updatedAt) * 1000, // 转换为毫秒
      decimals: priceDecimals,
      symbol
    };
    
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    // 返回模拟数据作为后备
    return getMockPrice(symbol);
  }
}

// 模拟价格数据（当Chainlink不可用时使用）
function getMockPrice(symbol: string): PriceData {
  const mockPrices: Record<string, number> = {
    'ETH': 3000,
    'BTC': 45000,
    'LINK': 15,
    'BNB': 300,
    'USDT': 1,
    'USDC': 1,
    'DAI': 1
  };

  return {
    price: mockPrices[symbol] || 1,
    timestamp: Date.now(),
    decimals: 8,
    symbol
  };
}

export async function getMultipleAssetPricesFromPort(tokens: string[], chainId: number): Promise<Record<string, PriceData>> {
  const pricePromises = tokens.map(token => 
    getAssetPriceFromPort(token, chainId).then(price => ({ token , price }))
  );
  
  const results = await Promise.all(pricePromises);
  
  return results.reduce((acc, { token , price }) => {
    if (price) {
      acc[token] = price;
    }
    return acc;
  }, {} as Record<string, PriceData>);
}

// 批量获取多个资产价格
export async function getMultipleAssetPrices(symbols: string[], chainId: number): Promise<Record<string, PriceData>> {
  const pricePromises = symbols.map(symbol => 
    getAssetPrice(symbol, chainId).then(price => ({ symbol, price }))
  );
  
  const results = await Promise.all(pricePromises);
  
  return results.reduce((acc, { symbol, price }) => {
    if (price) {
      acc[symbol] = price;
    }
    return acc;
  }, {} as Record<string, PriceData>);
}

// 计算USD价值
export function calculateUSDValue(amount: number, priceData: PriceData | null): number {
  if (!priceData) return 0;
  return amount * priceData.price;
}

// 格式化价格显示
export function formatPrice(price: number): string {
  if (price >= 1000) {
    return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  } else if (price >= 1) {
    return `$${price.toFixed(2)}`;
  } else {
    return `$${price.toFixed(4)}`;
  }
}

// 计算价格变化百分比
export function calculatePriceChange(currentPrice: number, previousPrice: number): number {
  if (previousPrice === 0) return 0;
  return ((currentPrice - previousPrice) / previousPrice) * 100;
} 