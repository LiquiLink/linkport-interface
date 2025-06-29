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
      label: 'DeFi Hub',
      icon: 'fas fa-home'
    },
    { 
      href: '/pools', 
      label: 'Liquidity Pools',
      icon: 'fas fa-water'
    },
    { 
      href: '/portfolio', 
      label: 'Portfolio',
      icon: 'fas fa-chart-pie'
    },
    { 
      href: '/history', 
      label: 'History',
      icon: 'fas fa-history'
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
                src="/logo.png" 
                alt="Liquilink Logo" 
              />
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
                <i className={item.icon} />
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

      {/* Styles */}
      <style jsx>{`
        .navigation {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border-glass);
          padding: 16px 0;
          transition: all var(--transition-normal);
          box-shadow: var(--shadow-glass);
        }

        .navigation.scrolled {
          background: var(--bg-glass-strong);
          border-bottom-color: var(--border-glass-strong);
          box-shadow: var(--shadow-glass-hover);
        }

        .navigation-container {
          max-width: 1600px;
          margin: 0 auto;
          padding: 0 var(--space-lg);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo-section {
          text-decoration: none;
          cursor: pointer;
          transition: all var(--transition-normal);
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
          width: 40px;
          height: 40px;
          background: var(--accent-gradient);
          border-radius: 50%;
          padding: 8px;
          box-shadow: 0 0 20px rgba(6, 182, 212, 0.3);
          transition: all var(--transition-normal);
        }

        .logo-image:hover {
          box-shadow: 0 0 30px rgba(6, 182, 212, 0.5);
          transform: rotate(360deg);
        }

        .logo-image img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: brightness(0) invert(1);
        }

        .logo-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .logo-name {
          font-size: 20px;
          font-weight: 800;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: 0.5px;
          line-height: 1;
        }

        .logo-tagline {
          font-size: 10px;
          font-weight: 500;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 1px;
          line-height: 1;
        }

        .navigation-items {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }

        .navigation-item {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          color: var(--text-secondary);
          text-decoration: none;
          font-weight: 500;
          padding: 12px 16px;
          border-radius: var(--radius-md);
          background: transparent;
          border: 1px solid transparent;
          transition: all var(--transition-normal);
          font-size: 14px;
          position: relative;
          overflow: hidden;
          white-space: nowrap;
        }

        .navigation-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent);
          transition: left 0.6s ease;
        }

        .navigation-item:hover::before {
          left: 100%;
        }

        .navigation-item:hover {
          color: var(--text-primary);
          background: var(--bg-glass);
          border-color: var(--border-glass);
          transform: translateY(-1px);
        }

        .navigation-item.active {
          color: var(--text-primary);
          background: rgba(6, 182, 212, 0.1);
          border-color: var(--accent-primary);
          box-shadow: 0 0 15px rgba(6, 182, 212, 0.2);
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
          animation: activeSlideIn 0.3s ease;
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
        }

        .wallet-section {
          margin-left: var(--space-lg);
          display: flex;
          align-items: center;
        }

        /* Mobile Responsive */
        @media (max-width: 1024px) {
          .navigation-container {
            padding: 0 var(--space-md);
          }

          .navigation-items {
            gap: var(--space-xs);
          }

          .navigation-item {
            padding: 10px 12px;
            font-size: 13px;
          }

          .logo-text {
            display: none;
          }

          .wallet-section {
            margin-left: var(--space-md);
          }
        }

        @media (max-width: 768px) {
          .navigation {
            padding: 12px 0;
          }

          .navigation-container {
            padding: 0 var(--space-sm);
          }

          .navigation-items {
            gap: var(--space-xs);
          }

          .navigation-item span {
            display: none;
          }

          .navigation-item {
            padding: 10px;
            min-width: 40px;
            justify-content: center;
          }

          .navigation-item i {
            font-size: 14px;
          }

          .wallet-section {
            margin-left: var(--space-sm);
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
            gap: 4px;
          }

          .navigation-item {
            padding: 8px;
            min-width: 36px;
          }

          .navigation-item i {
            font-size: 12px;
          }
        }

        /* Enhanced animations */
        .navigation-item {
          position: relative;
        }

        .navigation-item:active {
          transform: translateY(0);
          transition: transform 0.1s ease;
        }

        .logo-image::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: conic-gradient(from 0deg, var(--accent-primary), var(--accent-secondary), var(--accent-primary));
          border-radius: 50%;
          z-index: -1;
          opacity: 0;
          transition: opacity var(--transition-normal);
        }

        .logo-image:hover::before {
          opacity: 1;
          animation: rotate 3s linear infinite;
        }

        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </nav>
  );
};

export default Navigation;