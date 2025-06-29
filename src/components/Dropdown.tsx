import React, { useState, useRef, useEffect } from 'react';
import { getTokenIconStyle } from '../utils/ui';

interface DropdownOption {
    value: string;
    label: string;
    icon?: string;
    description?: string;
}

interface DropdownProps {
    options: DropdownOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({
    options,
    value,
    onChange,
    placeholder = "Please select",
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(option => option.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleOptionClick = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
            <div
                className="select-container"
                style={{
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.6 : 1,
                    background: isOpen ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)' : 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)',
                    border: `1px solid ${isOpen ? 'var(--accent-primary)' : 'rgba(59,130,246,0.32)'}`,
                    color: 'var(--text-primary)',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: isOpen ? '0 0 0 2px rgba(6, 182, 212, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                    transition: 'all var(--transition-normal)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedOption?.icon && (
                        <div style={getTokenIconStyle(selectedOption.icon)}>{selectedOption.icon}</div>
                    )}
                    <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </div>
                </div>
                <div style={{ 
                    color: 'var(--text-secondary)',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                }}>
                    <i className="fas fa-chevron-down"></i>
                </div>
            </div>

            {isOpen && !disabled && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--border-glass-strong)',
                    zIndex: 1000,
                    maxHeight: '300px',
                    overflowY: 'auto'
                }}>
                    {options.map((option) => (
                        <div
                            key={option.value}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 16px',
                                cursor: 'pointer',
                                backgroundColor: option.value === value ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                                borderBottom: '1px solid var(--border-glass)',
                                transition: 'background-color 0.2s ease',
                                color: 'var(--text-primary)'
                            }}
                            onClick={() => handleOptionClick(option.value)}
                            onMouseEnter={(e) => {
                                if (option.value !== value) {
                                    (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (option.value !== value) {
                                    (e.target as HTMLElement).style.backgroundColor = 'transparent';
                                }
                            }}
                        >
                            {option.icon && (
                                <div style={getTokenIconStyle(option.icon)}>{option.icon}</div>
                            )}
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>
                                    {option.label}
                                </div>
                                {option.description && (
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        {option.description}
                                    </div>
                                )}
                            </div>
                            {option.value === value && (
                                <div style={{ color: 'var(--accent-primary)' }}>
                                    <i className="fas fa-check"></i>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dropdown; 