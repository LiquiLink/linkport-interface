import { readContract } from 'wagmi/actions';
import { config } from '../config';
import { sepolia, bscTestnet } from 'wagmi/chains';
import { formatUnits } from 'ethers';

export interface NetworkStatus {
  gasPrice: {
    slow: number;
    standard: number;
    fast: number;
  };
  gasPriceGwei: {
    slow: string;
    standard: string;
    fast: string;
  };
  blockTime: number;
  congestionLevel: 'low' | 'medium' | 'high';
  estimatedConfirmationTime: string;
  networkName: string;
  chainId: number;
}

export interface TransactionFee {
  gasPrice: string;
  gasLimit: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  estimatedFee: string;
  estimatedFeeUSD: string;
}

// Get current network status
export async function getNetworkStatus(chainId: number): Promise<NetworkStatus> {
  try {
    const networkName = getNetworkName(chainId);
    
    // Get current gas price (using viem's public RPC)
    const gasPrice = await getCurrentGasPrice(chainId);
    
    // Calculate different priority gas prices
    const slowGasPrice = Math.floor(gasPrice * 0.8);
    const standardGasPrice = gasPrice;
    const fastGasPrice = Math.floor(gasPrice * 1.2);
    
    // Convert to Gwei
    const slowGwei = formatUnits(BigInt(slowGasPrice), 9);
    const standardGwei = formatUnits(BigInt(standardGasPrice), 9);
    const fastGwei = formatUnits(BigInt(fastGasPrice), 9);
    
    // Calculate network congestion level
    const congestionLevel = calculateCongestionLevel(gasPrice, chainId);
    
    // Estimate confirmation time
    const estimatedConfirmationTime = getEstimatedConfirmationTime(congestionLevel);
    
    // Get block time
    const blockTime = getBlockTime(chainId);
    
    return {
      gasPrice: {
        slow: slowGasPrice,
        standard: standardGasPrice,
        fast: fastGasPrice
      },
      gasPriceGwei: {
        slow: parseFloat(slowGwei).toFixed(2),
        standard: parseFloat(standardGwei).toFixed(2),
        fast: parseFloat(fastGwei).toFixed(2)
      },
      blockTime,
      congestionLevel,
      estimatedConfirmationTime,
      networkName,
      chainId
    };
    
  } catch (error) {
    console.error('Error fetching network status:', error);
    // Return default data
    return getDefaultNetworkStatus(chainId);
  }
}

// Get current gas price
async function getCurrentGasPrice(chainId: number): Promise<number> {
  try {
    // This can be replaced with actual RPC calls
    // Using mock data for now
    const mockGasPrices: Record<number, number> = {
      [sepolia.id]: 20000000000, // 20 Gwei
      [bscTestnet.id]: 3000000000, // 3 Gwei
    };
    
    return mockGasPrices[chainId] || 20000000000;
    
  } catch (error) {
    console.error('Error fetching gas price:', error);
    return 20000000000; // Default 20 Gwei
  }
}

// Calculate network congestion level
function calculateCongestionLevel(gasPrice: number, chainId: number): 'low' | 'medium' | 'high' {
  const thresholds = {
    [sepolia.id]: { medium: 30000000000, high: 60000000000 }, // 30/60 Gwei
    [bscTestnet.id]: { medium: 5000000000, high: 10000000000 }, // 5/10 Gwei
  };
  
  const threshold = thresholds[chainId as keyof typeof thresholds] || thresholds[sepolia.id];
  
  if (gasPrice >= threshold.high) return 'high';
  if (gasPrice >= threshold.medium) return 'medium';
  return 'low';
}

// Get estimated confirmation time
function getEstimatedConfirmationTime(congestionLevel: 'low' | 'medium' | 'high'): string {
  switch (congestionLevel) {
    case 'low':
      return '~1-2 minutes';
    case 'medium':
      return '~2-5 minutes';
    case 'high':
      return '~5-10 minutes';
    default:
      return '~2 minutes';
  }
}

// Get block time
function getBlockTime(chainId: number): number {
  const blockTimes: Record<number, number> = {
    [sepolia.id]: 12, // 12 seconds
    [bscTestnet.id]: 3, // 3 seconds
  };
  
  return blockTimes[chainId] || 12;
}

// 获取网络名称
function getNetworkName(chainId: number): string {
  const networkNames: Record<number, string> = {
    [sepolia.id]: 'Ethereum Sepolia',
    [bscTestnet.id]: 'BNB Testnet',
  };
  
  return networkNames[chainId] || 'Unknown Network';
}

// 获取默认网络状态
function getDefaultNetworkStatus(chainId: number): NetworkStatus {
  return {
    gasPrice: {
      slow: 16000000000,
      standard: 20000000000,
      fast: 24000000000
    },
    gasPriceGwei: {
      slow: '16.00',
      standard: '20.00',
      fast: '24.00'
    },
    blockTime: getBlockTime(chainId),
    congestionLevel: 'medium',
    estimatedConfirmationTime: '~2-5 minutes',
    networkName: getNetworkName(chainId),
    chainId
  };
}

// 计算交易费用
export async function calculateTransactionFee(
  chainId: number,
  gasLimit: number = 21000,
  priority: 'slow' | 'standard' | 'fast' = 'standard'
): Promise<TransactionFee> {
  try {
    const networkStatus = await getNetworkStatus(chainId);
    const gasPrice = networkStatus.gasPrice[priority];
    
    // 计算总费用
    const totalFee = gasPrice * gasLimit;
    const totalFeeEth = formatUnits(BigInt(totalFee), 18);
    
    // 估算USD价值 (这里可以集成价格服务)
    const ethPriceUSD = 3000; // 可以从价格服务获取
    const totalFeeUSD = (parseFloat(totalFeeEth) * ethPriceUSD).toFixed(2);
    
    return {
      gasPrice: gasPrice.toString(),
      gasLimit: gasLimit.toString(),
      estimatedFee: totalFeeEth,
      estimatedFeeUSD: totalFeeUSD
    };
    
  } catch (error) {
    console.error('Error calculating transaction fee:', error);
    return {
      gasPrice: '20000000000',
      gasLimit: gasLimit.toString(),
      estimatedFee: '0.001',
      estimatedFeeUSD: '3.00'
    };
  }
}

// 获取协议统计数据
export interface ProtocolStats {
  totalValueLocked: string;
  totalUsers: number;
  totalTransactions: number;
  successRate: number;
  averageTransactionTime: string;
}

export async function getProtocolStats(): Promise<ProtocolStats> {
  try {
    // This can get real data from smart contracts or APIs
    // Returning mock data for now
    return {
      totalValueLocked: '$2.5B',
      totalUsers: 125432,
      totalTransactions: 1234567,
      successRate: 99.8,
      averageTransactionTime: '~7 minutes'
    };
  } catch (error) {
    console.error('Error fetching protocol stats:', error);
    return {
      totalValueLocked: '$0',
      totalUsers: 0,
      totalTransactions: 0,
      successRate: 0,
      averageTransactionTime: 'Unknown'
    };
  }
}

// 格式化Gas价格显示
export function formatGasPrice(gasPrice: number): string {
  const gwei = formatUnits(BigInt(gasPrice), 9);
  return `${parseFloat(gwei).toFixed(2)} Gwei`;
}

// Get congestion level color
export function getCongestionColor(level: 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'low':
      return '#22c55e'; // Green
    case 'medium':
      return '#f59e0b'; // Yellow
    case 'high':
      return '#ef4444'; // Red
    default:
      return '#6b7280'; // Gray
  }
} 