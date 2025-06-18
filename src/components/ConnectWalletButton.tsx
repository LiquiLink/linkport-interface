import React, { useState } from 'react';

const ConnectWalletButton = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [address, setAddress] = useState('');

    const connectWallet = () => {
        // 模拟钱包连接
        setIsConnected(true);
        setAddress('0x1234...5678');
    };

    const disconnectWallet = () => {
        setIsConnected(false);
        setAddress('');
    };

    if (isConnected) {
        return (
            <button 
                onClick={disconnectWallet} 
                style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    padding: '8px 16px',
                    color: 'white',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
            >
                {address || 'Connected'}
            </button>
        );
    }

    return (
        <button
            onClick={connectWallet}
            style={{
                background: '#4166f5',
                border: 'none',
                borderRadius: '12px',
                padding: '8px 16px',
                color: 'white',
                fontWeight: 500,
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
                e.currentTarget.style.background = '#3658e1';
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.background = '#4166f5';
            }}
        >
            Connect Wallet
        </button>
    );
};

export default ConnectWalletButton;