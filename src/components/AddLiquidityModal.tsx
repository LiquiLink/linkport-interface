import React, { useState } from 'react';
import Modal from './Modal';
import { useRouter } from 'next/router';

interface AddLiquidityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const AddLiquidityModal: React.FC<AddLiquidityModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const router = useRouter();
    const [selectedPool, setSelectedPool] = useState('');
    const [amount, setAmount] = useState('');

    const availablePools = [
        { id: 'eth-pool', name: 'ETH Pool', apy: '8.5%', description: 'Ethereum pool on Sepolia' },
        { id: 'usdt-pool', name: 'USDT Pool', apy: '12.3%', description: 'USDT pool on Sepolia' },
        { id: 'link-pool', name: 'LINK Pool', apy: '15.7%', description: 'LINK pool on Sepolia' },
        { id: 'bnb-pool', name: 'BNB Pool', apy: '9.2%', description: 'BNB pool on BSC Testnet' }
    ];

    const handleAddLiquidity = () => {
        if (selectedPool && amount) {
            // Navigate to pools page with pre-selected pool
            router.push(`/pools?pool=${selectedPool}&action=add&amount=${amount}`);
            onClose();
        }
    };

    const handleAdvancedMode = () => {
        router.push('/pools');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Liquidity" size="medium">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Quick Add Section */}
                <div>
                    <h3 style={{ 
                        margin: '0 0 16px 0', 
                        fontSize: '18px', 
                        fontWeight: 600, 
                        color: 'var(--text-color)' 
                    }}>
                        Quick Add Liquidity
                    </h3>
                    
                    {/* Pool Selection */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ 
                            display: 'block', 
                            marginBottom: '8px', 
                            fontWeight: 500, 
                            color: 'var(--text-color)' 
                        }}>
                            Select Pool
                        </label>
                        <select
                            value={selectedPool}
                            onChange={(e) => setSelectedPool(e.target.value)}
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
                            <option value="">Choose a pool...</option>
                            {availablePools.map((pool) => (
                                <option key={pool.id} value={pool.id}>
                                    {pool.name} - APY: {pool.apy}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Amount Input */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ 
                            display: 'block', 
                            marginBottom: '8px', 
                            fontWeight: 500, 
                            color: 'var(--text-color)' 
                        }}>
                            Amount
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.0"
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
                    </div>

                    {/* Pool Info */}
                    {selectedPool && (
                        <div style={{
                            padding: '12px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: '8px',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            marginBottom: '16px'
                        }}>
                            {availablePools.find(p => p.id === selectedPool) && (
                                <div>
                                    <div style={{ fontWeight: 600, color: '#3b82f6' }}>
                                        {availablePools.find(p => p.id === selectedPool)?.name}
                                    </div>
                                    <div style={{ fontSize: '14px', color: 'var(--secondary-text)' }}>
                                        {availablePools.find(p => p.id === selectedPool)?.description}
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#22c55e', fontWeight: 500 }}>
                                        Current APY: {availablePools.find(p => p.id === selectedPool)?.apy}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Benefits Section */}
                <div style={{
                    padding: '16px',
                    background: 'rgba(34, 197, 94, 0.1)',
                    borderRadius: '12px',
                    border: '1px solid rgba(34, 197, 94, 0.2)'
                }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#22c55e', fontSize: '16px' }}>
                        💰 Liquidity Provider Benefits
                    </h4>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--secondary-text)', fontSize: '14px' }}>
                        <li>Earn yield from trading fees</li>
                        <li>Participate in protocol governance</li>
                        <li>Use LP tokens as collateral for borrowing</li>
                    </ul>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={onClose}
                        className="button secondary"
                        style={{ flex: 1 }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAdvancedMode}
                        className="button secondary"
                        style={{ flex: 1 }}
                    >
                        Advanced Mode
                    </button>
                    <button
                        onClick={handleAddLiquidity}
                        className="button primary"
                        disabled={!selectedPool || !amount}
                        style={{ flex: 1 }}
                    >
                        Add Liquidity
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default AddLiquidityModal; 
 
 