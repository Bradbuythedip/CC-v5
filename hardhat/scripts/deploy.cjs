const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment process...");

  try {
    // Get the network
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying contracts with address: ${deployer.address}`);

    const name = "Croak City";
    const symbol = "CROAK";
    const baseURI = "https://www.croakcity.com/assets/json/";

    console.log(`Deploying CroakCity with parameters:
      Name: ${name}
      Symbol: ${symbol}
      BaseURI: ${baseURI}
    `);

    const CroakCity = await ethers.getContractFactory("CroakCity");
    console.log("Deploying contract...");
    
    const croakCity = await CroakCity.deploy(name, symbol, baseURI, {
      gasLimit: 8000000
    });
    
    console.log("Waiting for deployment transaction...");
    await croakCity.deployed();
    
    console.log(`CroakCity deployed to: ${croakCity.address}`);
    
    // Verify deployment
    const contractName = await croakCity.name();
    const contractSymbol = await croakCity.symbol();
    
    console.log(`Verified contract:
      Name: ${contractName}
      Symbol: ${contractSymbol}
      Address: ${croakCity.address}
    `);
  } catch (error) {
    console.error("Deployment failed with error:", error);
    process.exitCode = 1;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
