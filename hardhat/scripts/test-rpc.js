const quais = require('quais');
require('dotenv').config({ path: "../.env" });

async function main() {
  try {
    console.log('Debug: Starting RPC test...');
    console.log('Debug: RPC URL =', process.env.RPC_URL);
    console.log('Debug: Chain ID =', process.env.CHAIN_ID);
    
    // Create provider with options
    console.log('Debug: Creating provider...');
    const provider = new quais.JsonRpcProvider(process.env.RPC_URL, {
      chainId: Number(process.env.CHAIN_ID),
      name: 'cyprus1'
    });
    console.log('Debug: Provider created');
    
    // Test basic RPC methods
    console.log('\nTesting RPC methods:');
    
    console.log('1. Testing eth_blockNumber...');
    const blockNumber = await provider.send('eth_blockNumber', []);
    console.log('Latest block:', Number(blockNumber));
    
    console.log('\n2. Testing net_version...');
    const networkVersion = await provider.send('net_version', []);
    console.log('Network version:', networkVersion);
    
    console.log('\n3. Testing eth_chainId...');
    const chainId = await provider.send('eth_chainId', []);
    console.log('Chain ID:', Number(chainId));
    
    // Get signer info
    console.log('\nTesting wallet connection:');
    console.log('Debug: Private key available:', !!process.env.CYPRUS1_PK);
    
    const wallet = new quais.Wallet(process.env.CYPRUS1_PK, provider);
    const address = await wallet.getAddress();
    console.log('Wallet address:', address);
    
    // Test transaction count
    console.log('\nTesting getTransactionCount...');
    const nonce = await provider.getTransactionCount(address);
    console.log('Current nonce:', nonce);
    
    // Get balance
    console.log('\nTesting getBalance...');
    const balance = await provider.getBalance(address);
    console.log('Balance:', quais.formatEther(balance), 'QUAI');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });