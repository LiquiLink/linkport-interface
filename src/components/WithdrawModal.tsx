import React, { useState } from 'react';
import Modal from './Modal';
import { useRouter } from 'next/router';

interface WithdrawModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    userPositions?: any[];
}

const WithdrawModal: React.FC<WithdrawModalProps> = ({ 
    isOpen, 
    onClose, 
    onSuccess, 
    userPositions = [] 
}) => {
    const router = useRouter();
    const [selectedPosition, setSelectedPosition] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawType, setWithdrawType] = useState<'partial' | 'full'>('partial');

    const handleWithdraw = () => {
        if (selectedPosition) {
            // Navigate to pools page with withdraw action
            router.push(`/pools?action=withdraw&position=${selectedPosition}&amount=${withdrawAmount}&type=${withdrawType}`);
            onClose();
        }
    };

    const handleManageLiquidity = () => {
        router.push('/pools');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Withdraw Assets" size="medium">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {userPositions.length > 0 ? (
                    <>
                        {/* Quick Withdraw Section */}
                        <div>
                            <h3 style={{ 
                                margin: '0 0 16px 0', 
                                fontSize: '18px', 
                                fontWeight: 600, 
                                color: 'var(--text-color)' 
                            }}>
                                Quick Withdraw
                            </h3>
                            
                            {/* Position Selection */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ 
                                    display: 'block', 
                                    marginBottom: '8px', 
                                    fontWeight: 500, 
                                    color: 'var(--text-color)' 
                                }}>
                                    Select Position
                                </label>
                                <select
                                    value={selectedPosition}
                                    onChange={(e) => setSelectedPosition(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '12px',
                                        border: '2px solid rgba(0, 0, 0, 0.1)',
                                        background: 'rgba(255, 255, 255, 0.8)',
                                        fontSize: '16px',
                                        color: 'var(--text-color)'
                                    }}
                                >
                                    <option value="">Choose a position...</option>
                                    {userPositions.map((position, index) => (
                                        <option key={index} value={position.poolId}>
                                            {position.token} Pool - {parseFloat(position.shares).toFixed(4)} LP (${position.value.toFixed(2)})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Withdraw Type */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ 
                                    display: 'block', 
                                    marginBottom: '8px', 
                                    fontWeight: 500, 
                                    color: 'var(--text-color)' 
                                }}>
                                    Withdraw Type
                                </label>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            value="partial"
                                            checked={withdrawType === 'partial'}
                                            onChange={(e) => setWithdrawType(e.target.value as 'partial')}
                                            style={{ marginRight: '8px' }}
                                        />
                                        Partial Withdraw
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            value="full"
                                            checked={withdrawType === 'full'}
                                            onChange={(e) => setWithdrawType(e.target.value as 'full')}
                                            style={{ marginRight: '8px' }}
                                        />
                                        Full Withdraw
                                    </label>
                                </div>
                            </div>

                            {/* Amount Input - only show for partial withdraw */}
                            {withdrawType === 'partial' && (
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ 
                                        display: 'block', 
                                        marginBottom: '8px', 
                                        fontWeight: 500, 
                                        color: 'var(--text-color)' 
                                    }}>
                                        Withdraw Amount (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        placeholder="25"
                                        min="1"
                                        max="100"
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '12px',
                                            border: '2px solid rgba(0, 0, 0, 0.1)',
                                            background: 'rgba(255, 255, 255, 0.8)',
                                            fontSize: '16px',
                                            color: 'var(--text-color)'
                                        }}
                                    />
                                    <div style={{ 
                                        fontSize: '12px', 
                                        color: 'var(--secondary-text)', 
                                        marginTop: '4px' 
                                    }}>
                                        Enter percentage (1-100%) of your position to withdraw
                                    </div>
                                </div>
                            )}

                            {/* Position Info */}
                            {selectedPosition && (
                                <div style={{
                                    padding: '12px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    marginBottom: '16px'
                                }}>
                                    {userPositions.find(p => p.poolId === selectedPosition) && (
                                        <div>
                                            <div style={{ fontWeight: 600, color: '#ef4444' }}>
                                                {userPositions.find(p => p.poolId === selectedPosition)?.token} Pool
                                            </div>
                                            <div style={{ fontSize: '14px', color: 'var(--secondary-text)' }}>
                                                Your Position: {parseFloat(userPositions.find(p => p.poolId === selectedPosition)?.shares || '0').toFixed(6)} LP
                                            </div>
                                            <div style={{ fontSize: '14px', color: '#22c55e', fontWeight: 500 }}>
                                                Value: ${userPositions.find(p => p.poolId === selectedPosition)?.value.toFixed(2)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Warning Section */}
                        <div style={{
                            padding: '16px',
                            background: 'rgba(245, 158, 11, 0.1)',
                            borderRadius: '12px',
                            border: '1px solid rgba(245, 158, 11, 0.2)'
                        }}>
                            <h4 style={{ margin: '0 0 8px 0', color: '#f59e0b', fontSize: '16px' }}>
                                ⚠️ Withdrawal Notice
                            </h4>
                            <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--secondary-text)', fontSize: '14px' }}>
                                <li>Withdrawing liquidity will stop earning rewards</li>
                                <li>Check for any impermanent loss before withdrawal</li>
                                <li>Consider partial withdrawal to maintain some exposure</li>
                            </ul>
                        </div>
                    </>
                ) : (
                    /* No Positions */
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
                        <h3 style={{ fontSize: '20px', marginBottom: '12px', color: 'var(--text-color)' }}>
                            No Liquidity Positions
                        </h3>
                        <p style={{ color: 'var(--secondary-text)', marginBottom: '24px' }}>
                            You don't have any liquidity positions to withdraw from. 
                            Add liquidity to pools first to start earning rewards.
                        </p>
                        <button 
                            onClick={handleManageLiquidity}
                            className="button primary"
                        >
                            Explore Pools
                        </button>
                    </div>
                )}

                {/* Action Buttons */}
                {userPositions.length > 0 && (
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={onClose}
                            className="button secondary"
                            style={{ flex: 1 }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleManageLiquidity}
                            className="button secondary"
                            style={{ flex: 1 }}
                        >
                            Manage All
                        </button>
                        <button
                            onClick={handleWithdraw}
                            className="button primary"
                            disabled={!selectedPosition || (withdrawType === 'partial' && !withdrawAmount)}
                            style={{ flex: 1 }}
                        >
                            {withdrawType === 'full' ? 'Withdraw All' : 'Withdraw Partial'}
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default WithdrawModal; 