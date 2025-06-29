import { ethers } from 'ethers';
import { getPublicClient } from 'wagmi/actions';
import { config } from '../config';
import { sepolia, bscTestnet } from 'wagmi/chains';
import { Transaction } from './transactionStorage';
import LiquidityPoolABI from '../abi/LiquidityPool.json';
import LinkPortABI from '../abi/LinkPort.json';

// Contract addresses for each chain
const CONTRACT_ADDRESSES: { [chainId: number]: { linkPort: string } } = {
  [sepolia.id]: {
    linkPort: '0x110B273c4DB995188602492599a583B9eAfD74d0',
    // Add liquidity pool addresses as needed
  },
  [bscTestnet.id]: {
    linkPort: '0x24F81DA0aBBD2a88605E4B140880647F26178744',
    // Add liquidity pool addresses as needed
  }
};

// Known liquidity pool addresses (you can expand this list)
const KNOWN_POOLS: { [chainId: number]: string[] } = {
  [sepolia.id]: [
    // Add known pool addresses for Sepolia
  ],
  [bscTestnet.id]: [
    // Add known pool addresses for BSC Testnet
  ]
};

export interface ChainTransaction {
  hash: string;
  blockNumber: number;
  timestamp: number;
  status: 'completed' | 'failed';
  gasUsed?: string;
  from: string;
  to: string;
  value: string;
  functionName?: string;
  args?: any[];
}

export class TransactionTracker {
  
  /**
   * Get transaction status from blockchain
   */
  static async getTransactionStatus(txHash: string, chainId: number): Promise<{
    status: 'completed' | 'failed' | 'pending';
    blockNumber?: number;
    timestamp?: number;
    gasUsed?: string;
  }> {
    try {
      const publicClient = getPublicClient(config, { 
        chainId: chainId as 11155111 | 97 
      });
      
      if (!publicClient) {
        console.warn('Unable to get public client for chain:', chainId);
        return { status: 'pending' };
      }

      // Get transaction receipt
      const receipt = await publicClient.getTransactionReceipt({ 
        hash: txHash as `0x${string}` 
      });

      if (!receipt) {
        return { status: 'pending' };
      }

      // Get block to get timestamp
      const block = await publicClient.getBlock({ 
        blockNumber: receipt.blockNumber 
      });

      return {
        status: receipt.status === 'success' ? 'completed' : 'failed',
        blockNumber: Number(receipt.blockNumber),
        timestamp: Number(block.timestamp) * 1000, // Convert to milliseconds
        gasUsed: receipt.gasUsed.toString()
      };

    } catch (error) {
      console.warn('Error getting transaction status:', error);
      return { status: 'pending' };
    }
  }

  /**
   * Get user's transaction history from blockchain
   */
  static async getUserTransactionHistory(
    userAddress: string, 
    chainId: number,
    fromBlock: bigint = BigInt(0),
    toBlock: bigint | 'latest' = 'latest'
  ): Promise<ChainTransaction[]> {
    try {
      const publicClient = getPublicClient(config, { 
        chainId: chainId as 11155111 | 97 
      });
      
      if (!publicClient) {
        console.warn('Unable to get public client for chain:', chainId);
        return [];
      }

      const transactions: ChainTransaction[] = [];
      const contractAddresses = CONTRACT_ADDRESSES[chainId];
      
      if (!contractAddresses) {
        console.warn('No contract addresses configured for chain:', chainId);
        return [];
      }

      // Get recent blocks to search (last 1000 blocks to avoid timeout)
      const latestBlock = await publicClient.getBlockNumber();
      const searchFromBlock = latestBlock - BigInt(1000);

      // Get transactions for LinkPort contract
      if (contractAddresses.linkPort) {
        const linkPortTxs = await this.getContractTransactions(
          userAddress,
          contractAddresses.linkPort,
          chainId,
          searchFromBlock,
          'latest'
        );
        transactions.push(...linkPortTxs);
      }

      // Get transactions for known liquidity pools
      const knownPools = KNOWN_POOLS[chainId] || [];
      for (const poolAddress of knownPools) {
        const poolTxs = await this.getContractTransactions(
          userAddress,
          poolAddress,
          chainId,
          searchFromBlock,
          'latest'
        );
        transactions.push(...poolTxs);
      }

      // Sort by timestamp (newest first)
      return transactions.sort((a, b) => b.timestamp - a.timestamp);

    } catch (error) {
      console.error('Error getting user transaction history:', error);
      return [];
    }
  }

