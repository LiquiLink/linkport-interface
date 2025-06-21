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
    private static readonly STORAGE_KEY = 'linkport_transactions';
    private static readonly MAX_TRANSACTIONS = 1000; // 限制存储数量避免localStorage过大

    /**
     * 获取所有交易记录
     */
    static getAllTransactions(): Transaction[] {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (!stored) return [];
            
            const transactions: Transaction[] = JSON.parse(stored);
            return transactions.sort((a, b) => b.timestamp - a.timestamp); // 按时间倒序
        } catch (error) {
            console.error('❌ Failed to load transactions:', error);
            return [];
        }
    }

    /**
     * 添加新交易记录
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

            // 限制存储数量，删除最旧的记录
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
     * 更新交易状态
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
     * 删除交易记录
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
     * 根据过滤条件获取交易记录
     */
    static getFilteredTransactions(filter: TransactionFilter): Transaction[] {
        const allTransactions = this.getAllTransactions();
        
        return allTransactions.filter(tx => {
            // 交易类型过滤
            if (filter.type && filter.type !== 'all' && tx.type !== filter.type) {
                return false;
            }

            // 状态过滤
            if (filter.status && filter.status !== 'all' && tx.status !== filter.status) {
                return false;
            }

            // 链ID过滤
            if (filter.chainId && tx.chainId !== filter.chainId) {
                return false;
            }

            // 代币过滤
            if (filter.token && filter.token !== 'all' && tx.token !== filter.token) {
                return false;
            }

            // 时间过滤
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
     * 获取交易统计数据
     */
    static getTransactionStats(userAddress?: string, chainId?: number): TransactionStats {
        let transactions = this.getAllTransactions();
        
        // 按用户地址过滤
        if (userAddress) {
            transactions = transactions.filter(tx => 
                tx.userAddress.toLowerCase() === userAddress.toLowerCase()
            );
        }

        // 按链ID过滤
        if (chainId) {
            transactions = transactions.filter(tx => tx.chainId === chainId);
        }

        const completed = transactions.filter(tx => tx.status === 'completed');
        const pending = transactions.filter(tx => tx.status === 'pending');
        const failed = transactions.filter(tx => tx.status === 'failed');

        // 计算总交易量（USD）
        const totalVolume = completed.reduce((sum, tx) => {
            const value = parseFloat(tx.value.replace(/[$,]/g, '')) || 0;
            return sum + value;
        }, 0);

        // 统计最常用的代币
        const tokenCounts: { [key: string]: number } = {};
        transactions.forEach(tx => {
            tokenCounts[tx.token] = (tokenCounts[tx.token] || 0) + 1;
        });
        const mostUsedToken = Object.keys(tokenCounts).reduce((a, b) => 
            tokenCounts[a] > tokenCounts[b] ? a : b, 'N/A'
        );

        // 统计最常用的链
        const chainCounts: { [key: number]: number } = {};
        transactions.forEach(tx => {
            chainCounts[tx.chainId] = (chainCounts[tx.chainId] || 0) + 1;
        });
        const mostUsedChainId = Object.keys(chainCounts).reduce((a, b) => 
            chainCounts[parseInt(a)] > chainCounts[parseInt(b)] ? a : b, '0'
        );
        const mostUsedChain = mostUsedChainId === '97' ? 'BSC Testnet' : 
                             mostUsedChainId === '11155111' ? 'Sepolia Testnet' : 'Unknown';

        // 计算平均Gas费用
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
     * 获取用户特定链上的交易记录
     */
    static getUserTransactions(userAddress: string, chainId?: number): Transaction[] {
        return this.getAllTransactions().filter(tx => {
            const matchUser = tx.userAddress.toLowerCase() === userAddress.toLowerCase();
            const matchChain = !chainId || tx.chainId === chainId;
            return matchUser && matchChain;
        });
    }

    /**
     * 清空所有交易记录
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
     * 导出交易记录为JSON
     */
    static exportTransactions(): string {
        const transactions = this.getAllTransactions();
        return JSON.stringify(transactions, null, 2);
    }

    /**
     * 导入交易记录
     */
    static importTransactions(jsonData: string): boolean {
        try {
            const transactions: Transaction[] = JSON.parse(jsonData);
            
            // 验证数据格式
            if (!Array.isArray(transactions)) {
                throw new Error('Invalid data format');
            }

            // 合并现有数据
            const existingTransactions = this.getAllTransactions();
            const allTransactions = [...transactions, ...existingTransactions];
            
            // 去重（基于ID和txHash）
            const uniqueTransactions = allTransactions.filter((tx, index, arr) => 
                arr.findIndex(t => t.id === tx.id || (t.txHash && t.txHash === tx.txHash)) === index
            );

            // 限制数量
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
     * 生成唯一交易ID
     */
    private static generateTransactionId(): string {
        return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 获取存储信息
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