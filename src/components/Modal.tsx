import React from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'small' | 'medium' | 'large';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'medium' }) => {
    if (!isOpen) return null;

    const getSizeClass = () => {
        switch (size) {
            case 'small':
                return { maxWidth: '400px' };
            case 'large':
                return { maxWidth: '700px' };
            default:
                return { maxWidth: '550px' };
        }
    };

    return (
        <div 
            className="modal-overlay"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px'
            }}
            onClick={onClose}
        >
            <div 
                className="modal-content"
                style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.95))',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                                         backdropFilter: 'blur(20px)',
                     width: '100%',
                     ...getSizeClass(),
                     maxHeight: '85vh',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div style={{
                    padding: '24px 24px 16px 24px',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h2 style={{
                        margin: 0,
                        fontSize: '24px',
                        fontWeight: 700,
                        color: 'var(--text-color)',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            color: 'var(--secondary-text)',
                            padding: '8px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
                            e.currentTarget.style.color = 'var(--text-color)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = 'var(--secondary-text)';
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Modal Body */}
                <div style={{
                    padding: '24px',
                    flex: 1,
                    overflowY: 'auto'
                }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal; 
 