# Testnet Token Acquisition Guide

LinkPort uses the following test networks:

## 🔗 Supported Test Networks

### 1. Sepolia Testnet (Chain ID: 11155111)
- **Network Name**: Sepolia Test Network
- **RPC URL**: https://rpc.sepolia.org
- **Block Explorer**: https://sepolia.etherscan.io

### 2. BSC Testnet (Chain ID: 97)
- **Network Name**: BSC Testnet
- **RPC URL**: https://data-seed-prebsc-1-s1.binance.org:8545
- **Block Explorer**: https://testnet.bscscan.com

## 💰 Get Testnet Tokens

### Sepolia Testnet Tokens
1. **ETH (Native Token)**
   - [Sepolia Faucet 1](https://sepoliafaucet.com/)
   - [Sepolia Faucet 2](https://www.alchemy.com/faucets/ethereum-sepolia)
   - [Sepolia Faucet 3](https://faucets.chain.link/sepolia)

2. **LINK Token**
   - Address: `0x391E62e754CaA820B606703D1920c34a35792dd6`
   - [Chainlink Faucet](https://faucets.chain.link/sepolia)

3. **USDT Token**
   - Address: `0xa28C606a33AF8175F3bBf71d74796aDa360f4C49`
   - May need to be obtained from test token exchange or custom contract

### BSC Testnet Tokens
1. **BNB (Native Token)**
   - [BSC Official Faucet](https://testnet.binance.org/faucet-smart)
   - [Other BSC Faucet](https://testnet.bnbchain.org/faucet-smart)

2. **LINK Token**
   - Address: `0xf11935eb67FE7C505e93Ed7751f8c59Fc3199121`
   - [Chainlink Faucet](https://faucets.chain.link/bsc-testnet)

3. **USDT Token**
   - Address: `0x5016F623414b344a5C26ffDa4e61956c9a41Ca1e`
   - May need to be obtained from test token exchange or custom contract

## 🔧 Common Problem Solutions

### Issue 1: Balance Shows 0
**Possible Causes:**
- Wallet connected to wrong network
- Incorrect token contract address
- Actually no testnet tokens

**Solutions:**
1. Confirm wallet is connected to correct testnet (Sepolia or BSC Testnet)
2. Check network information in debugger panel
3. Get test tokens from above faucets
4. Wait a few minutes for transaction confirmation

### Issue 2: Network Connection Error
**Solutions:**
1. Manually add network in MetaMask:
   - Click network dropdown menu
   - Select "Add Network"
   - Enter above RPC information

### Issue 3: Tokens Don't Show in Wallet
**Solutions:**
1. Manually add tokens in MetaMask:
   - Click "Import Token"
   - Enter token contract address
   - Confirm addition

## 📊 Debug Tool Usage

1. **Open Debugger**: "🔍 Balance Debugger" in the top right corner of the page
2. **Check Network**: Confirm correct testnet is displayed
3. **View Balances**: Real-time display of all asset balances
4. **Console Logs**: Press F12 to open developer tools and view detailed logs

## 💡 Tips

- Testnet tokens have no real value, only for testing
- If one faucet doesn't work, try other faucets
- Some faucets may require social media verification
- Test networks may be slower than mainnet, please wait patiently for transaction confirmation

## 🆘 Need Help?

If you still encounter balance issues:
1. Screenshot the debugger panel information
2. Check browser console for error logs
3. Confirm you have obtained sufficient testnet tokens 