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
    
    console.log('Using wallet address:', wallet.address);

    // Get contract instance
    const CroakCityJSON = require('../artifacts/contracts/CroakCity.sol/CroakCity.json');
    const contract = new quais.Contract(CONTRACT_ADDRESS, CroakCityJSON.abi, wallet);

    // Check contract details
    console.log('Contract address:', CONTRACT_ADDRESS);
    
    // Try to get owner
    const owner = await contract.owner();
    console.log('Contract owner:', owner);
    console.log('Is wallet owner?', wallet.address.toLowerCase() === owner.toLowerCase());

    // Get total supply
    const totalSupply = await contract.totalSupply();
    console.log('Total supply:', totalSupply.toString());

    // Get max supply
    const maxSupply = await contract.maxSupply();
    console.log('Max supply:', maxSupply.toString());

  } catch (error) {
    console.error('Error:', error);
    if (error.info) {
      console.error('Additional error info:', JSON.stringify(error.info, null, 2));
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});