  /**
   * Get transactions for a specific contract
   */
  private static async getContractTransactions(
    userAddress: string,
    contractAddress: string,
    chainId: number,
    fromBlock: bigint,
    toBlock: bigint | 'latest'
  ): Promise<ChainTransaction[]> {
    try {
      const publicClient = getPublicClient(config, { 
        chainId: chainId as 11155111 | 97 
      });
      
      if (!publicClient) return [];

      // Get all transactions to/from the contract involving the user
      const filter = {
        address: contractAddress as `0x${string}`,
        fromBlock,
        toBlock
      };

      const logs = await publicClient.getLogs(filter);
      
      const transactions: ChainTransaction[] = [];
      const processedTxHashes = new Set<string>();

      for (const log of logs) {
        if (processedTxHashes.has(log.transactionHash)) continue;
        
        try {
          const tx = await publicClient.getTransaction({
            hash: log.transactionHash
          });

          const receipt = await publicClient.getTransactionReceipt({
            hash: log.transactionHash
          });

          const block = await publicClient.getBlock({
            blockNumber: log.blockNumber
          });

          // Check if transaction involves the user (from or to)
          if (tx.from.toLowerCase() === userAddress.toLowerCase()) {
            transactions.push({
              hash: log.transactionHash,
              blockNumber: Number(log.blockNumber),
              timestamp: Number(block.timestamp) * 1000,
              status: receipt.status === 'success' ? 'completed' : 'failed',
              gasUsed: receipt.gasUsed.toString(),
              from: tx.from,
              to: tx.to || '',
              value: tx.value.toString(),
              functionName: this.decodeFunctionName(tx.input),
            });

            processedTxHashes.add(log.transactionHash);
          }
        } catch (error) {
          console.warn('Error processing transaction:', log.transactionHash, error);
        }
      }

      return transactions;

    } catch (error) {
      console.error('Error getting contract transactions:', error);
      return [];
    }
  }

  /**
   * Decode function name from transaction input
   */
  private static decodeFunctionName(input: string): string {
    if (!input || input === '0x') return 'transfer';
    
    try {
      const functionSelector = input.slice(0, 10);
      
      // Common function selectors for our contracts
      const FUNCTION_SELECTORS: { [key: string]: string } = {
        '0xa9059cbb': 'transfer',
        '0x23b872dd': 'transferFrom',
        '0x095ea7b3': 'approve',
        '0xb6b55f25': 'deposit',
        '0x2e1a7d4d': 'withdraw',
        '0xd0e30db0': 'depositNative',
        '0xc9567bf9': 'borrow',
        '0x371fd8e6': 'repay',
        '0x01681a62': 'bridge',
        // Add more function selectors as needed
      };

      return FUNCTION_SELECTORS[functionSelector] || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Convert blockchain transaction to our Transaction format
   */
  static convertToTransaction(
    chainTx: ChainTransaction,
    userAddress: string,
    chainId: number
  ): Partial<Transaction> {
    const type = this.getTransactionType(chainTx.functionName || '');
    const action = this.getTransactionAction(type, chainTx.functionName || '');
    
    return {
      type,
      action,
      token: 'Unknown', // This would need to be determined from contract events
      amount: '0', // This would need to be determined from contract events
      value: '$0.00', // This would need to be calculated
      timestamp: chainTx.timestamp,
      status: chainTx.status,
      txHash: chainTx.hash,
      blockNumber: chainTx.blockNumber,
      gasUsed: chainTx.gasUsed,
      userAddress,
      chainId,
    };
  }

  /**
   * Determine transaction type from function name
   */
  private static getTransactionType(functionName: string): Transaction['type'] {
    switch (functionName) {
      case 'deposit':
      case 'depositNative':
        return 'deposit';
      case 'withdraw':
        return 'withdraw';
      case 'borrow':
        return 'borrow';
      case 'repay':
        return 'repay';
      case 'bridge':
        return 'bridge';
      case 'stake':
        return 'stake';
      case 'unstake':
        return 'unstake';
      default:
        return 'deposit'; // Default fallback
    }
  }

  /**
   * Get transaction action description
   */
  private static getTransactionAction(type: Transaction['type'], functionName: string): string {
    switch (type) {
      case 'deposit':
        return functionName === 'depositNative' ? 'Native Token Deposit' : 'Token Deposit';
      case 'withdraw':
        return 'Token Withdrawal';
      case 'borrow':
        return 'Asset Borrow';
      case 'repay':
        return 'Loan Repayment';
      case 'bridge':
        return 'Cross-chain Bridge';
      case 'stake':
        return 'Asset Staking';
      case 'unstake':
        return 'Asset Unstaking';
      default:
        return 'Transaction';
    }
  }

  /**
   * Update pending transactions status
   */
  static async updatePendingTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    const updatedTransactions: Transaction[] = [];
    
    for (const transaction of transactions) {
      if (transaction.status === 'pending' && transaction.txHash) {
        const status = await this.getTransactionStatus(transaction.txHash, transaction.chainId);
        
        updatedTransactions.push({
          ...transaction,
          status: status.status,
          blockNumber: status.blockNumber,
          gasUsed: status.gasUsed,
        });
      } else {
        updatedTransactions.push(transaction);
      }
    }
    
    return updatedTransactions;
  }
}

export default TransactionTracker; 
 