/**
 * Script to directly query BSC testnet balances
 * Used to verify and compare whether the balances displayed in the app are correct
 * 
 * Usage:
 * 1. Run this script in browser console
 * 2. Or run with Node.js (requires ethers package installation)
 */

// User address (from link)
const userAddress = "0xe28D37E094AC43Fc264bAb5263b3694b985B39df";

// BSC Testnet RPC
const BSC_TESTNET_RPC = "https://data-seed-prebsc-1-s1.binance.org:8545";

// Testnet token contract addresses (from config)
const TOKEN_ADDRESSES = {
    LINK: "0xf11935eb67FE7C505e93Ed7751f8c59Fc3199121",
    USDT: "0x5016F623414b344a5C26ffDa4e61956c9a41Ca1e",
    // BNB is native token, no contract address needed
};

// ERC20 ABI (only need balanceOf and basic info)
const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)"
];

/**
 * Query native BNB balance
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
        
        console.log("🔸 BNB (Native Token) Real Balance:");
        console.log("  - Raw Value (Wei):", balanceWei.toString());
        console.log("  - Formatted Balance:", balanceBNB.toFixed(6), "BNB");
        
        return { raw: balanceWei.toString(), formatted: balanceBNB.toFixed(6) };
    } catch (error) {
        console.error("❌ Failed to get BNB balance:", error);
        return null;
    }
}

/**
 * Query ERC20 token balance
 */
async function getERC20Balance(tokenAddress, tokenSymbol) {
    try {
        // Get decimals
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
                    data: '0x313ce567' // decimals() function signature
                }, 'latest'],
                id: 1
            })
        });
        
        const decimalsData = await decimalsResponse.json();
        const decimals = parseInt(decimalsData.result, 16);
        
        // Get symbol
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
                    data: '0x95d89b41' // symbol() function signature
                }, 'latest'],
                id: 2
            })
        });
        
        const symbolData = await symbolResponse.json();
        
        // Get balance
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
                    data: '0x70a08231' + userAddress.slice(2).padStart(64, '0') // balanceOf(address) function signature + user address
                }, 'latest'],
                id: 3
            })
        });
        
        const balanceData = await balanceResponse.json();
        const balanceRaw = BigInt(balanceData.result || '0x0');
        const balanceFormatted = Number(balanceRaw) / Math.pow(10, decimals);
        
        console.log(`🔸 ${tokenSymbol} Token Real Balance:`);
        console.log("  - Contract Address:", tokenAddress);
        console.log("  - Precision (decimals):", decimals);
        console.log("  - Raw Value:", balanceRaw.toString());
        console.log("  - Formatted Balance:", balanceFormatted.toFixed(6), tokenSymbol);
        
        return { 
            raw: balanceRaw.toString(), 
            formatted: balanceFormatted.toFixed(6),
            decimals: decimals 
        };
    } catch (error) {
        console.error(`❌ Failed to get ${tokenSymbol} balance:`, error);
        return null;
    }
}

/**
 * Main function - check all balances
 */
async function checkAllBalances() {
    console.log("🔥 Starting to check BSC testnet real balances...");
    console.log("📍 User Address:", userAddress);
    console.log("🌐 Network: BSC Testnet (Chain ID: 97)");
    console.log("🔗 Block Explorer:", `https://testnet.bscscan.com/address/${userAddress}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    // Check BNB
    await getNativeBNBBalance();
    
    // Check LINK
    await getERC20Balance(TOKEN_ADDRESSES.LINK, 'LINK');
    
    // Check USDT
    await getERC20Balance(TOKEN_ADDRESSES.USDT, 'USDT');
    
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ Check completed!");
    console.log("💡 Please compare the real balances above with those displayed in the app");
    console.log("💡 If inconsistent, possible reasons:");
    console.log("   - Incorrect contract addresses in the app");
    console.log("   - Problems with decimals handling");
    console.log("   - Network connection issues");
    console.log("   - Cache issues");
}

// Execute check immediately
checkAllBalances().catch(console.error);

// Can also call functions individually
window.checkBSCBalance = checkAllBalances;
window.getNativeBNBBalance = getNativeBNBBalance;
window.getERC20Balance = getERC20Balance; 