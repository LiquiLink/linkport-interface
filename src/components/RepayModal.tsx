import React, { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { parseEther } from 'viem';
import { formatUnits } from 'viem';
import { sepolia, bscTestnet } from 'wagmi/chains';
import linkPortABI from '../abi/LinkPort.json';
import ERC20ABI from '../abi/ERC20.json';
import { useToast } from './Toast';
import { getUserAssetBalance } from '../utils/balance';
import useTransactions  from '../hooks/useTransactions';
import { useTransactionCreator } from '../hooks/useTransactions';
import { ethers } from 'ethers';
import { TransactionFilter } from '../utils/transactionStorage';
import { chainSelector, linkPorts, poolList } from '../config'
import { getLoan, getUserIntrest } from '../utils/pool';
import { getAssetPriceFromPort } from '../utils/priceService';
import { useWriteContract } from 'wagmi';
import { parseMutationArgs } from '@tanstack/react-query';

interface RepayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface BorrowedAsset {
  symbol: string;
  amount: string;
  value: number;
  chainId: number;
  price: number;
  address: string;
  interestAccrued: number;
  healthFactor: number;
  pool: string;
}

const RepayModal: React.FC<RepayModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { address } = useAccount();
  const chainId = useChainId();
  const { showToast } = useToast();

  // State management
  const [borrowedAssets, setBorrowedAssets] = useState<BorrowedAsset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<BorrowedAsset | null>(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userBalance, setUserBalance] = useState('0');
  const [isRepayLoading, setIsRepayLoading] = useState(false);

  const {
    createRepayTransaction
  } = useTransactionCreator();

  const debt = '0xa28C606a33AF8175F3bBf71d74796aDa360f4C49'

  const { writeContract: writeContractRepay, isPending: isPendingRepay} = useWriteContract();
  const { writeContract: writeContractApprove, isPending: isPendingApprove} = useWriteContract();

  // Load user's borrowed assets
  useEffect(() => {
    const loadBorrowedAssets = async () => {
          const debtAssetsPromises = poolList.filter(pool => pool.chainId === bscTestnet.id).map(async (pool) => {
            let loan = null;
            if (address) {
                try {
                    loan = await getLoan(
                        pool, 
                        debt,
                        address,
                        sepolia.id
                    );
                    let intrestAccrued = await getUserIntrest(
                        pool, 
                        debt,
                        address,
                        sepolia.id
                    );
                    const [tokenAmount, amount, intrest, startTime ] = loan;
                    if (loan != null) {
                      const price = await getAssetPriceFromPort(pool.address, pool.chainId);
                      const _amount = Number(amount) / 10 ** 18; // Assuming 18 decimals for simplicity
                      const value = price ? price?.price * _amount : _amount;
                      return {
                        symbol: pool.name,
                        amount: _amount,
                        value: value,
                        chainId: pool.chainId,
                        address: pool.address,
                        pool: pool.pool,
                        price: price,
                        timestamp: Number(startTime),
                        interestAccrued: intrestAccrued ? Number(intrestAccrued) / 10 ** 18 : 0, // Assuming 18 decimals for interest
                        healthFactor: calculateHealthFactor(value)
                      };
                    }
                } catch (error) {
                    console.log("Failed to get user asset balance:", error);
                }
            }
        });

        const borrowedAssets = await Promise.all(debtAssetsPromises);
        console.log('Borrowed assets:', borrowedAssets);
        const assets: BorrowedAsset[] = borrowedAssets?.filter((asset: any) => asset != null && asset.amount > 0).map((asset: any) => ({
            symbol: asset.symbol,
            amount: asset.amount,
            price: asset.price?.price || 0,
            value: asset.value,
            pool: asset.pool,
            chainId: asset.chainId,
            address: asset.address,
            interestAccrued: asset.interestAccrued,
            healthFactor: calculateHealthFactor(asset.value)
          })) || [];
        setBorrowedAssets(assets);
      /*
      if (!address || !isOpen) return;

      const filter: TransactionFilter = {
        status: 'borrow',
      };
      applyFilter(filter);
      try {
        // Get borrowed assets from localStorage
        const borrowedData = localStorage.getItem(`user_borrowings_${address}`);
        if (borrowedData) {
          const parsed = JSON.parse(borrowedData);
          
          // Format borrowed assets with current interest
          const assets: BorrowedAsset[] = parsed.borrowedAssets?.map((asset: any) => ({
            symbol: asset.symbol,
            amount: asset.amount,
            value: asset.value,
            chainId: asset.chainId,
            address: asset.address,
            interestAccrued: calculateInterest(asset.amount, asset.timestamp),
            healthFactor: calculateHealthFactor(asset.value)
          })) || [];

          setBorrowedAssets(assets);
          if (assets.length > 0) {
            setSelectedAsset(assets[0]);
          }
        }
      } catch (error) {
        console.error('Failed to load borrowed assets:', error);
        showToast('Failed to load borrowed assets', 'error');
      }
       */
    };

    loadBorrowedAssets();
  }, [address, isOpen]);

  // Load user balance for selected asset
  useEffect(() => {
    const loadUserBalance = async () => {
      if (!selectedAsset || !address) return;

      try {
        const balance = await getUserAssetBalance(
          selectedAsset.address,
          address,
          selectedAsset.chainId,
          selectedAsset.symbol === 'ETH' || selectedAsset.symbol === 'BNB'
        );
        setUserBalance(formatUnits(balance as bigint, 18));
      } catch (error) {
        console.error('Failed to load user balance:', error);
        setUserBalance('0');
      }
    };

    loadUserBalance();
  }, [selectedAsset, address]);

  // Calculate interest (simple 2.5% APR for demo)
  const calculateInterest = (principal: number, timestamp: number): number => {
    const timeElapsed = Date.now() - timestamp
    const interestRate = 0.20; // 2.5% APR
    return principal * interestRate * timeElapsed / 86400 * 365;
  };

  // Calculate health factor based on debt value
  const calculateHealthFactor = (debtValue: number): number => {
    // Mock calculation - should be based on actual collateral
    const mockCollateralValue = debtValue * 1.5; // Assume 150% collateralization
    return mockCollateralValue / debtValue;
  };

  // Handle repay execution
  const handleRepay = async () => {
    if (!selectedAsset || !repayAmount || !address) {
      showToast('Please select an asset and enter amount', 'warning');
      return;
    }

    if (parseFloat(repayAmount) > parseFloat(userBalance)) {
      showToast('Insufficient balance for repayment', 'error');
      return;
    }

    setIsRepayLoading(true);

    try {

      const linkPort = linkPorts[bscTestnet.id];

      const executeRepay = async () => {
            await writeContractRepay({
                address: linkPort as `0x${string}`,
                abi: linkPortABI,
                functionName: 'repay',
                args: [chainSelector[sepolia.id], debt, [selectedAsset.address], [parseEther(repayAmount)]],
                chainId: bscTestnet.id,
                chain: bscTestnet,
                account: address
            }, 
            {
                onSuccess: (txHash) => {
                    console.log('✅ Repay successful:', txHash);
                    createRepayTransaction(
                        selectedAsset.symbol,
                        repayAmount,
                        (Number(repayAmount) * Number(selectedAsset.price)).toString(),
                        txHash
                    );
                    showToast('Repayment confirmed!', 'success');
                },
                onError: (error) => {
                    console.error('❌ Repayment failed:', error);
                    showToast('Repayment failed: ' + error.message, 'error');
                }
            });

            showToast(`Successfully repaid ${repayAmount} ${selectedAsset.symbol}`, 'success');
            onSuccess?.();
            onClose();

      }

      await writeContractApprove({
          address: selectedAsset.address as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'approve',
          args: [selectedAsset.pool as `0x${string}`, parseEther(repayAmount)],
          chainId: bscTestnet.id,
          chain: bscTestnet,
          account: address
      },
      {
          onSuccess: (txHash) => {
              console.log('✅ Approval successful:', txHash);
              showToast('Approval confirmed! Now borrowing...', 'success');
              executeRepay();
            },
          onError: (error) => {
              console.error('❌ Approval failed:', error);
              showToast('Approval failed: ' + error.message, 'error');
          }
      });



    } catch (error) {
      console.error('Repay failed:', error);
      showToast('Repayment failed. Please try again.', 'error');
    } finally {
      setIsRepayLoading(false);
    }
  };

  const handleMaxRepay = () => {
    if (selectedAsset) {
      const maxRepayable = Math.min(
        parseFloat(userBalance),
        parseFloat(selectedAsset.amount) + selectedAsset.interestAccrued
      );
      setRepayAmount(maxRepayable.toFixed(6));
    }
  };

  const getHealthFactorColor = (healthFactor: number) => {
    if (healthFactor >= 1.5) return '#10b981';
    if (healthFactor >= 1.2) return '#f59e0b';
    if (healthFactor >= 1.0) return '#ef4444';
    return '#dc2626';
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content repay-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>💳 Repay Borrowed Assets</h3>
          <button className="close-button" onClick={onClose}>
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="modal-body">
          {borrowedAssets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <h4>No Outstanding Debt</h4>
              <p>You don't have any assets to repay. Great job managing your finances!</p>
            </div>
          ) : (
            <>
              {/* Asset Selection */}
              <div className="form-section">
                <label>Select Asset to Repay</label>
                <div className="asset-selector">
                  {borrowedAssets.map((asset, index) => (
                    <div
                      key={`${asset.symbol}-${asset.chainId}`}
                      className={`asset-option ${selectedAsset?.symbol === asset.symbol ? 'selected' : ''}`}
                      onClick={() => setSelectedAsset(asset)}
                    >
                      <div className="asset-info">
                        <div className="asset-icon">
                          {asset.symbol}
                        </div>
                        <div className="asset-details">
                          <div className="asset-name">{asset.symbol}</div>
                          <div className="asset-amount">
                            Owed: {(parseFloat(asset.amount) + asset.interestAccrued).toFixed(6)}
                          </div>
                        </div>
                      </div>
                      <div className="asset-health">
                        <div 
                          className="health-indicator"
                          style={{ color: getHealthFactorColor(asset.healthFactor) }}
                        >
                          HF: {asset.healthFactor.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedAsset && (
                <>
                  {/* Repay Amount Input */}
                  <div className="form-section">
                    <label>Repay Amount</label>
                    <div className="amount-input-container">
                      <input
                        type="text"
                        value={repayAmount}
                        onChange={(e) => setRepayAmount(e.target.value)}
                        placeholder="Enter repay amount"
                        className="amount-input"
                      />
                      <button
                        className="max-button"
                        onClick={handleMaxRepay}
                      >
                        MAX
                      </button>
                    </div>
                    <div className="balance-info">
                      <span>Available: {parseFloat(userBalance).toFixed(6)} {selectedAsset.symbol}</span>
                      <span>Total Owed: {(parseFloat(selectedAsset.amount) + selectedAsset.interestAccrued).toFixed(6)} {selectedAsset.symbol}</span>
                    </div>
                  </div>

                  {/* Interest Information */}
                  <div className="info-section">
                    <div className="info-card">
                      <div className="info-row">
                        <span>Principal Amount:</span>
                        <span>{parseFloat(selectedAsset.amount).toFixed(6)} {selectedAsset.symbol}</span>
                      </div>
                      <div className="info-row">
                        <span>Interest Accrued:</span>
                        <span>{selectedAsset.interestAccrued.toFixed(6)} {selectedAsset.symbol}</span>
                      </div>
                      <div className="info-row total">
                        <span>Total to Repay:</span>
                        <span>{(parseFloat(selectedAsset.amount) + selectedAsset.interestAccrued).toFixed(6)} {selectedAsset.symbol}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {borrowedAssets.length > 0 && selectedAsset && (
          <div className="modal-footer">
            <button
              className="button button-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              className="button button-primary"
              onClick={handleRepay}
              disabled={isLoading || !repayAmount || parseFloat(repayAmount) <= 0}
            >
              {isLoading ? (
                <>
                  <div className="spinner"></div>
                  Processing...
                </>
              ) : (
                `💰 Repay ${selectedAsset.symbol}`
              )}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: var(--space-lg);
        }

        .modal-content {
          background: var(--bg-glass);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-xl);
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: var(--shadow-large);
          backdrop-filter: blur(20px);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-xl);
          border-bottom: 1px solid var(--border-glass);
        }

        .modal-header h3 {
          margin: 0;
          color: var(--text-primary);
          font-size: 20px;
          font-weight: 700;
        }

        .close-button {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 18px;
          cursor: pointer;
          padding: var(--space-sm);
          border-radius: var(--radius-md);
          transition: all var(--transition-normal);
        }

        .close-button:hover {
          background: var(--bg-surface);
          color: var(--text-primary);
        }

        .modal-body {
          padding: var(--space-xl);
        }

        .empty-state {
          text-align: center;
          padding: var(--space-2xl);
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: var(--space-lg);
        }

        .empty-state h4 {
          margin: 0 0 var(--space-md) 0;
          color: var(--text-primary);
          font-size: 18px;
        }

        .empty-state p {
          margin: 0;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .form-section {
          margin-bottom: var(--space-xl);
        }

        .form-section label {
          display: block;
          margin-bottom: var(--space-md);
          color: var(--text-primary);
          font-weight: 600;
        }

        .asset-selector {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }

        .asset-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-lg);
          background: var(--bg-surface);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-lg);
          cursor: pointer;
          transition: all var(--transition-normal);
        }

        .asset-option:hover {
          background: var(--bg-hover);
          border-color: var(--accent-primary);
        }

        .asset-option.selected {
          background: rgba(6, 182, 212, 0.1);
          border-color: var(--accent-primary);
        }

        .asset-info {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }

        .asset-icon {
          width: 40px;
          height: 40px;
          background: var(--accent-gradient);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 12px;
        }

        .asset-details {
          display: flex;
          flex-direction: column;
        }

        .asset-name {
          font-weight: 700;
          color: var(--text-primary);
        }

        .asset-amount {
          font-size: 14px;
          color: var(--text-secondary);
        }

        .asset-health {
          text-align: right;
        }

        .health-indicator {
          font-weight: 700;
          font-size: 14px;
        }

        .amount-input-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .amount-input {
          width: 100%;
          padding: var(--space-lg);
          padding-right: 80px;
          background: var(--bg-surface);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-lg);
          color: var(--text-primary);
          font-size: 16px;
          font-weight: 600;
        }

        .amount-input:focus {
          outline: none;
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.1);
        }

        .max-button {
          position: absolute;
          right: var(--space-sm);
          background: var(--accent-gradient);
          border: none;
          border-radius: var(--radius-md);
          color: white;
          padding: var(--space-sm) var(--space-md);
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          transition: all var(--transition-normal);
        }

        .max-button:hover {
          transform: translateY(-1px);
          box-shadow: var(--shadow-medium);
        }

        .balance-info {
          display: flex;
          justify-content: space-between;
          margin-top: var(--space-sm);
          font-size: 14px;
          color: var(--text-secondary);
        }

        .info-section {
          margin-bottom: var(--space-xl);
        }

        .info-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: var(--space-md);
          color: var(--text-secondary);
        }

        .info-row:last-child {
          margin-bottom: 0;
        }

        .info-row.total {
          padding-top: var(--space-md);
          border-top: 1px solid var(--border-glass);
          color: var(--text-primary);
          font-weight: 700;
        }

        .modal-footer {
          display: flex;
          gap: var(--space-md);
          padding: var(--space-xl);
          border-top: 1px solid var(--border-glass);
        }

        .button {
          flex: 1;
          padding: var(--space-lg);
          border: none;
          border-radius: var(--radius-lg);
          font-weight: 700;
          cursor: pointer;
          transition: all var(--transition-normal);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-sm);
        }

        .button-primary {
          background: var(--accent-gradient);
          color: white;
        }

        .button-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: var(--shadow-medium);
        }

        .button-secondary {
          background: var(--bg-surface);
          color: var(--text-primary);
          border: 1px solid var(--border-glass);
        }

        .button-secondary:hover:not(:disabled) {
          background: var(--bg-hover);
        }

        .button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .modal-overlay {
            padding: var(--space-md);
          }

          .modal-content {
            max-height: 95vh;
          }

          .asset-option {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-md);
          }

          .balance-info {
            flex-direction: column;
            gap: var(--space-xs);
          }
        }
      `}</style>
    </div>
  );
};

export default RepayModal; 