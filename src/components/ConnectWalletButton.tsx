import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { useAccount, useDisconnect, useConnect, useChainId, useChains } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';

const connectorOptions = [
    { name: 'MetaMask', connector: injected()},
    { name: 'WalletConnect', connector: walletConnect({ projectId: process.env.WalletConnectId || ""}) },
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
                            className=""
                            onClick={handleCopy}
                            title={address}
                            style={{ color: 'var(--accent-color)', background: 'none', border: 'none', fontWeight: 600 }}
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
                            style={{ background: 'var(--error-color)', color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', border: 'none' }}
                        >
                            Disconnect
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => setShowModal(true)}
                            style={{ background: 'var(--accent-color)', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', fontWeight: 500 }}
                        >
                            Connect Wallet
                        </button>
                        <Dialog open={showModal} onClose={() => setShowModal(false)} className="relative z-50">
                            <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
                            <div className="fixed inset-0 flex items-center justify-center p-4">
                                <Dialog.Panel className="w-full max-w-xs bg-white rounded shadow-lg p-6 relative">
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                                        aria-label="Close"
                                        style={{ lineHeight: 1, color: 'var(--secondary-text)', background: 'none', border: 'none' }}
                                    >
                                        ×
                                    </button>
                                    <Dialog.Title className="font-bold mb-2 mt-2" style={{ color: 'var(--text-color)' }}>Select Wallet</Dialog.Title>
                                    {connectorOptions.map((option) => (
                                        <button
                                            key={option.name}
                                            onClick={() => handleConnect(option.connector, option.name)}
                                            style={{ background: 'var(--input-background)', color: 'var(--text-color)', padding: '8px 16px', borderRadius: '8px', border: 'none', textAlign: 'left', width: '100%', marginBottom: '8px', fontWeight: 500, opacity: connecting ? 0.7 : 1 }}
                                            disabled={!!connecting}
                                        >
                                            {connecting === option.name
                                                ? `Connecting to ${option.name}...`
                                                : option.name}
                                        </button>
                                    ))}
                                    {error && (
                                        <span className="text-xs mt-2" style={{ color: 'var(--error-color)' }}>{error.message}</span>
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