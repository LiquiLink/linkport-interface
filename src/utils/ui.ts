import React from 'react';

export const getTokenIconStyle = (symbol: string) => {
    const baseStyle: React.CSSProperties = {
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '13px',
      fontWeight: 'bold',
      color: 'white',
      textTransform: 'uppercase',
      background: '#7F8C8D' // Default background
    };
  
    const themes: { [key: string]: { background: string } } = {
      'USDC': { background: '#2775CA' },
      'USDT': { background: '#50AF95' },
      'DAI': { background: '#F5AC37' },
      'WETH': { background: 'linear-gradient(135deg, #4D4D4D, #7F8C8D)' },
      'WBTC': { background: 'linear-gradient(135deg, #F7931A, #FDB95D)' },
      'LINK': { background: 'linear-gradient(135deg, #2A5ADA, #3B82F6)' },
      'AAVE': { background: 'linear-gradient(135deg, #B6509E, #E069D4)' },
      'UNI': { background: 'linear-gradient(135deg, #FF007A, #FF7A9F)' },
      'ETH': { background: 'linear-gradient(135deg, #627EEA, #8A9FFF)' },
      'BNB': { background: 'linear-gradient(135deg, #F3BA2F, #F8D06B)' },
    };
  
    const theme = themes[(symbol || '').toUpperCase()];
    return theme ? { ...baseStyle, ...theme } : baseStyle;
  }; 