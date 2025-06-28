import React, { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { sepolia, bscTestnet } from 'wagmi/chains';

const WalletConnect: React.FC = () => {
    const { address, isConnected } = useAccount();
    const { connect, connectors, isPending } = useConnect();
    const { disconnect } = useDisconnect();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();
    const [showConnectors, setShowConnectors] = useState(false);

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const getChainName = (chainId: number) => {
        switch (chainId) {
            case sepolia.id:
                return 'Sepolia';
            case bscTestnet.id:
                return 'BSC Testnet';
            default:
                return 'Unknown';
        }
    };

    const getChainColor = (chainId: number) => {
        switch (chainId) {
            case sepolia.id:
                return '#627EEA';
            case bscTestnet.id:
                return '#F3BA2F';
            default:
                return '#6B7280';
        }
    };

    if (!isConnected) {
        return (
            <div style={{ position: 'relative' }}>
                <button
                    onClick={() => setShowConnectors(!showConnectors)}
                    disabled={isPending}
                    style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '12px 20px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: isPending ? 'not-allowed' : 'pointer',
                        opacity: isPending ? 0.7 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                    }}
                >
                    <i className="fas fa-wallet"></i>
                    {isPending ? 'Connecting...' : 'Connect Wallet'}
                </button>

                {showConnectors && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '8px',
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                        border: '1px solid var(--border-color)',
                        zIndex: 1000,
                        minWidth: '200px',
                        overflow: 'hidden'
                    }}>
                        {connectors.map((connector) => (
                            <button
                                key={connector.id}
                                onClick={() => {
                                    connect({ connector });
                                    setShowConnectors(false);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    border: 'none',
                                    background: 'transparent',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    transition: 'background-color 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    (e.target as HTMLElement).style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    (e.target as HTMLElement).style.backgroundColor = 'transparent';
                                }}
                            >
                                <i className="fas fa-wallet" style={{ color: 'var(--accent-color)' }}></i>
                                {connector.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '12px',
            padding: '8px',
            border: '1px solid var(--border-color)'
        }}>
                                    {/* Chain switch button */}
            <div style={{ position: 'relative' }}>
                <button
                    onClick={() => setShowConnectors(!showConnectors)}
                    style={{
                        background: getChainColor(chainId),
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <i className="fas fa-link"></i>
                    {getChainName(chainId)}
                </button>

                {showConnectors && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '4px',
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                        border: '1px solid var(--border-color)',
                        zIndex: 1000,
                        minWidth: '160px',
                        overflow: 'hidden'
                    }}>
                        <button
                            onClick={() => {
                                switchChain({ chainId: sepolia.id });
                                setShowConnectors(false);
                            }}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: 'none',
                                background: chainId === sepolia.id ? 'rgba(98, 126, 234, 0.1)' : 'transparent',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 500
                            }}
                        >
                            🔹 Ethereum Sepolia
                        </button>
                        <button
                            onClick={() => {
                                switchChain({ chainId: bscTestnet.id });
                                setShowConnectors(false);
                            }}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                border: 'none',
                                background: chainId === bscTestnet.id ? 'rgba(243, 186, 47, 0.1)' : 'transparent',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 500
                            }}
                        >
                            🟡 BSC Testnet
                        </button>
                    </div>
                )}
            </div>

                                    {/* Wallet address */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: 'rgba(102, 126, 234, 0.1)',
                borderRadius: '8px'
            }}>
                <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#22c55e'
                }}></div>
                <span style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-color)',
                    fontFamily: 'monospace'
                }}>
                    {formatAddress(address!)}
                </span>
            </div>

                                    {/* Disconnect button */}
            <button
                onClick={() => disconnect()}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--secondary-text)',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.color = '#ef4444';
                    (e.target as HTMLElement).style.background = 'rgba(239, 68, 68, 0.1)';
                }}
                onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.color = 'var(--secondary-text)';
                    (e.target as HTMLElement).style.background = 'none';
                }}
                title="Disconnect Wallet"
            >
                <i className="fas fa-sign-out-alt"></i>
            </button>
        </div>
    );
};

export default WalletConnect; 