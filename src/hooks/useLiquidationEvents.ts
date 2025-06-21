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

    // 监听清算事件
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
            
            // 只记录与当前用户相关的清算事件
            if (borrower.toLowerCase() !== address?.toLowerCase()) {
                return;
            }

            const formattedAmount = formatUnits(amount, 18);
            const formattedPenalty = formatUnits(penalty, 18);

            // 获取代币价格来计算USD价值
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

            // 创建清算交易记录
            await createLiquidationTransaction(
                getTokenSymbol(token),
                formattedAmount,
                usdValue,
                borrower,
                log.transactionHash,
                formattedPenalty,
                formattedAmount // 在这个例子中，清算金额等于被没收的抵押品
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

    // 辅助函数：根据代币地址获取代币符号
    const getTokenSymbol = (tokenAddress: string): string => {
        // 这里应该根据实际的代币地址映射返回符号
        // 简化版本，实际应用中应该维护一个地址到符号的映射
        const tokenMap: { [key: string]: string } = {
            // 添加实际的代币地址映射
            '0x779877A7B0D9E8603169DdbD7836e478b4624789': 'LINK',
            '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd': 'USDT',
            '0x0000000000000000000000000000000000000000': 'ETH', // 原生ETH
            // 更多代币映射...
        };
        
        return tokenMap[tokenAddress.toLowerCase()] || 'UNKNOWN';
    };

    return {
        // 可以返回一些状态或方法供组件使用
        isListening: !!liquidationContractAddress && !!address
    };
};

export default useLiquidationEvents;

// 清算事件监听Hook的简化版本，适用于演示
export const useLiquidationDemo = () => {
    const { createLiquidationTransaction } = useTransactionCreator();

    // 演示用的模拟清算事件创建
    const createDemoLiquidation = async () => {
        try {
            await createLiquidationTransaction(
                'ETH',
                '2.5',
                '$7,500.00',
                '0x1234...5678',
                '0xabcd1234...', // 模拟交易哈希
                '0.25', // 10% 清算罚金
                '2.75' // 被没收的抵押品（本金+罚金）
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