const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env' });

// Utility function to format addresses for Quai
function formatQuaiAddress(address) {
    return address.toLowerCase();
}

async function main() {
    try {
        // Setup provider and wallet
        const provider = new ethers.JsonRpcProvider("https://rpc.quai.network/cyprus1");
        const privateKey = process.env.PRIVATE_KEY;
        const wallet = new ethers.Wallet(privateKey, provider);
        
        // Get the address and format it for Quai
        const address = formatQuaiAddress(wallet.address);
        console.log('Using address:', address);
        
        // Get contract artifacts
        const artifactPath = path.join(__dirname, '../artifacts/contracts/CroakCity.sol/CroakCity.json');
        const contractJson = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        
        // Prepare constructor arguments
        const constructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
            ['string', 'string', 'string'],
            ['Croak City', 'CROAK', 'https://gateway.ipfs.io/ipfs/']
        ).slice(2); // remove 0x prefix
        
        // Create deployment transaction
        const tx = {
            chainId: 9000,
            data: contractJson.bytecode + constructorArgs,
            gasLimit: ethers.toBigInt('3000000'),
            maxFeePerGas: ethers.parseUnits('20', 'gwei'),
            maxPriorityFeePerGas: ethers.parseUnits('20', 'gwei'),
            from: address
        };
        
        // Get nonce with lowercase address
        console.log('Getting nonce...');
        const nonce = await provider.getTransactionCount(address, 'latest');
        tx.nonce = nonce;
        
        console.log('Preparing transaction...');
        // Sign the transaction
        const signedTx = await wallet.signTransaction(tx);
        
        console.log('Sending transaction...');
        // Send the raw transaction
        const response = await provider.send('eth_sendRawTransaction', [signedTx]);
        console.log('Transaction hash:', response);
        
        console.log('Waiting for transaction confirmation...');
        const receipt = await provider.waitForTransaction(response);
        console.log('Contract deployed at:', formatQuaiAddress(receipt.contractAddress));
        
    } catch (error) {
        console.error('Deployment failed:', error);
        if (error.transaction) {
            console.log('Failed transaction:', error.transaction);
        }
        if (error.response) {
            console.log('RPC Response:', error.response);
        }
        process.exit(1);
    }
}

main();