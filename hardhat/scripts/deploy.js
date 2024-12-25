const hre = require("hardhat");
const ethers = require('ethers');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("Starting deployment process...");

  try {
    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider("https://rpc.quai.network/cyprus1");
    const privateKey = process.env.PRIVATE_KEY;
    
    // Create a custom provider that enforces lowercase addresses
    const customProvider = new Proxy(provider, {
      get(target, prop) {
        const value = target[prop];
        if (prop === 'formatter') {
          return {
            ...value,
            address: (value) => value.toLowerCase()
          };
        }
        return value;
      }
    });
    
    const wallet = new ethers.Wallet(privateKey, customProvider);
    const address = wallet.address.toLowerCase();
    console.log("Using address:", address);

    // Get contract artifacts
    const contractPath = path.join(__dirname, "../artifacts/contracts/CroakCity.sol/CroakCity.json");
    const contractJson = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    
    // Get balance
    const balance = await customProvider.getBalance(address);
    console.log("Account balance:", ethers.formatEther(balance), "QUAI");

    // Create contract factory
    console.log("Creating contract factory...");
    const factory = new ethers.ContractFactory(
      contractJson.abi,
      contractJson.bytecode,
      wallet
    );

    // Prepare deployment
    console.log("Preparing deployment...");
    const deploymentTx = await factory.getDeployTransaction(
      "Croak City",
      "CROAK",
      "https://gateway.ipfs.io/ipfs/"
    );

    // Get nonce
    const nonce = await customProvider.getTransactionCount(address);
    console.log("Using nonce:", nonce);

    // Set parameters
    const tx = {
      ...deploymentTx,
      nonce: nonce,
      gasPrice: ethers.parseUnits("20", "gwei"),
      gasLimit: ethers.toBigInt("3000000"),
      chainId: 9000
    };

    // Send transaction
    console.log("Sending deployment transaction...");
    const transaction = await wallet.sendTransaction(tx);
    console.log("Transaction hash:", transaction.hash);

    // Wait for transaction
    console.log("Waiting for deployment transaction...");
    const receipt = await transaction.wait();
    console.log("Contract deployed to:", receipt.contractAddress.toLowerCase());

    console.log(`
Contract Details:
----------------
Name: Croak City
Symbol: CROAK
Address: ${receipt.contractAddress.toLowerCase()}
Mint Price: 1 QUAI
Transaction Hash: ${transaction.hash}
    `);

  } catch (error) {
    console.error("Deployment failed with error:", error);
    if (error.transaction) {
      console.log("Failed transaction:", error.transaction);
    }
    process.exitCode = 1;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });