import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { useAccount, useDisconnect, useConnect, useChainId, useChains } from 'wagmi';
import { injected } from 'wagmi/connectors';

const connectorOptions = [
    { 
        name: 'MetaMask', 
        connector: injected({
            // Force local MetaMask extension only
            target: 'metaMask',
            shimDisconnect: true,
        })
    },
];

const WalletConnect: React.FC = () => {
    const { address, isConnected } = useAccount();
    const { connect, status, error } = useConnect();
    const { disconnect } = useDisconnect();
    const chainId  = useChainId();
    const chains = useChains();
    const [showModal, setShowModal] = useState(false);
    const [connecting, setConnecting] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [copyPopup, setCopyPopup] = useState(false);
    // Remove duplicate console.log to prevent excessive logging

    const jwt = typeof window !== 'undefined' ? localStorage.getItem('jwt') || '' : '';

    const handleConnect = async (connector: any, name: string) => {
        setConnecting(name);
        try {
            await connect({
                connector,
            });
        } finally {
            setConnecting(null);
        }
    };

    const handleCopy = async () => {
        if (address) {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setCopyPopup(true);
            setTimeout(() => {
                setCopied(false);
                setCopyPopup(false);
            }, 1200);
        }
    };

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    let networkName = '';
    if (chains && chains.length && chainId) {
        const found = chains.find(c => c.id === chainId);
        if (found) networkName = found.name;
    }

    if (!mounted) return null; 

    return (
        <div className="flex flex-col gap-2" style={{ position: 'relative' }}>
            <div className="flex items-center gap-2">
                {isConnected && address ? (
                    <>
                        <button
                            onClick={handleCopy}
                            title={address}
                            style={{ 
                                color: 'var(--text-primary)', 
                                background: 'rgba(6, 182, 212, 0.1)', 
                                border: '1px solid var(--accent-primary)', 
                                borderRadius: 'var(--radius-md)',
                                padding: '6px 12px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all var(--transition-normal)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(6, 182, 212, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(6, 182, 212, 0.1)';
                            }}
                        >
                            {networkName && (
                                <span className="text-xs ml-2" style={{ color: 'var(--secondary-text)' }}>
                                    {networkName}
                                </span>
                            )}
                            : {address.slice(0, 6)}...{address.slice(-6)}
                        </button>
                        {copyPopup && (
                            <div style={{
                                position: 'fixed',
                                top: '80px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'var(--success-color)',
                                color: 'white',
                                padding: '10px 24px',
                                borderRadius: '10px',
                                fontWeight: 600,
                                fontSize: '16px',
                                boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
                                zIndex: 2000,
                                opacity: 1,
                                transition: 'opacity 0.3s',
                            }}>
                                Copied!
                            </div>
                        )}
                        <button
                            onClick={() => disconnect()}
                            className="button"
                            style={{ 
                                marginLeft: 'var(--space-sm)',
                                fontSize: '12px',
                                padding: '8px 12px',
                                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(220, 38, 38, 0.9) 100%)',
                                color: 'white',
                                border: '1px solid #ef4444',
                                borderRadius: 'var(--radius-md)',
                                fontWeight: '600',
                                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                                transition: 'all var(--transition-normal)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.3)';
                            }}
                        >
                            Disconnect
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => setShowModal(true)}
                            className="button button-primary button-compact"
                        >
                            Connect Wallet
                        </button>
                        <Dialog open={showModal} onClose={() => setShowModal(false)} className="relative z-50">
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
                            <div className="fixed inset-0 flex items-center justify-center p-4">
                                <Dialog.Panel className="w-full max-w-sm glass-card glass-card-glow animate-scale-in" style={{
                                    background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(30, 41, 59, 0.8) 100%)',
                                    border: '1px solid var(--border-glass-strong)',
                                    borderRadius: 'var(--radius-lg)',
                                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(6, 182, 212, 0.1)',
                                    padding: 'var(--space-lg)',
                                    position: 'relative',
                                    backdropFilter: 'blur(10px)',
                                    WebkitBackdropFilter: 'blur(10px)'
                                }}>
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="absolute top-3 right-3 text-gray-400 hover:text-gray-300 text-2xl font-bold transition-colors duration-200"
                                        aria-label="Close"
                                        style={{ 
                                            lineHeight: 1, 
                                            color: 'var(--text-tertiary)', 
                                            background: 'none', 
                                            border: 'none',
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: 'var(--radius-sm)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                            e.currentTarget.style.color = 'var(--text-primary)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                            e.currentTarget.style.color = 'var(--text-tertiary)';
                                        }}
                                    >
                                        ×
                                    </button>
                                    <Dialog.Title className="font-bold mb-6 mt-2" style={{ 
                                        color: 'var(--text-primary)',
                                        fontSize: '20px',
                                        fontWeight: 700,
                                        textAlign: 'center'
                                    }}>
                                        Connect Wallet
                                    </Dialog.Title>
                                    <div className="space-y-3">
                                        {connectorOptions.map((option) => (
                                            <button
                                                key={option.name}
                                                onClick={() => handleConnect(option.connector, option.name)}
                                                className="w-full transition-all duration-200"
                                                style={{ 
                                                    background: connecting === option.name 
                                                        ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)'
                                                        : 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
                                                    color: 'var(--text-primary)', 
                                                    padding: 'var(--space-md) var(--space-lg)', 
                                                    borderRadius: 'var(--radius-md)', 
                                                    border: connecting === option.name 
                                                        ? '1px solid var(--accent-primary)'
                                                        : '1px solid var(--border-glass-strong)', 
                                                    textAlign: 'left', 
                                                    width: '100%', 
                                                    fontWeight: 600,
                                                    fontSize: '14px',
                                                    opacity: connecting && connecting !== option.name ? 0.5 : 1,
                                                    cursor: connecting ? 'not-allowed' : 'pointer',
                                                    boxShadow: connecting === option.name 
                                                        ? '0 4px 12px rgba(6, 182, 212, 0.2)'
                                                        : '0 2px 8px rgba(0, 0, 0, 0.2)',
                                                    transition: 'all var(--transition-normal)',
                                                    position: 'relative'
                                                }}
                                                disabled={!!connecting}
                                                onMouseEnter={(e) => {
                                                    if (!connecting) {
                                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.3)';
                                                        e.currentTarget.style.borderColor = 'var(--accent-primary)';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!connecting) {
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                        e.currentTarget.style.boxShadow = connecting === option.name 
                                                            ? '0 4px 12px rgba(6, 182, 212, 0.2)'
                                                            : '0 2px 8px rgba(0, 0, 0, 0.2)';
                                                        e.currentTarget.style.borderColor = connecting === option.name 
                                                            ? 'var(--accent-primary)'
                                                            : 'var(--border-glass-strong)';
                                                    }
                                                }}
                                            >
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--space-md)'
                                                }}>
                                                    <div style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        background: 'var(--accent-gradient)',
                                                        borderRadius: '50%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: 'white',
                                                        fontSize: '16px'
                                                    }}>
                                                        <i className="fab fa-ethereum" />
                                                    </div>
                                                    <span>
                                                        {connecting === option.name
                                                            ? `Connecting to ${option.name}...`
                                                            : option.name}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    {error && (
                                        <div style={{
                                            marginTop: 'var(--space-md)',
                                            padding: 'var(--space-md)',
                                            background: 'var(--danger-bg)',
                                            border: '1px solid var(--danger)',
                                            borderRadius: 'var(--radius-md)',
                                            color: 'var(--danger)',
                                            fontSize: '13px',
                                            fontWeight: 500
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--space-sm)'
                                            }}>
                                                <i className="fas fa-exclamation-triangle" />
                                                {error.message}
                                            </div>
                                        </div>
                                    )}
                                </Dialog.Panel>
                            </div>
                        </Dialog>
                    </>
                )}
            </div>
        </div>
    );
};

export default WalletConnect;