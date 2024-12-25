const { quais } = require('quais');
require('dotenv').config({ path: '../.env' });

async function main() {
  try {
    // Setup provider and wallet
    const provider = new quais.JsonRpcProvider('https://rpc.quai.network', 9000, { usePathing: true });
    const wallet = new quais.Wallet(process.env.CYPRUS1_PK, provider);
    console.log("Using account:", wallet.address);

    // Get contract ABI
    const CroakCityJSON = require('../artifacts/contracts/CroakCity.sol/CroakCity.json');
    
    // Connect to the contract
    const contractAddress = quais.getAddress("0x0062481f93e27cdb73ce0fa173c3251dffe40127");
    const contract = new quais.Contract(
      contractAddress,
      CroakCityJSON.abi,
      wallet
    );
    console.log("Connected to CroakCity at:", contract.address);

    // Get function data
    const functionData = contract.interface.encodeFunctionData('setMintingEnabled', [true]);
    console.log("Function data:", functionData);

    // Prepare nonce
    const nonce = await provider.getTransactionCount(wallet.address);
    console.log("Current nonce:", nonce);

    // Send transaction using eth methods
    const tx = await provider.send('eth_sendTransaction', [{
      from: wallet.address,
      to: contractAddress,
      data: functionData,
      gas: '0x2DC6C0', // 3,000,000 gas
      gasPrice: quais.parseUnits('20', 'gwei').toString(),
      nonce: quais.toBeHex(nonce),
      chainId: '0x2328' // 9000 in hex
    }]);

    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for confirmation...");
    
    await tx.wait();
    console.log("Minting enabled successfully!");

    // Verify it worked
    const isEnabled = await contract.mintingEnabled();
    console.log("Minting enabled:", isEnabled);

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });