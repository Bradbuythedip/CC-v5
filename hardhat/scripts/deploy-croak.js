const quais = require('quais');
const hre = require("hardhat");
const CroakJson = require('../artifacts/contracts/CroakCity.sol/CroakCity.json');

async function main() {
    try {
        // Config provider with usePathing option for Quai
        const provider = new quais.JsonRpcProvider(hre.network.config.url, undefined, { usePathing: true });
        const wallet = new quais.Wallet(hre.network.config.accounts[0], provider);
        console.log("Deploying from address:", wallet.address);

        // Create contract factory
        const CroakCity = new quais.ContractFactory(CroakJson.abi, CroakJson.bytecode, wallet);

        // Deploy with constructor arguments
        console.log("Broadcasting deployment transaction...");
        const croakCity = await CroakCity.deploy(
            "Croak City",
            "CROAK",
            "https://gateway.ipfs.io/ipfs/",
            {
                gasLimit: "3000000",
                gasPrice: quais.parseUnits("20", "gwei")
            }
        );

        const tx = croakCity.deploymentTransaction();
        console.log("Transaction broadcasted:", tx.hash);

        // Wait for deployment
        await croakCity.waitForDeployment();
        const contractAddress = await croakCity.getAddress();
        console.log("Contract deployed to:", contractAddress.toLowerCase());

    } catch (error) {
        console.error("Deployment failed:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });