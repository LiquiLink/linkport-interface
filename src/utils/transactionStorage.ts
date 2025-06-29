export interface Transaction {
    id: string;
    type: 'deposit' | 'withdraw' | 'borrow' | 'repay' | 'bridge' | 'stake' | 'unstake' | 'liquidation';
    action: string;
    token: string;
    amount: string;
    value: string;
    fromChain?: string;
    toChain?: string;
    timestamp: number;
    status: 'pending' | 'completed' | 'failed';
    txHash?: string;
    blockNumber?: number;
    gasUsed?: string;
    gasPrice?: string;
    userAddress: string;
    chainId: number;
    poolAddress?: string;
    metadata?: {
        healthFactor?: string;
        collateralRatio?: string;
        interestRate?: string;
        lpTokens?: string;
        rewards?: string;
        [key: string]: any;
    };
}

export interface TransactionFilter {
    type?: string;
    timeframe?: string;
    status?: string;
    chainId?: number;
    token?: string;
}

export interface TransactionStats {
    totalTransactions: number;
    completedTransactions: number;
    pendingTransactions: number;
    failedTransactions: number;
    totalVolume: number;
    totalGasUsed: string;
    avgGasPrice: string;
    mostUsedToken: string;
    mostUsedChain: string;
}

class TransactionStorage {
    private static readonly STORAGE_KEY = 'liquilink_transactions';
    private static readonly OLD_STORAGE_KEY = 'linkport_transactions'; // For migration
    private static readonly MAX_TRANSACTIONS = 1000; // Limit storage quantity to avoid oversized localStorage

    /**
     * Migrate data from old storage key to new one
     */
    private static migrateOldData(): void {
        try {
            const oldData = localStorage.getItem(this.OLD_STORAGE_KEY);
            const newData = localStorage.getItem(this.STORAGE_KEY);
            
            if (oldData && !newData) {
                console.log('🔄 Migrating transaction data from old storage key...');
                localStorage.setItem(this.STORAGE_KEY, oldData);
                localStorage.removeItem(this.OLD_STORAGE_KEY);
                console.log('✅ Transaction data migration completed');
            }
        } catch (error) {
            console.error('❌ Failed to migrate transaction data:', error);
        }
    }

