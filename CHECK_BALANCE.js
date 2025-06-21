/**
 * 直接查询BSC测试网余额的脚本
 * 用于验证和对比应用中显示的余额是否正确
 * 
 * 使用方法：
 * 1. 在浏览器控制台运行此脚本
 * 2. 或者使用 Node.js 运行（需要安装 ethers 包）
 */

// 用户地址 (来自链接)
const userAddress = "0xe28D37E094AC43Fc264bAb5263b3694b985B39df";

// BSC 测试网 RPC
const BSC_TESTNET_RPC = "https://data-seed-prebsc-1-s1.binance.org:8545";

// 测试网代币合约地址 (来自配置)
const TOKEN_ADDRESSES = {
    LINK: "0xf11935eb67FE7C505e93Ed7751f8c59Fc3199121",
    USDT: "0x5016F623414b344a5C26ffDa4e61956c9a41Ca1e",
    // BNB 是原生代币，不需要合约地址
};

// ERC20 ABI (只需要 balanceOf 和基本信息)
const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)"
];

/**
 * 查询原生 BNB 余额
 */
async function getNativeBNBBalance() {
    try {
        const response = await fetch(BSC_TESTNET_RPC, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getBalance',
                params: [userAddress, 'latest'],
                id: 1
            })
        });
        
        const data = await response.json();
        const balanceWei = BigInt(data.result);
        const balanceBNB = Number(balanceWei) / 1e18;
        
        console.log("🔸 BNB (原生代币) 真实余额:");
        console.log("  - 原始值 (Wei):", balanceWei.toString());
        console.log("  - 格式化余额:", balanceBNB.toFixed(6), "BNB");
        
        return { raw: balanceWei.toString(), formatted: balanceBNB.toFixed(6) };
    } catch (error) {
        console.error("❌ 获取 BNB 余额失败:", error);
        return null;
    }
}

/**
 * 查询 ERC20 代币余额
 */
async function getERC20Balance(tokenAddress, tokenSymbol) {
    try {
        // 获取 decimals
        const decimalsResponse = await fetch(BSC_TESTNET_RPC, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_call',
                params: [{
                    to: tokenAddress,
                    data: '0x313ce567' // decimals() 函数签名
                }, 'latest'],
                id: 1
            })
        });
        
        const decimalsData = await decimalsResponse.json();
        const decimals = parseInt(decimalsData.result, 16);
        
        // 获取 symbol
        const symbolResponse = await fetch(BSC_TESTNET_RPC, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_call',
                params: [{
                    to: tokenAddress,
                    data: '0x95d89b41' // symbol() 函数签名
                }, 'latest'],
                id: 2
            })
        });
        
        const symbolData = await symbolResponse.json();
        
        // 获取余额
        const balanceResponse = await fetch(BSC_TESTNET_RPC, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_call',
                params: [{
                    to: tokenAddress,
                    data: '0x70a08231' + userAddress.slice(2).padStart(64, '0') // balanceOf(address) 函数签名 + 用户地址
                }, 'latest'],
                id: 3
            })
        });
        
        const balanceData = await balanceResponse.json();
        const balanceRaw = BigInt(balanceData.result || '0x0');
        const balanceFormatted = Number(balanceRaw) / Math.pow(10, decimals);
        
        console.log(`🔸 ${tokenSymbol} 代币真实余额:`);
        console.log("  - 合约地址:", tokenAddress);
        console.log("  - 精度 (decimals):", decimals);
        console.log("  - 原始值:", balanceRaw.toString());
        console.log("  - 格式化余额:", balanceFormatted.toFixed(6), tokenSymbol);
        
        return { 
            raw: balanceRaw.toString(), 
            formatted: balanceFormatted.toFixed(6),
            decimals: decimals 
        };
    } catch (error) {
        console.error(`❌ 获取 ${tokenSymbol} 余额失败:`, error);
        return null;
    }
}

/**
 * 主函数 - 检查所有余额
 */
async function checkAllBalances() {
    console.log("🔥 开始检查 BSC 测试网真实余额...");
    console.log("📍 用户地址:", userAddress);
    console.log("🌐 网络: BSC Testnet (Chain ID: 97)");
    console.log("🔗 区块浏览器:", `https://testnet.bscscan.com/address/${userAddress}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    // 检查 BNB
    await getNativeBNBBalance();
    
    // 检查 LINK
    await getERC20Balance(TOKEN_ADDRESSES.LINK, 'LINK');
    
    // 检查 USDT
    await getERC20Balance(TOKEN_ADDRESSES.USDT, 'USDT');
    
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ 检查完成！");
    console.log("💡 请对比上面的真实余额和应用中显示的余额");
    console.log("💡 如果不一致，可能的原因：");
    console.log("   - 应用中的合约地址不正确");
    console.log("   - decimals 处理有问题");
    console.log("   - 网络连接问题");
    console.log("   - 缓存问题");
}

// 立即执行检查
checkAllBalances().catch(console.error);

// 也可以单独调用函数
window.checkBSCBalance = checkAllBalances;
window.getNativeBNBBalance = getNativeBNBBalance;
window.getERC20Balance = getERC20Balance; 