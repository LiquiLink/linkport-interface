import React, { useState, useEffect } from 'react';

interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    isVisible: boolean;
    onClose: () => void;
    autoClose?: boolean;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({ 
    message, 
    type = 'info', 
    isVisible, 
    onClose, 
    autoClose = true, 
    duration = 3000 
}) => {
    useEffect(() => {
        if (isVisible && autoClose) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [isVisible, autoClose, duration, onClose]);

    if (!isVisible) return null;

    const getToastStyles = () => {
        const baseStyles = {
            position: 'fixed' as const,
            top: '20px',
            right: '20px',
            maxWidth: '400px',
            padding: '16px 20px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'slideInRight 0.3s ease-out',
            fontSize: '14px',
            lineHeight: '1.5'
        };

        const typeStyles = {
            success: {
                borderLeft: '4px solid #22c55e',
                color: '#065f46'
            },
            error: {
                borderLeft: '4px solid #ef4444',  
                color: '#991b1b'
            },
            warning: {
                borderLeft: '4px solid #f59e0b',
                color: '#92400e'
            },
            info: {
                borderLeft: '4px solid #3b82f6',
                color: '#1e40af'
            }
        };

        return { ...baseStyles, ...typeStyles[type] };
    };

    const getIcon = () => {
        const icons = {
            success: '✅',
            error: '❌', 
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type];
    };

    return (
        <>
            <style jsx>{`
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                .toast-close-btn {
                    background: none;
                    border: none;
                    color: inherit;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    opacity: 0.7;
                    transition: opacity 0.2s ease;
                    font-size: 16px;
                    line-height: 1;
                    margin-left: auto;
                    flex-shrink: 0;
                }
                
                .toast-close-btn:hover {
                    opacity: 1;
                    background: rgba(0, 0, 0, 0.1);
                }
            `}</style>
            
            <div style={getToastStyles()}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>
                    {getIcon()}
                </span>
                <div style={{ flex: 1, whiteSpace: 'pre-line' }}>
                    {message}
                </div>
                <button 
                    className="toast-close-btn"
                    onClick={onClose}
                    title="Close"
                >
                    ×
                </button>
            </div>
        </>
    );
};

// Toast Hook for easy usage
export const useToast = () => {
    const [toasts, setToasts] = useState<Array<{
        id: string;
        message: string;
        type: 'success' | 'error' | 'info' | 'warning';
        autoClose?: boolean;
        duration?: number;
    }>>([]);

    const showToast = (
        message: string, 
        type: 'success' | 'error' | 'info' | 'warning' = 'info',
        options?: { autoClose?: boolean; duration?: number }
    ) => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { 
            id, 
            message, 
            type, 
            autoClose: options?.autoClose ?? true,
            duration: options?.duration ?? 3000
        }]);
    };

    const hideToast = (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    const ToastContainer = () => (
        <div>
            {toasts.map((toast, index) => (
                <div key={toast.id} style={{ top: `${20 + index * 80}px` }}>
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        isVisible={true}
                        onClose={() => hideToast(toast.id)}
                        autoClose={toast.autoClose}
                        duration={toast.duration}
                    />
                </div>
            ))}
        </div>
    );

    return { showToast, ToastContainer };
};

export default Toast; 