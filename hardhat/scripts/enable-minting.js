const { quais } = require('quais');
require('dotenv').config({ path: '../.env' });

async function main() {
  try {
    // Contract address from deployment
    const CONTRACT_ADDRESS = quais.getAddress('0x0062481f93e27cdb73ce0fa173c3251dffe40127');
    const OWNER_PK = process.env.CYPRUS1_PK;

    if (!OWNER_PK) {
      throw new Error('Owner private key not found in environment variables');
    }

    // Setup provider and wallet
    const provider = new quais.JsonRpcProvider(process.env.RPC_URL || 'https://rpc.quai.network', 9000, { usePathing: true });
    const wallet = new quais.Wallet(OWNER_PK, provider);

    // Set gas prices manually since getFeeData is not supported
    const maxFeePerGas = quais.parseUnits('20', 'gwei');
    const maxPriorityFeePerGas = quais.parseUnits('20', 'gwei');
    console.log('Using gas prices:', {
      maxFeePerGas: quais.formatUnits(maxFeePerGas, 'gwei'),
      maxPriorityFeePerGas: quais.formatUnits(maxPriorityFeePerGas, 'gwei')
    });
    
    console.log('Using wallet address:', wallet.address);

    // Get contract instance
    const CroakCityJSON = require('../artifacts/contracts/CroakCity.sol/CroakCity.json');
    const contract = new quais.Contract(CONTRACT_ADDRESS, CroakCityJSON.abi, wallet);

    // Check current minting status
    // Check if we're the owner
    const owner = await contract.owner();
    console.log('Contract owner:', owner);
    if (wallet.address.toLowerCase() !== owner.toLowerCase()) {
      throw new Error('Wallet is not the contract owner');
    }
    console.log('Ownership verified ✓');

    // Check current minting status
    const currentStatus = await contract.mintingEnabled();
    console.log('Current minting status:', currentStatus);

    if (!currentStatus) {
      console.log('Enabling minting...');
      const tx = await contract.setMintingEnabled(true, {
        gasLimit: 3000000,
        maxFeePerGas,
        maxPriorityFeePerGas
      });

      console.log('Transaction sent:', tx.hash);
      console.log('Waiting for confirmation...');
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed in block:', receipt.blockNumber);
      
      const newStatus = await contract.mintingEnabled();
      console.log('New minting status:', newStatus);
    } else {
      console.log('Minting is already enabled');
    }

  } catch (error) {
    console.error('Error:', error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});