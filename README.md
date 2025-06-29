# Liquilink - Multi-Chain Portfolio Lending Protocol

Liquilink is a revolutionary cross-chain DeFi protocol that enables **portfolio lending** and **cross-chain one-to-many borrowing**. Users can collateralize assets on one blockchain and borrow multiple asset portfolios across different blockchains simultaneously.

## 🚀 Core Innovation

### Portfolio Lending
- **One Collateral → Multiple Assets**: Stake ETH, borrow (USDT + BNB + LINK) portfolio
- **Risk Diversification**: Natural portfolio diversification through multi-asset borrowing
- **Capital Efficiency**: Maximize single collateral value across multiple assets

### Cross-Chain One-to-Many
- **One Chain → Multiple Chains**: Collateralize on Ethereum, borrow on BSC + Polygon + Arbitrum
- **Unified Liquidity**: Access liquidity across all supported chains from single collateral
- **Simplified Operations**: One transaction, multiple chain benefits

## 🛠️ Technical Architecture

### Core Protocol Flow

**Lending Process:**
1. Calculate borrowed token amounts using Chainlink Price Feeds on destination chain
2. Get collateral token price via Chainlink Price Feeds on source chain  
3. Calculate collateral value = `collateralAmount * collateralPrice / 10 ** decimals`
4. Send CCIP message to destination chain with loan request
5. Get borrow token prices via Chainlink Price Feeds for each token on destination chain
6. Calculate `totalBorrowedValue = sum(borrowAmounts[i] * borrowTokens[i].price)`
7. Check if totalBorrowedValue reaches 90% of collateralValue

### CCIP Message Types

**Message Format:**
```solidity
(uint256 msgType, address from, address user, address[] tokens, 
 uint256[] amounts, address collateralToken, uint256[] tokenCollateralAmount, 
 uint256 collateralValue)
```

**Message Types:**
- **Type 1 - Loan Request**: Lock collateral on source chain → Loan assets on destination chain
- **Type 2 - Repay Request**: Repay borrowed assets → Unlock collateral on source chain
- **Type 3 - Bridge Request**: Swap collateral via UniswapV2 → Bridge to destination chain
- **Type 4 - Loan Rejection**: Reject overleveraged loan → Unlock collateral
- **Type 5 - Liquidation**: Liquidate unhealthy positions → Transfer collateral to liquidator

### Liquidation Mechanism

**How Liquidation Works:**
1. Liquidation request sent via CCIP message (Type 5) to collateral chain
2. Check if LTV exceeds 95% threshold on collateral chain
3. Execute `unlockTo()` to transfer collateral to liquidator

**LTV Management:**
- **Risk Mitigation**: Reduce LTV by adding more collateral before liquidation
- **CCIP Latency Protection**: Collateral additions take effect before liquidation messages
- **Repayment Priority**: Loan repayment prevents liquidation execution

## 🌟 Use Cases

### Multi-Chain DeFi Strategy
```
Collateral: 100 ETH (Ethereum)
Borrow Portfolio:
├── Ethereum: 30,000 USDT + 500 LINK
├── BSC: 20,000 USDT + 15 BNB  
└── Polygon: 25,000 USDC + 1000 MATIC
```

### Cross-Chain Arbitrage
```
Collateral: 50 BNB (BSC)
Borrow Portfolio:
├── Ethereum: 20,000 USDT (DeFi yield farming)
├── Polygon: 15,000 USDC (Lending protocols)
└── Arbitrum: 10,000 DAI (DEX trading)
```

## 🔗 Chainlink Integration

LinkPort leverages two main Chainlink services:

### 🌉 Chainlink CCIP (Cross-Chain Interoperability Protocol)
- **Cross-chain messaging** between Ethereum Sepolia and BSC Testnet
- **Secure asset bridging** and lending operations across chains
- **Implementation**: [`../linkport-core/contracts/LinkPort.sol`](../linkport-core/contracts/LinkPort.sol)

### 📊 Chainlink Price Feeds
- **Real-time asset pricing** for ETH, BNB, LINK, USDT
- **Risk management** with accurate LTV calculations
- **Implementation**: [`src/utils/priceService.ts`](./src/utils/priceService.ts)

**Supported Networks:**
- Ethereum Sepolia Testnet (Chain ID: 11155111)
- BSC Testnet (Chain ID: 97)

## 🛡️ Risk Parameters

- **Maximum LTV**: 75%
- **Liquidation Threshold**: 80%
- **Health Factor Monitoring**: Real-time cross-chain risk assessment
- **Safety Buffer**: 90% collateral utilization limit for new loans

## 🚀 Quick Start

### For Users
1. Visit [Liquilink App](http://localhost:3000)
2. Connect MetaMask wallet
3. Get testnet tokens (see [Testnet Guide](./TESTNET_GUIDE.md))
4. Start multi-chain portfolio lending!

### For Developers
```bash
# Clone repositories
git clone git@github.com:LiquiLink/linkport-interface.git
git clone git@github.com:LiquiLink/linkport-core.git

# Install dependencies
cd linkport-interface && npm install

# Start development
npm run dev
```

## 📊 Project Structure

```
linkport-interface/
├── src/
│   ├── components/     # React UI components
│   ├── pages/         # Next.js pages (lending, pools, portfolio)
│   ├── utils/         # Chainlink Price Feeds integration
│   └── config.ts      # Network & asset configuration
└── linkport-core/
    └── contracts/
        ├── LinkPort.sol      # Main CCIP + Price Feed contract
        └── LiquidityPool.sol # Pool management
```

## 🔧 Technologies

- **Frontend**: Next.js, TypeScript, Tailwind CSS, Wagmi
- **Smart Contracts**: Solidity, Hardhat, OpenZeppelin
- **Chainlink**: CCIP, Price Feeds, Enterprise Security
- **Web3**: Ethers.js, MetaMask, WalletConnect

---

**Liquilink - One Collateral, Multi-Chain Portfolios** 
