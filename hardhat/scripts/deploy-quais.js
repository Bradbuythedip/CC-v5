const hre = require("hardhat");
const quais = require('quais');
require('dotenv').config({ path: '../.env' });

async function main() {
    try {
        // Setup provider and wallet
        const provider = new quais.JsonRpcProvider({
            url: "https://rpc.quai.network",
            skipFetchSetup: true
        });
        const wallet = new quais.Wallet(process.env.PRIVATE_KEY, provider);
        console.log("Using address:", wallet.address.toLowerCase());

        const CroakCity = await hre.ethers.getContractFactory("CroakCity");
        
        // Deploy the contract
        console.log("Deploying contract...");
        const croakCity = await CroakCity.deploy(
            "Croak City",
            "CROAK",
            "https://gateway.ipfs.io/ipfs/",
            {
                gasLimit: "3000000",
                gasPrice: quais.parseUnits("20", "gwei")
            }
        );

        // Wait for the transaction to be mined
        const deployTx = croakCity.deploymentTransaction();
        console.log("Deployment transaction hash:", deployTx.hash);
        
        const receipt = await deployTx.wait();
        const contractAddress = await croakCity.getAddress();

        console.log(`
Contract successfully deployed!
=============================
Address: ${contractAddress.toLowerCase()}
Transaction Hash: ${receipt.hash}
Block: ${receipt.blockNumber}
        `);

    } catch (error) {
        console.error("Deployment failed:", error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});