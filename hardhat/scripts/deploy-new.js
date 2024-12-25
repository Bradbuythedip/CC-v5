const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment process...");

  try {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with address:", deployer.address);

    // Get balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance));

    // Deploy contract
    console.log("Deploying CroakCity...");
    const CroakCity = await ethers.getContractFactory("CroakCity");
    
    const deployment = await CroakCity.deploy(
      "Croak City",
      "CROAK",
      "https://gateway.ipfs.io/ipfs/",
      {
        gasLimit: 3000000,
        gasPrice: ethers.parseUnits("20", "gwei")
      }
    );

    console.log("Deployment transaction sent:", deployment.deploymentTransaction().hash);
    
    await deployment.waitForDeployment();
    const address = await deployment.getAddress();
    
    console.log("\nContract deployed!");
    console.log("Address:", address);
    console.log("Transaction:", deployment.deploymentTransaction().hash);

  } catch (error) {
    console.error("Deployment failed:", error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});