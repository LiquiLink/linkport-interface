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
    console.log(chains)
    const [showModal, setShowModal] = useState(false);
    const [connecting, setConnecting] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

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
            setTimeout(() => setCopied(false), 1200);
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
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                {isConnected && address ? (
                    <>
                        <button
                            className="text-white hover:underline"
                            onClick={handleCopy}
                            title={address}
                        >

                        {networkName && (
                            <span className="text-xs text-white ml-2">
                                {networkName}
                            </span>
                        )}
                            : {address.slice(0, 6)}...{address.slice(-6)}
                        </button>
                        {copied && (
                            <span className="text-xs text-blue-500 ml-2">Copied!</span>
                        )}
                        <button
                            onClick={() => disconnect()}
                            className="bg-red-500 text-white px-2 py-1 rounded text-xs"
                        >
                            Disconnect
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-blue-500 text-white px-4 py-2 rounded"
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
                                        style={{ lineHeight: 1 }}
                                    >
                                        ×
                                    </button>
                                    <Dialog.Title className="font-bold mb-2 mt-2">Select Wallet</Dialog.Title>
                                    {connectorOptions.map((option) => (
                                        <button
                                            key={option.name}
                                            onClick={() => handleConnect(option.connector, option.name)}
                                            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded text-left w-full mb-2"
                                            disabled={!!connecting}
                                        >
                                            {connecting === option.name
                                                ? `Connecting to ${option.name}...`
                                                : option.name}
                                        </button>
                                    ))}
                                    {error && (
                                        <span className="text-red-500 text-xs mt-2">{error.message}</span>
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