    /**
     * Get all transaction records
     */
    static getAllTransactions(): Transaction[] {
        try {
            // Check for data migration first
            this.migrateOldData();
            
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) return [];
            
            const transactions: Transaction[] = JSON.parse(stored);
            return transactions.sort((a, b) => b.timestamp - a.timestamp); // Sort by time in descending order
        } catch (error) {
            console.error('❌ Failed to load transactions:', error);
            return [];
        }
    }

    /**
     * Add new transaction record
     */
    static addTransaction(transaction: Omit<Transaction, 'id' | 'timestamp'>): Transaction {
        try {
            const newTransaction: Transaction = {
                ...transaction,
                id: this.generateTransactionId(),
                timestamp: Date.now()
            };

            const existingTransactions = this.getAllTransactions();
            const updatedTransactions = [newTransaction, ...existingTransactions];

            // Limit storage quantity, delete oldest records
            if (updatedTransactions.length > this.MAX_TRANSACTIONS) {
                updatedTransactions.splice(this.MAX_TRANSACTIONS);
            }

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedTransactions));
            
            console.log('✅ Transaction added:', newTransaction);
            return newTransaction;
        } catch (error) {
            console.error('❌ Failed to add transaction:', error);
            throw error;
        }
    }

    /**
     * Update transaction status
     */
    static updateTransaction(id: string, updates: Partial<Transaction>): Transaction | null {
        try {
            const transactions = this.getAllTransactions();
            const index = transactions.findIndex(tx => tx.id === id);
            
            if (index === -1) {
                console.warn('⚠️ Transaction not found:', id);
                return null;
            }

            transactions[index] = { ...transactions[index], ...updates };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(transactions));
            
            console.log('✅ Transaction updated:', transactions[index]);
            return transactions[index];
        } catch (error) {
            console.error('❌ Failed to update transaction:', error);
            return null;
        }
    }

    /**
     * Delete transaction record
     */
    static deleteTransaction(id: string): boolean {
        try {
            const transactions = this.getAllTransactions();
            const filteredTransactions = transactions.filter(tx => tx.id !== id);
            
            if (filteredTransactions.length === transactions.length) {
                console.warn('⚠️ Transaction not found for deletion:', id);
                return false;
            }

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredTransactions));
            console.log('✅ Transaction deleted:', id);
            return true;
        } catch (error) {
            console.error('❌ Failed to delete transaction:', error);
            return false;
        }
    }

    /**
     * Get transaction records based on filter conditions
     */
    static getFilteredTransactions(filter: TransactionFilter): Transaction[] {
        const allTransactions = this.getAllTransactions();
        
        return allTransactions.filter(tx => {
            // Transaction type filter
            if (filter.type && filter.type !== 'all' && tx.type !== filter.type) {
                return false;
            }

            // Status filter
            if (filter.status && filter.status !== 'all' && tx.status !== filter.status) {
                return false;
            }

            // Chain ID filter
            if (filter.chainId && tx.chainId !== filter.chainId) {
                return false;
            }

            // Token filter
            if (filter.token && filter.token !== 'all' && tx.token !== filter.token) {
                return false;
            }

            // Time filter
            if (filter.timeframe && filter.timeframe !== 'all') {
                const now = Date.now();
                const timeframes = {
                    '24hours': 24 * 60 * 60 * 1000,
                    '7days': 7 * 24 * 60 * 60 * 1000,
                    '30days': 30 * 24 * 60 * 60 * 1000
                };
                
                const timeLimit = timeframes[filter.timeframe as keyof typeof timeframes];
                if (timeLimit && (now - tx.timestamp) > timeLimit) {
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * Get transaction statistics
     */
    static getTransactionStats(userAddress?: string, chainId?: number): TransactionStats {
        let transactions = this.getAllTransactions();
        
        // Filter by user address
        if (userAddress) {
            transactions = transactions.filter(tx => 
                tx.userAddress.toLowerCase() === userAddress.toLowerCase()
            );
        }

        // Filter by chain ID
        if (chainId) {
            transactions = transactions.filter(tx => tx.chainId === chainId);
        }

        const completed = transactions.filter(tx => tx.status === 'completed');
        const pending = transactions.filter(tx => tx.status === 'pending');
        const failed = transactions.filter(tx => tx.status === 'failed');

        // Calculate total transaction volume (USD)
        const totalVolume = completed.reduce((sum, tx) => {
            const value = parseFloat(tx.value.replace(/[$,]/g, '')) || 0;
            return sum + value;
        }, 0);

        // Count most frequently used tokens
        const tokenCounts: { [key: string]: number } = {};
        transactions.forEach(tx => {
            tokenCounts[tx.token] = (tokenCounts[tx.token] || 0) + 1;
        });
        const mostUsedToken = Object.keys(tokenCounts).reduce((a, b) => 
            tokenCounts[a] > tokenCounts[b] ? a : b, 'N/A'
        );

        // Count most frequently used chains
        const chainCounts: { [key: number]: number } = {};
        transactions.forEach(tx => {
            chainCounts[tx.chainId] = (chainCounts[tx.chainId] || 0) + 1;
        });
        const mostUsedChainId = Object.keys(chainCounts).reduce((a, b) => 
            chainCounts[parseInt(a)] > chainCounts[parseInt(b)] ? a : b, '0'
        );
        const mostUsedChain = mostUsedChainId === '97' ? 'BSC Testnet' : 
                             mostUsedChainId === '11155111' ? 'Sepolia Testnet' : 'Unknown';

        // Calculate average gas fees
        const gasTransactions = completed.filter(tx => tx.gasUsed && tx.gasPrice);
        const totalGasUsed = gasTransactions.reduce((sum, tx) => 
            sum + parseInt(tx.gasUsed || '0'), 0
        );
        const avgGasPrice = gasTransactions.length > 0 ? 
            gasTransactions.reduce((sum, tx) => sum + parseInt(tx.gasPrice || '0'), 0) / gasTransactions.length : 0;

        return {
            totalTransactions: transactions.length,
            completedTransactions: completed.length,
            pendingTransactions: pending.length,
            failedTransactions: failed.length,
            totalVolume,
            totalGasUsed: totalGasUsed.toString(),
            avgGasPrice: avgGasPrice.toString(),
            mostUsedToken,
            mostUsedChain
        };
    }

    /**
     * Get user's transaction records on specific chain
     */
    static getUserTransactions(userAddress: string, chainId?: number): Transaction[] {
        return this.getAllTransactions().filter(tx => {
            const matchUser = tx.userAddress.toLowerCase() === userAddress.toLowerCase();
            const matchChain = !chainId || tx.chainId === chainId;
            return matchUser && matchChain;
        });
    }

    /**
     * Clear all transaction records
     */
    static clearAllTransactions(): void {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            console.log('✅ All transactions cleared');
        } catch (error) {
            console.error('❌ Failed to clear transactions:', error);
        }
    }

    /**
     * Export transaction records as JSON
     */
    static exportTransactions(): string {
        const transactions = this.getAllTransactions();
        return JSON.stringify(transactions, null, 2);
    }

    /**
     * Import transaction records
     */
    static importTransactions(jsonData: string): boolean {
        try {
            const transactions: Transaction[] = JSON.parse(jsonData);
            
            // Validate data format
            if (!Array.isArray(transactions)) {
                throw new Error('Invalid data format');
            }

            // Merge existing data
            const existingTransactions = this.getAllTransactions();
            const allTransactions = [...transactions, ...existingTransactions];
            
            // Remove duplicates (based on ID and txHash)
            const uniqueTransactions = allTransactions.filter((tx, index, arr) => 
                arr.findIndex(t => t.id === tx.id || (t.txHash && t.txHash === tx.txHash)) === index
            );

            // Limit quantity
            const finalTransactions = uniqueTransactions
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, this.MAX_TRANSACTIONS);

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(finalTransactions));
            console.log('✅ Transactions imported successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to import transactions:', error);
            return false;
        }
    }

    /**
     * Generate unique transaction ID
     */
    private static generateTransactionId(): string {
        return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get storage information
     */
    static getStorageInfo(): { size: number; count: number; maxSize: number } {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY) || '[]';
            return {
                size: new Blob([stored]).size,
                count: this.getAllTransactions().length,
                maxSize: this.MAX_TRANSACTIONS
            };
        } catch (error) {
            return { size: 0, count: 0, maxSize: this.MAX_TRANSACTIONS };
        }
    }
}

export default TransactionStorage; 