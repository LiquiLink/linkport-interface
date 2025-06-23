import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ConnectWalletButton from './ConnectWalletButton';

const Navigation: React.FC = () => {
  const router = useRouter();

  const navigationItems = [
    { href: '/', label: 'Assets' },
    { href: '/pools', label: 'Pools' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/history', label: 'History' },
  ];

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      background: 'white',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      borderBottom: '1px solid #ececec',
      padding: '16px 0',
      transition: 'background 0.2s',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{
          fontSize: '24px',
          fontWeight: 700,
          color: 'var(--accent-color)',
          letterSpacing: '0.5px',
        }}>
          LINKPORT
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '32px',
        }}>
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: router.pathname === item.href ? 'var(--accent-color)' : '#222',
                textDecoration: 'none',
                fontWeight: 500,
                padding: '8px 16px',
                borderRadius: '12px',
                background: router.pathname === item.href ? 'rgba(65, 102, 245, 0.08)' : 'transparent',
                transition: 'all 0.2s ease',
                fontSize: '16px',
              }}
            >
              {item.label}
            </Link>
          ))}
          <ConnectWalletButton />
        </div>
      </div>
    </nav>
  );
};

export default Navigation;