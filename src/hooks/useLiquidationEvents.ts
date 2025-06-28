import { useEffect } from 'react';
import { useAccount, useChainId, useWatchContractEvent } from 'wagmi';
import { useTransactionCreator } from './useTransactions';
import { getMultipleAssetPrices } from '../utils/priceService';
import { formatUnits } from 'ethers';
import LiquidationABI from '../abi/Liquidation.json';

interface LiquidationEventData {
    borrower: string;
    amount: bigint;
    token: string;
    penalty: bigint;
}

const useLiquidationEvents = (liquidationContractAddress?: string) => {
    const { address } = useAccount();
    const chainId = useChainId();
    const { createLiquidationTransaction } = useTransactionCreator();

    // Listen for liquidation events
    useWatchContractEvent({
        address: liquidationContractAddress as `0x${string}`,
        abi: LiquidationABI,
        eventName: 'Liquidated',
        enabled: !!liquidationContractAddress && !!address,
        onLogs: async (logs) => {
            console.log('🚨 Liquidation event detected:', logs);
            
            for (const log of logs) {
                try {
                    await handleLiquidationEvent(log);
                } catch (error) {
                    console.error('❌ Failed to handle liquidation event:', error);
                }
            }
        }
    });

    const handleLiquidationEvent = async (log: any) => {
        try {
            const { borrower, amount, token, penalty } = log.args as LiquidationEventData;
            
                            // Only record liquidation events related to current user
            if (borrower.toLowerCase() !== address?.toLowerCase()) {
                return;
            }

            const formattedAmount = formatUnits(amount, 18);
            const formattedPenalty = formatUnits(penalty, 18);

                            // Get token price to calculate USD value
            let usdValue = '$0.00';
            try {
                const prices = await getMultipleAssetPrices(['ETH', 'LINK', 'USDT', 'BNB'], chainId || 97);
                const tokenSymbol = getTokenSymbol(token);
                const priceData = prices[tokenSymbol];
                if (priceData) {
                    const value = parseFloat(formattedAmount) * priceData.price;
                    usdValue = `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }
            } catch (error) {
                console.warn('⚠️ Failed to fetch price for liquidation value calculation:', error);
            }

                            // Create liquidation transaction record
            await createLiquidationTransaction(
                getTokenSymbol(token),
                formattedAmount,
                usdValue,
                borrower,
                log.transactionHash,
                formattedPenalty,
                formattedAmount // In this example, liquidation amount equals forfeited collateral
            );

            console.log('✅ Liquidation transaction recorded:', {
                borrower,
                amount: formattedAmount,
                token: getTokenSymbol(token),
                value: usdValue,
                penalty: formattedPenalty
            });

        } catch (error) {
            console.error('❌ Error handling liquidation event:', error);
        }
    };

    // Helper function: get token symbol based on token address
    const getTokenSymbol = (tokenAddress: string): string => {
        // Should return symbol based on actual token address mapping
        // Simplified version, actual application should maintain an address-to-symbol mapping
        const tokenMap: { [key: string]: string } = {
            // Add actual token address mapping
            '0x779877A7B0D9E8603169DdbD7836e478b4624789': 'LINK',
            '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd': 'USDT',
            '0x0000000000000000000000000000000000000000': 'ETH', // Native ETH
            // More token mappings...
        };
        
        return tokenMap[tokenAddress.toLowerCase()] || 'UNKNOWN';
    };

    return {
        // Can return some states or methods for component use
        isListening: !!liquidationContractAddress && !!address
    };
};

export default useLiquidationEvents;

// Simplified version of liquidation event listening Hook, suitable for demo
export const useLiquidationDemo = () => {
    const { createLiquidationTransaction } = useTransactionCreator();

    // Create simulated liquidation event for demo
    const createDemoLiquidation = async () => {
        try {
            await createLiquidationTransaction(
                'ETH',
                '2.5',
                '$7,500.00',
                '0x1234...5678',
                '0xabcd1234...', // Mock transaction hash
                '0.25', // 10% liquidation penalty
                '2.75' // Forfeited collateral (principal + penalty)
            );
            
            console.log('✅ Demo liquidation transaction created');
            alert('Demo liquidation event has been recorded in transaction history!');
        } catch (error) {
            console.error('❌ Failed to create demo liquidation:', error);
            alert('Failed to create demo liquidation');
        }
    };

    return {
        createDemoLiquidation
    };
}; 