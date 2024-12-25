const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env' });

async function main() {
  try {
    // Connect to the network
    const provider = new ethers.JsonRpcProvider("https://rpc.quai.network/cyprus1");
    
    // Use private key from environment
    let privateKey = process.env.PRIVATE_KEY;
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }
    
    // Create wallet
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log('Using address:', wallet.address.toLowerCase());
    
    // Get contract bytecode and ABI
    const artifactPath = path.join(__dirname, '../artifacts/contracts/CroakCity.sol/CroakCity.json');
    const artifact = require(artifactPath);
    
    // Encode constructor parameters
    const abiCoder = new ethers.AbiCoder();
    const params = abiCoder.encode(
      ['string', 'string', 'string'],
      ['Croak City', 'CROAK', 'https://gateway.ipfs.io/ipfs/']
    );
    
    // Create deployment transaction
    const tx = {
      chainId: 9000,
      gasLimit: "3000000",
      maxFeePerGas: ethers.parseUnits("20", "gwei"),
      maxPriorityFeePerGas: ethers.parseUnits("20", "gwei"),
      data: artifact.bytecode + params.slice(2) // remove 0x prefix from params
    };
    
    // Send transaction
    console.log('Sending deployment transaction...');
    const deployTx = await wallet.sendTransaction(tx);
    console.log('Transaction hash:', deployTx.hash);
    
    // Wait for deployment
    console.log('Waiting for deployment transaction...');
    const receipt = await deployTx.wait();
    const contractAddress = receipt.contractAddress.toLowerCase();
    
    console.log('\nContract Details:');
    console.log('----------------');
    console.log('Address:', contractAddress);
    console.log('Transaction:', deployTx.hash);
    console.log('Block:', receipt.blockNumber);
    
  } catch (error) {
    console.error('Deployment failed:', error);
    if (error.transaction) {
      console.log('Transaction:', error.transaction);
    }
    process.exit(1);
  }
}

main().catch(console.error);