import { readContract } from 'wagmi/actions';
import { config, linkPorts } from '../config';
import { sepolia, bscTestnet, bsc } from 'wagmi/chains';
import  LinkPortABI  from '../abi/LinkPort.json';
import  ERC20ABI from '../abi/ERC20.json';

// Chainlink Price Feed ABI (only need latestRoundData function)
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

// Chainlink price oracle address configuration
export const PRICE_FEEDS = {
  [sepolia.id]: {
    'ETH/USD': '0x694AA1769357215DE4FAC081bf1f309aDC325306',
    'LINK/USD': '0xc59E3633BAAC79493d908e63626716e204A45EdF',
    'BTC/USD': '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43',
    // Note: USDT and BNB price feeds may not be available on Sepolia
    // Using fallback prices for these assets
  },
  [bscTestnet.id]: {
    'BNB/USD': '0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526',
    'ETH/USD': '0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7',
    'LINK/USD': '0x1B329402Cb1825C4797703f854985F06cD6067BC',
    'BTC/USD': '0x5741306c21795FdCBb9b265Ea0255F499DFe515C',
    'USDT/USD': '0xEca2605f0BCF2BA5966372C99837b1F182d3D620', // BSC Testnet USDT price feed
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

    const data = await readContract(config, {
      address: linkPortAddress as `0x${string}`,
      abi: LinkPortABI,
      functionName: 'getTokenPrice',
      args: [token],
      chainId: callChainId,
    });

    const [decimals, price] = data as [bigint, bigint]; 
    const priceDecimals = Number(decimals);

    return {
      price: price ? Number(price) / Math.pow(10, priceDecimals) : 0,
      decimals: priceDecimals,
    };
    
  } catch (error) {
    console.warn("Error in getAssetPriceFromPort:", error);
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
      // For testnet, many price feeds are not available, use fallback directly
      console.warn(`Price feed not found for ${symbol} on chain ${chainId}, using fallback price`);
      return getMockPrice(symbol);
    }

    // Add timeout and better error handling for RPC calls
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('RPC timeout')), 5000)
    );

    const priceRequest = Promise.all([
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

    // Race between price request and timeout
    const [roundData, decimals] = await Promise.race([priceRequest, timeout]) as any;

    const [, answer, , updatedAt] = roundData as [bigint, bigint, bigint, bigint, bigint];
    const priceDecimals = decimals as number;
    
    const price = Number(answer) / Math.pow(10, priceDecimals);
    
    return {
      price,
      timestamp: Number(updatedAt) * 1000, // Convert to milliseconds
      decimals: priceDecimals,
      symbol
    };
    
  } catch (error) {
    // Don't log detailed error for RPC connection issues to reduce console noise
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('CONNECTION_CLOSED') || errorMessage.includes('timeout')) {
      console.warn(`RPC connection issue for ${symbol} price, using fallback`);
    } else {
      console.warn(`Error fetching price for ${symbol}, using fallback:`, errorMessage);
    }
    // Return mock data as fallback
    return getMockPrice(symbol);
  }
}

// Fallback price data (used when both Chainlink and smart contracts are unavailable)
// These prices are based on recent market data and will be updated periodically
function getMockPrice(symbol: string): PriceData {
  // Use relatively conservative estimated prices, updated manually periodically
  const fallbackPrices: Record<string, number> = {
    'ETH': 2400, // More conservative ETH price estimate
    'BTC': 42000, // More conservative BTC price estimate
    'LINK': 12, // More conservative LINK price estimate
    'BNB': 240, // More conservative BNB price estimate
    'USDT': 1.0,
    'USDC': 1.0,
    'DAI': 1.0
  };

  console.warn(`Using fallback price for ${symbol}: $${fallbackPrices[symbol] || 1}`);
  
  return {
    price: fallbackPrices[symbol] || 1,
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

// Batch fetch multiple asset prices
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

// Calculate USD value
export function calculateUSDValue(amount: number, priceData: PriceData | null): number {
  if (!priceData) return 0;
  return amount * priceData.price;
}

// Format price display
export function formatPrice(price: number): string {
  if (price >= 1000) {
    return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  } else if (price >= 1) {
    return `$${price.toFixed(2)}`;
  } else {
    return `$${price.toFixed(4)}`;
  }
}

// Calculate price change percentage
export function calculatePriceChange(currentPrice: number, previousPrice: number): number {
  if (previousPrice === 0) return 0;
  return ((currentPrice - previousPrice) / previousPrice) * 100;
} 