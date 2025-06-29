import { useState, useEffect, useCallback } from 'react';
import { useAccount, useChainId } from 'wagmi';
import TransactionStorage, { 
    Transaction, 
    TransactionFilter, 
    TransactionStats 
} from '../utils/transactionStorage';
import TransactionTracker from '../utils/transactionTracker';

interface UseTransactionsReturn {
    transactions: Transaction[];
    filteredTransactions: Transaction[];
    stats: TransactionStats;
    isLoading: boolean;
    error: string | null;
    
    // Actions
    addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp' | 'userAddress' | 'chainId'>) => Promise<Transaction>;
    updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<Transaction | null>;
    deleteTransaction: (id: string) => Promise<boolean>;
    applyFilter: (filter: TransactionFilter) => void;
    clearFilter: () => void;
    refreshTransactions: () => void;
    
    // Utilities
    exportTransactions: () => string;
    importTransactions: (jsonData: string) => Promise<boolean>;
    clearAllTransactions: () => Promise<void>;
    
    // Current filter state
    currentFilter: TransactionFilter;
}

const useTransactions = (): UseTransactionsReturn => {
    const { address } = useAccount();
    const chainId = useChainId();
    
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
    const [stats, setStats] = useState<TransactionStats>({
        totalTransactions: 0,
        completedTransactions: 0,
        pendingTransactions: 0,
        failedTransactions: 0,
        totalVolume: 0,
        totalGasUsed: '0',
        avgGasPrice: '0',
        mostUsedToken: 'N/A',
        mostUsedChain: 'N/A'
    });
    const [currentFilter, setCurrentFilter] = useState<TransactionFilter>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load transactions from localStorage and update from blockchain
    const refreshTransactions = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            let allTransactions = TransactionStorage.getAllTransactions();
            
            // Update pending transactions status from blockchain
            if (allTransactions.some(tx => tx.status === 'pending')) {
                console.log('📋 Updating pending transaction statuses...');
                const updatedTransactions = await TransactionTracker.updatePendingTransactions(allTransactions);
                
                // Save updated transactions back to storage
                for (const updatedTx of updatedTransactions) {
                    if (updatedTx.status !== allTransactions.find(tx => tx.id === updatedTx.id)?.status) {
                        TransactionStorage.updateTransaction(updatedTx.id, {
                            status: updatedTx.status,
                            blockNumber: updatedTx.blockNumber,
                            gasUsed: updatedTx.gasUsed
                        });
                    }
                }
                
                allTransactions = TransactionStorage.getAllTransactions();
            }
            
            // Get additional transactions from blockchain if user is connected
            if (address && chainId) {
                console.log('🔍 Fetching blockchain transaction history...');
                try {
                    const chainTransactions = await TransactionTracker.getUserTransactionHistory(
                        address,
                        chainId
                    );
                    
                    // Convert and merge with existing transactions
                    for (const chainTx of chainTransactions) {
                        // Check if transaction already exists in storage
                        const existingTx = allTransactions.find(tx => tx.txHash === chainTx.hash);
                        
                        if (!existingTx) {
                            // Create new transaction record for unknown blockchain transactions
                            const newTx = TransactionTracker.convertToTransaction(chainTx, address, chainId);
                            try {
                                TransactionStorage.addTransaction({
                                    ...newTx,
                                    userAddress: address,
                                    chainId
                                } as Omit<Transaction, 'id' | 'timestamp'>);
                            } catch (error) {
                                console.warn('Failed to add blockchain transaction to storage:', error);
                            }
                        }
                    }
                    
                    // Reload transactions after adding blockchain transactions
                    allTransactions = TransactionStorage.getAllTransactions();
                } catch (error) {
                    console.warn('Failed to fetch blockchain transactions:', error);
                    // Continue with local transactions even if blockchain fetch fails
                }
            }
            
            // Filter by current user and chain if specified
            const userTransactions = address 
                ? allTransactions.filter(tx => 
                    tx.userAddress.toLowerCase() === address.toLowerCase()
                  )
                : allTransactions;
            
            setTransactions(userTransactions);
            
            // Apply current filter
            const filtered = Object.keys(currentFilter).length > 0 
                ? TransactionStorage.getFilteredTransactions({
                    ...currentFilter,
                    chainId: currentFilter.chainId || chainId
                  }).filter(tx => 
                    !address || tx.userAddress.toLowerCase() === address.toLowerCase()
                  )
                : userTransactions;
            
            setFilteredTransactions(filtered);
            
            // Update stats
            const transactionStats = TransactionStorage.getTransactionStats(address, chainId);
            setStats(transactionStats);
            
        } catch (err) {
            console.error('❌ Failed to load transactions:', err);
            setError(err instanceof Error ? err.message : 'Failed to load transactions');
        } finally {
            setIsLoading(false);
        }
    }, [address, chainId, currentFilter]);

    // Load transactions on mount and when dependencies change
    useEffect(() => {
        refreshTransactions();
    }, [refreshTransactions]);

    // Auto-refresh pending transactions every 30 seconds
    useEffect(() => {
        const interval = setInterval(async () => {
            if (transactions.some(tx => tx.status === 'pending')) {
                console.log('🔄 Auto-refreshing pending transactions...');
                await refreshTransactions();
            }
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [transactions, refreshTransactions]);

    // Add new transaction
    const addTransaction = useCallback(async (
        transactionData: Omit<Transaction, 'id' | 'timestamp' | 'userAddress' | 'chainId'>
    ): Promise<Transaction> => {
        try {
            if (!address || !chainId) {
                throw new Error('Wallet not connected');
            }

            const newTransaction = TransactionStorage.addTransaction({
                ...transactionData,
                userAddress: address,
                chainId
            });

            // Refresh to update state
            refreshTransactions();
            
            return newTransaction;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to add transaction';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, [address, chainId, refreshTransactions]);

    // Update transaction
    const updateTransaction = useCallback(async (
        id: string, 
        updates: Partial<Transaction>
    ): Promise<Transaction | null> => {
        try {
            const updatedTransaction = TransactionStorage.updateTransaction(id, updates);
            
            if (updatedTransaction) {
                refreshTransactions();
            }
            
            return updatedTransaction;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to update transaction';
            setError(errorMessage);
            return null;
        }
    }, [refreshTransactions]);

    // Delete transaction
    const deleteTransaction = useCallback(async (id: string): Promise<boolean> => {
        try {
            const success = TransactionStorage.deleteTransaction(id);
            
            if (success) {
                refreshTransactions();
            }
            
            return success;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete transaction';
            setError(errorMessage);
            return false;
        }
    }, [refreshTransactions]);

    // Apply filter
    const applyFilter = useCallback((filter: TransactionFilter) => {
        setCurrentFilter(filter);
        
        try {
            const allUserTransactions = address 
                ? TransactionStorage.getAllTransactions().filter(tx => 
                    tx.userAddress.toLowerCase() === address.toLowerCase()
                  )
                : TransactionStorage.getAllTransactions();
            
            const filtered = TransactionStorage.getFilteredTransactions({
                ...filter,
                chainId: filter.chainId || chainId
            }).filter(tx => 
                !address || tx.userAddress.toLowerCase() === address.toLowerCase()
            );
            
            setFilteredTransactions(filtered);
        } catch (err) {
            console.error('❌ Failed to apply filter:', err);
            setError('Failed to apply filter');
        }
    }, [address, chainId]);

    // Clear filter
    const clearFilter = useCallback(() => {
        setCurrentFilter({});
        setFilteredTransactions(transactions);
    }, [transactions]);

    // Export transactions
    const exportTransactions = useCallback((): string => {
        return TransactionStorage.exportTransactions();
    }, []);

    // Import transactions
    const importTransactions = useCallback(async (jsonData: string): Promise<boolean> => {
        try {
            const success = TransactionStorage.importTransactions(jsonData);
            
            if (success) {
                refreshTransactions();
            }
            
            return success;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to import transactions';
            setError(errorMessage);
            return false;
        }
    }, [refreshTransactions]);

    // Clear all transactions
    const clearAllTransactions = useCallback(async (): Promise<void> => {
        try {
            TransactionStorage.clearAllTransactions();
            refreshTransactions();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to clear transactions';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, [refreshTransactions]);

    return {
        transactions,
        filteredTransactions,
        stats,
        isLoading,
        error,
        
        // Actions
        addTransaction,
        updateTransaction,
        deleteTransaction,
        applyFilter,
        clearFilter,
        refreshTransactions,
        
        // Utilities
        exportTransactions,
        importTransactions,
        clearAllTransactions,
        
        // Current state
        currentFilter
    };
};

export default useTransactions;

// Helper hook for creating transactions from common DeFi operations
export const useTransactionCreator = () => {
    const { addTransaction } = useTransactions();

    const createDepositTransaction = useCallback(async (
        token: string,
        amount: string,
        value: string,
        poolAddress?: string,
        txHash?: string
    ) => {
        return addTransaction({
            type: 'deposit',
            action: 'Liquidity Deposit',
            token,
            amount,
            value,
            status: txHash ? 'pending' : 'completed',
            txHash,
            poolAddress,
            metadata: {
                lpTokens: amount // For liquidity deposits, amount often represents LP tokens
            }
        });
    }, [addTransaction]);

    const createWithdrawTransaction = useCallback(async (
        token: string,
        amount: string,
        value: string,
        poolAddress?: string,
        txHash?: string
    ) => {
        return addTransaction({
            type: 'withdraw',
            action: 'Liquidity Withdrawal', 
            token,
            amount,
            value,
            status: txHash ? 'pending' : 'completed',
            txHash,
            poolAddress
        });
    }, [addTransaction]);

    const createBorrowTransaction = useCallback(async (
        token: string,
        amount: string,
        value: string,
        fromChain?: string,
        toChain?: string,
        txHash?: string,
        healthFactor?: string
    ) => {
        return addTransaction({
            type: 'borrow',
            action: fromChain && toChain ? 'Cross-chain Borrow' : 'Borrow',
            token,
            amount,
            value,
            fromChain,
            toChain,
            status: txHash ? 'pending' : 'completed',
            txHash,
            metadata: {
                healthFactor
            }
        });
    }, [addTransaction]);

    const createRepayTransaction = useCallback(async (
        token: string,
        amount: string,
        value: string,
        txHash?: string,
        healthFactor?: string
    ) => {
        return addTransaction({
            type: 'repay',
            action: 'Repayment',
            token,
            amount,
            value,
            status: txHash ? 'pending' : 'completed',
            txHash,
            metadata: {
                healthFactor
            }
        });
    }, [addTransaction]);

    const createBridgeTransaction = useCallback(async (
        token: string,
        amount: string,
        value: string,
        fromChain: string,
        toChain: string,
        txHash?: string
    ) => {
        return addTransaction({
            type: 'bridge',
            action: 'Asset Bridge',
            token,
            amount,
            value,
            fromChain,
            toChain,
            status: txHash ? 'pending' : 'completed',
            txHash
        });
    }, [addTransaction]);

    const createLiquidationTransaction = useCallback(async (
        token: string,
        amount: string,
        value: string,
        borrowerAddress: string,
        txHash?: string,
        liquidationPenalty?: string,
        collateralSeized?: string
    ) => {
        return addTransaction({
            type: 'liquidation',
            action: 'Liquidation',
            token,
            amount,
            value,
            status: txHash ? 'pending' : 'completed',
            txHash,
            metadata: {
                borrowerAddress,
                liquidationPenalty,
                collateralSeized,
                liquidationReason: 'Undercollateralized or expired loan'
            }
        });
    }, [addTransaction]);

    return {
        createDepositTransaction,
        createWithdrawTransaction,
        createBorrowTransaction,
        createRepayTransaction,
        createBridgeTransaction,
        createLiquidationTransaction
    };
}; 