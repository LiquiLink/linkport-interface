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
### Sepolia 测试网代币
1. **ETH (原生代币)**
   - [Sepolia 水龙头 1](https://sepoliafaucet.com/)
   - [Sepolia 水龙头 2](https://www.alchemy.com/faucets/ethereum-sepolia)
   - [Sepolia 水龙头 3](https://faucets.chain.link/sepolia)

2. **LINK 代币**
   - 地址: `0x391E62e754CaA820B606703D1920c34a35792dd6`
   - [Chainlink 水龙头](https://faucets.chain.link/sepolia)

3. **USDT 代币**
   - 地址: `0xa28C606a33AF8175F3bBf71d74796aDa360f4C49`
   - 可能需要从测试币交换或自定义合约获取

### BSC 测试网代币
1. **BNB (原生代币)**
   - [BSC 官方水龙头](https://testnet.binance.org/faucet-smart)
   - [其他 BSC 水龙头](https://testnet.bnbchain.org/faucet-smart)

2. **LINK 代币**
   - 地址: `0xf11935eb67FE7C505e93Ed7751f8c59Fc3199121`
   - [Chainlink 水龙头](https://faucets.chain.link/bsc-testnet)

3. **USDT 代币**
   - 地址: `0x5016F623414b344a5C26ffDa4e61956c9a41Ca1e`
   - 可能需要从测试币交换或自定义合约获取

## 🔧 常见问题解决

### 问题1: 余额显示为 0
**可能原因：**
- 钱包连接了错误的网络
- 代币合约地址不正确
- 实际没有测试网代币

**解决方案：**
1. 确认钱包连接了正确的测试网（Sepolia 或 BSC 测试网）
2. 查看调试器面板的网络信息
3. 从上述水龙头获取测试代币
4. 等待几分钟让交易确认

### 问题2: 网络连接错误
**解决方案：**
1. 在 MetaMask 中手动添加网络：
   - 点击网络下拉菜单
   - 选择"添加网络"
   - 输入上述 RPC 信息

### 问题3: 代币不显示在钱包中
**解决方案：**
1. 在 MetaMask 中手动添加代币：
   - 点击"导入代币"
   - 输入代币合约地址
   - 确认添加

## 📊 调试工具使用

1. **打开调试器**: 页面右上角的"🔍 余额调试器"
2. **检查网络**: 确认显示正确的测试网络
3. **查看余额**: 实时显示所有资产余额
4. **控制台日志**: 按 F12 打开开发者工具查看详细日志

## 💡 提示

- 测试网代币没有实际价值，仅用于测试
- 如果一个水龙头不工作，尝试其他水龙头
- 某些水龙头可能需要社交媒体验证
- 测试网络可能比主网慢，请耐心等待交易确认

## 🆘 需要帮助？

如果你仍然遇到余额问题：
1. 截图调试器面板的信息
2. 检查浏览器控制台的错误日志
3. 确认已获取足够的测试网代币 