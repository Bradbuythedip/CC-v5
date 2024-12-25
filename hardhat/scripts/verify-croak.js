const quais = require('quais');
const hre = require("hardhat");
const CroakJson = require('../artifacts/contracts/CroakCity.sol/CroakCity.json');

async function main() {
    try {
        // Setup provider
        const provider = new quais.JsonRpcProvider(hre.network.config.url, undefined, { 
            usePathing: true,
            staticNetwork: true 
        });

        // Get signer with provider
        const signer = new quais.Wallet(hre.network.config.accounts[0]).connect(provider);

        // Create contract instance with minimal interface
        const croakCity = new quais.Contract(
            "0x0062481f93e27cdb73ce0fa173c3251dffe40127",
            [
                "function name() view returns (string)",
                "function symbol() view returns (string)",
                "function totalSupply() view returns (uint256)",
                "function maxSupply() pure returns (uint256)"
            ],
            signer
        );

        // Get contract details
        console.log("\nVerifying contract details...");
        const name = await croakCity.name();
        const symbol = await croakCity.symbol();
        const totalSupply = await croakCity.totalSupply();
        const maxSupply = await croakCity.maxSupply();
        
        console.log(`
Contract Details:
----------------
Name: ${name}
Symbol: ${symbol}
Total Supply: ${totalSupply}
Max Supply: ${maxSupply}
Contract Address: ${contractAddress}
        `);

    } catch (error) {
        console.error("Verification failed:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });