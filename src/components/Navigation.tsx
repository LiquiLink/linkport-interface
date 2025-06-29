import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ConnectWalletButton from './ConnectWalletButton';

const Navigation: React.FC = () => {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);

  const navigationItems = [
    { 
      href: '/', 
      label: 'DeFi Hub'
    },
    { 
      href: '/pools', 
      label: 'Liquidity Pools'
    },
    { 
      href: '/portfolio', 
      label: 'Portfolio'
    },
    { 
      href: '/history', 
      label: 'History'
    },
  ];

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navigation ${isScrolled ? 'scrolled' : ''}`}>
      <div className="navigation-container">
        {/* Logo Section */}
        <Link href="/" className="logo-section">
          <div className="logo-wrapper">
                                        <div className="logo-image">
                              <img 
                                src="/liquilink-logo.svg" 
                                alt="Liquilink Logo"
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const fallback = target.parentElement?.querySelector('.logo-fallback') as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                              <div className="logo-fallback" style={{ display: 'none' }}>
                                <span style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>LL</span>
                              </div>
                            </div>
            <div className="logo-text">
              <span className="logo-name">LIQUILINK</span>
              <div className="logo-tagline">Cross-Chain DeFi</div>
            </div>
          </div>
        </Link>
        
        {/* Navigation Items */}
        <div className="navigation-items">
          {navigationItems.map((item) => {
            const isActive = router.pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`navigation-item ${isActive ? 'active' : ''}`}
              >
                <span>{item.label}</span>
                {isActive && <div className="active-indicator" />}
              </Link>
            );
          })}
          
          {/* Connect Wallet Button */}
          <div className="wallet-section">
            <ConnectWalletButton />
          </div>
        </div>
      </div>

      {/* Optimized Styles */}
      <style jsx>{`
        .navigation {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          background: var(--bg-glass-strong);
          border-bottom: 1px solid var(--border-glass);
          padding: 12px 0; /* 增加padding来改善对齐 */
          transition: all var(--transition-normal);
          box-shadow: var(--shadow-medium);
        }

        .navigation.scrolled {
          background: var(--bg-glass-strong);
          border-bottom-color: var(--border-glass-strong);
          box-shadow: var(--shadow-large);
        }

        .navigation-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 var(--space-lg);
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 100%; /* 确保垂直对齐 */
        }

        .logo-section {
          text-decoration: none;
          cursor: pointer;
          transition: all var(--transition-normal);
          display: flex; /* 确保flex布局 */
          align-items: center;
        }

        .logo-section:hover {
          transform: scale(1.02);
        }

        .logo-wrapper {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }

        .logo-image {
          position: relative;
          width: 36px; /* 稍微增大logo */
          height: 36px;
          background: var(--accent-gradient);
          border-radius: 50%;
          padding: 6px;
          box-shadow: var(--shadow-glow);
          transition: all var(--transition-normal);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-image:hover {
          box-shadow: 0 0 20px rgba(6, 182, 212, 0.4);
          transform: rotate(180deg);
        }

        .logo-image img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 50%;
        }

        .logo-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 800;
          color: white;
          letter-spacing: 1px;
        }

        .logo-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .logo-name {
          font-size: 18px; /* Reduced from 20px */
          font-weight: 800;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: 0.5px;
          line-height: 1;
        }

        .logo-tagline {
          font-size: 9px; /* Reduced from 10px */
          font-weight: 500;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 1px;
          line-height: 1;
        }

        .navigation-items {
          display: flex;
          align-items: center;
          gap: var(--space-2xl); /* Much larger gap for better spacing */
        }

        .navigation-item {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          color: var(--text-secondary);
          text-decoration: none;
          font-weight: 500;
          padding: 10px var(--space-md); /* More generous padding */
          border-radius: var(--radius-md);
          background: transparent;
          border: 1px solid transparent;
          transition: all var(--transition-normal);
          font-size: 14px;
          position: relative;
          white-space: nowrap;
          min-width: fit-content; /* Ensure proper width */
        }

        .navigation-item:hover {
          color: var(--text-primary);
          background: var(--bg-surface);
          border-color: var(--border-glass);
          transform: translateY(-1px);
        }

        .navigation-item.active {
          color: var(--text-primary);
          background: rgba(6, 182, 212, 0.15);
          border-color: var(--accent-primary);
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.2);
        }

        .navigation-item.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 2px;
          background: var(--accent-gradient);
          border-radius: 1px;
          animation: activeSlideIn 0.2s ease; /* Faster animation */
        }

        @keyframes activeSlideIn {
          from {
            width: 0;
            opacity: 0;
          }
          to {
            width: 20px;
            opacity: 1;
          }
        }

        .navigation-item i {
          font-size: 12px;
          width: 16px;
          text-align: center;
          color: inherit; /* Inherit color from parent */
        }

        .wallet-section {
          margin-left: var(--space-xl); /* Increased space before wallet */
          display: flex;
          align-items: center;
        }

        /* Mobile Responsive - Better spacing */
        @media (max-width: 1024px) {
          .navigation-container {
            padding: 0 var(--space-md);
          }

          .navigation-items {
            gap: var(--space-md); /* Maintain spacing on medium screens */
          }

          .navigation-item {
            padding: 8px var(--space-sm);
            font-size: 13px;
          }

          .logo-text {
            display: none;
          }

          .wallet-section {
            margin-left: var(--space-lg);
          }
        }

        @media (max-width: 768px) {
          .navigation {
            padding: 10px 0; /* Reduced for mobile */
          }

          .navigation-container {
            padding: 0 var(--space-sm);
          }

          .navigation-items {
            gap: var(--space-sm); /* Tighter on mobile */
          }

          .navigation-item span {
            display: none; /* Hide labels on mobile */
          }

          .navigation-item {
            padding: 8px;
            min-width: 40px;
            justify-content: center;
          }

          .navigation-item i {
            font-size: 14px;
          }

          .wallet-section {
            margin-left: var(--space-md);
          }
        }

        @media (max-width: 480px) {
          .logo-wrapper {
            gap: var(--space-sm);
          }

          .logo-image {
            width: 32px;
            height: 32px;
            padding: 6px;
          }

          .navigation-items {
            gap: 6px; /* Very tight on small mobile */
          }

          .navigation-item {
            padding: 6px;
            min-width: 36px;
          }

          .navigation-item i {
            font-size: 12px;
          }

          .wallet-section {
            margin-left: var(--space-sm);
          }
        }

        /* Remove complex animations for performance */
        .navigation-item:active {
          transform: translateY(0);
          transition: transform 0.1s ease;
        }

        /* Simplified logo animation */
        .logo-image {
          position: relative;
        }

        .logo-image:hover {
          animation: logoSpin 0.5s ease;
        }

        @keyframes logoSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(180deg);
          }
        }
      `}</style>
    </nav>
  );
};

export default Navigation;