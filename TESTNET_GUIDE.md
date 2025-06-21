# 测试网代币获取指南

LinkPort 使用以下测试网络：

## 🔗 支持的测试网络

### 1. Sepolia 测试网 (Chain ID: 11155111)
- **网络名称**: Sepolia Test Network
- **RPC URL**: https://rpc.sepolia.org
- **区块浏览器**: https://sepolia.etherscan.io

### 2. BSC 测试网 (Chain ID: 97)
- **网络名称**: BSC Testnet
- **RPC URL**: https://data-seed-prebsc-1-s1.binance.org:8545
- **区块浏览器**: https://testnet.bscscan.com

## 💰 获取测试网代币

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