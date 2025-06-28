import React from 'react';

interface LoadingSpinnerProps {
    size?: 'small' | 'medium' | 'large';
    type?: 'spinner' | 'skeleton' | 'dots';
    text?: string;
    inline?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
    size = 'medium', 
    type = 'spinner',
    text,
    inline = false 
}) => {
    const getSizeValue = () => {
        switch (size) {
            case 'small': return '16px';
            case 'medium': return '24px';
            case 'large': return '32px';
            default: return '24px';
        }
    };

    const spinnerStyle: React.CSSProperties = {
        width: getSizeValue(),
        height: getSizeValue(),
        border: `2px solid rgba(59, 130, 246, 0.2)`,
        borderTop: `2px solid #3b82f6`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        display: inline ? 'inline-block' : 'block'
    };

    const skeletonStyle: React.CSSProperties = {
        width: '100%',
        height: '20px',
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        borderRadius: '4px',
        animation: 'shimmer 1.5s infinite',
        display: inline ? 'inline-block' : 'block'
    };

    const renderSpinner = () => <div style={spinnerStyle} />;

    const renderSkeleton = () => <div style={skeletonStyle} />;

    const renderDots = () => (
        <div style={{ 
            display: 'flex', 
            gap: '4px', 
            alignItems: 'center',
            justifyContent: inline ? 'flex-start' : 'center'
        }}>
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    style={{
                        width: '6px',
                        height: '6px',
                        backgroundColor: '#3b82f6',
                        borderRadius: '50%',
                        animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite both`
                    }}
                />
            ))}
        </div>
    );

    const renderLoader = () => {
        switch (type) {
            case 'skeleton': return renderSkeleton();
            case 'dots': return renderDots();
            default: return renderSpinner();
        }
    };

    return (
        <>
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                
                @keyframes bounce {
                    0%, 80%, 100% {
                        transform: scale(0);
                    }
                    40% {
                        transform: scale(1);
                    }
                }
            `}</style>
            <div style={{
                display: inline ? 'inline-flex' : 'flex',
                alignItems: 'center',
                justifyContent: inline ? 'flex-start' : 'center',
                gap: text ? '8px' : '0',
                color: 'var(--secondary-text)',
                fontSize: '14px'
            }}>
                {renderLoader()}
                {text && <span>{text}</span>}
            </div>
        </>
    );
};

// 数据值的加载状态组件
interface LoadingValueProps {
    isLoading: boolean;
    value: string | number;
    placeholder?: string;
    prefix?: string;
    suffix?: string;
}

export const LoadingValue: React.FC<LoadingValueProps> = ({ 
    isLoading, 
    value, 
    placeholder = "...",
    prefix = "",
    suffix = ""
}) => {
    if (isLoading) {
        return (
            <>
                <style>{`
                    @keyframes shimmer {
                        0% { background-position: -200% 0; }
                        100% { background-position: 200% 0; }
                    }
                `}</style>
                <div style={{
                    display: 'inline-block',
                    minWidth: '60px',
                    height: '1.2em',
                    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                    backgroundSize: '200% 100%',
                    borderRadius: '4px',
                    animation: 'shimmer 1.5s infinite'
                }} />
            </>
        );
    }
    
    return <span>{prefix}{value}{suffix}</span>;
};

// 卡片骨架加载组件
export const PoolCardSkeleton: React.FC = () => (
    <>
        <style>{`
            @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }
        `}</style>
        <div style={{
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            padding: '24px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        }}>
            {/* Header skeleton */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '20px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s infinite'
                    }} />
                    <div>
                        <div style={{
                            width: '80px',
                            height: '20px',
                            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                            backgroundSize: '200% 100%',
                            borderRadius: '4px',
                            marginBottom: '8px',
                            animation: 'shimmer 1.5s infinite'
                        }} />
                        <div style={{
                            width: '120px',
                            height: '12px',
                            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                            backgroundSize: '200% 100%',
                            borderRadius: '4px',
                            animation: 'shimmer 1.5s infinite'
                        }} />
                    </div>
                </div>
                <div style={{
                    width: '80px',
                    height: '30px',
                    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                    backgroundSize: '200% 100%',
                    borderRadius: '8px',
                    animation: 'shimmer 1.5s infinite'
                }} />
            </div>

            {/* Stats skeleton */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px',
                marginBottom: '20px'
            }}>
                {[1, 2, 3].map(i => (
                    <div key={i}>
                        <div style={{
                            width: '60px',
                            height: '12px',
                            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                            backgroundSize: '200% 100%',
                            borderRadius: '4px',
                            marginBottom: '8px',
                            animation: 'shimmer 1.5s infinite'
                        }} />
                        <div style={{
                            width: '80px',
                            height: '18px',
                            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                            backgroundSize: '200% 100%',
                            borderRadius: '4px',
                            animation: 'shimmer 1.5s infinite'
                        }} />
                    </div>
                ))}
            </div>

            {/* Buttons skeleton */}
            <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{
                    flex: 1,
                    height: '44px',
                    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                    backgroundSize: '200% 100%',
                    borderRadius: '8px',
                    animation: 'shimmer 1.5s infinite'
                }} />
                <div style={{
                    flex: 1,
                    height: '44px',
                    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
                    backgroundSize: '200% 100%',
                    borderRadius: '8px',
                    animation: 'shimmer 1.5s infinite'
                }} />
            </div>
        </div>
    </>
);

export default LoadingSpinner; 