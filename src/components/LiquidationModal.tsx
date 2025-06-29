import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useToast } from './Toast';

interface LiquidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface LiquidatablePosition {
  userAddress: string;
  collateralAsset: string;
  collateralAmount: string;
  debtAsset: string;
  debtAmount: string;
  healthFactor: number;
  liquidationReward: number;
}

const LiquidationModal: React.FC<LiquidationModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { address } = useAccount();
  const { showToast } = useToast();

  const [liquidatablePositions, setLiquidatablePositions] = useState<LiquidatablePosition[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<LiquidatablePosition | null>(null);
  const [liquidationAmount, setLiquidationAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Mock liquidatable positions
    const mockPositions: LiquidatablePosition[] = [
      {
        userAddress: '0x742d35Cc9baA4b8f76b0A09fFf1E0BB7D9D6F123',
        collateralAsset: 'ETH',
        collateralAmount: '2.5',
        debtAsset: 'USDT',
        debtAmount: '4800',
        healthFactor: 0.95,
        liquidationReward: 0.05
      },
      {
        userAddress: '0x8ba1f109551bD432803012645Hac189451c9E456',
        collateralAsset: 'BNB',
        collateralAmount: '15.0',
        debtAsset: 'USDT',
        debtAmount: '8500',
        healthFactor: 0.88,
        liquidationReward: 0.05
      }
    ];

    setLiquidatablePositions(mockPositions);
    if (mockPositions.length > 0) {
      setSelectedPosition(mockPositions[0]);
    }
  }, [isOpen]);

  const handleLiquidate = async () => {
    if (!selectedPosition || !liquidationAmount || !address) {
      showToast('Please select a position and enter amount', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setLiquidatablePositions(prev => 
        prev.filter(pos => pos.userAddress !== selectedPosition.userAddress)
      );

      showToast('Liquidation successful!', 'success');
      onSuccess?.();
      onClose();
    } catch (error) {
      showToast('Liquidation failed. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getHealthFactorColor = (healthFactor: number) => {
    if (healthFactor >= 1.0) return '#f59e0b';
    if (healthFactor >= 0.9) return '#ef4444';
    return '#dc2626';
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>⚡ Liquidation Center</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {liquidatablePositions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🛡️</div>
              <h4>No Liquidatable Positions</h4>
              <p>All positions are currently healthy.</p>
            </div>
          ) : (
            <>
              <div className="form-section">
                <label>Select Position to Liquidate</label>
                <div className="position-selector">
                  {liquidatablePositions.map((position) => (
                    <div
                      key={position.userAddress}
                      className={`position-option ${selectedPosition?.userAddress === position.userAddress ? 'selected' : ''}`}
                      onClick={() => setSelectedPosition(position)}
                    >
                      <div className="position-info">
                        <div className="user-address">
                          {position.userAddress.slice(0, 6)}...{position.userAddress.slice(-4)}
                        </div>
                        <div className="position-details">
                          {position.collateralAmount} {position.collateralAsset} → {position.debtAmount} {position.debtAsset}
                        </div>
                      </div>
                      <div 
                        className="health-badge"
                        style={{ 
                          background: getHealthFactorColor(position.healthFactor),
                          color: 'white'
                        }}
                      >
                        HF: {position.healthFactor.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedPosition && (
                <div className="form-section">
                  <label>Liquidation Amount ({selectedPosition.debtAsset})</label>
                  <div className="amount-input-container">
                    <input
                      type="text"
                      value={liquidationAmount}
                      onChange={(e) => setLiquidationAmount(e.target.value)}
                      placeholder="Enter liquidation amount"
                      className="amount-input"
                    />
                    <button
                      className="max-button"
                      onClick={() => setLiquidationAmount((parseFloat(selectedPosition.debtAmount) * 0.5).toFixed(2))}
                    >
                      MAX
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {liquidatablePositions.length > 0 && selectedPosition && (
          <div className="modal-footer">
            <button className="button button-secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
            <button
              className="button button-danger"
              onClick={handleLiquidate}
              disabled={isLoading || !liquidationAmount}
              style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white' }}
            >
              {isLoading ? 'Executing...' : '⚡ Liquidate Position'}
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
          font-size: 24px;
          cursor: pointer;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
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

        .position-selector {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }

        .position-option {
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

        .position-option:hover {
          background: var(--bg-hover);
          border-color: var(--danger);
        }

        .position-option.selected {
          background: rgba(239, 68, 68, 0.1);
          border-color: var(--danger);
        }

        .position-info {
          flex: 1;
        }

        .user-address {
          font-family: 'Monaco', 'Consolas', monospace;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: var(--space-xs);
        }

        .position-details {
          font-size: 14px;
          color: var(--text-secondary);
        }

        .health-badge {
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-weight: 700;
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
          border-color: var(--danger);
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        .max-button {
          position: absolute;
          right: var(--space-sm);
          background: var(--danger);
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

        .button-secondary {
          background: var(--bg-surface);
          color: var(--text-primary);
          border: 1px solid var(--border-glass);
        }

        .button-secondary:hover:not(:disabled) {
          background: var(--bg-hover);
        }

        .button-danger:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: var(--shadow-medium);
        }

        .button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .modal-overlay {
            padding: var(--space-md);
          }
        }
      `}</style>
    </div>
  );
};

export default LiquidationModal; 