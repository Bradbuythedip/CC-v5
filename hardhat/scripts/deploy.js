const hre = require("hardhat");

// Verification will be done manually since the explorer is not standard etherscan
async function verifyContract(address, constructorArguments) {
  console.log("\nContract verification info:");
  console.log("---------------------------");
  console.log("Address:", address);
  console.log("Constructor arguments:", constructorArguments);
  console.log("\nVerify with:");
  console.log(`npx hardhat verify --network cyprus1 ${address} "${constructorArguments.join('" "')}"`);
}

async function main() {
  try {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
    console.log("Treasury address:", treasuryAddress);

    // Deploy CroakCity
    console.log("\nDeploying CroakCity contract...");
    const CroakCity = await hre.ethers.getContractFactory("CroakCity");
    
    const constructorArgs = [
      "Croak City",                                // name
      "CROAK",                                     // symbol
      "https://api.croakcity.xyz/metadata/",       // baseURI
      treasuryAddress                              // treasury
    ];

    const croakCity = await CroakCity.deploy(...constructorArgs);
    await croakCity.waitForDeployment();
    const contractAddress = await croakCity.getAddress();
    
    console.log("CroakCity deployed to:", contractAddress);

    // Verify minting is enabled
    console.log("\nVerifying minting status...");
    const mintingEnabled = await croakCity.mintingEnabled();
    console.log("Minting enabled:", mintingEnabled);

    // If minting is not enabled, enable it
    if (!mintingEnabled) {
      console.log("Enabling minting...");
      const tx = await croakCity.setMintingEnabled(true);
      await tx.wait();
      console.log("Minting has been enabled");
    }

    // Print deployment summary
    console.log("\nDeployment Summary:");
    console.log("--------------------");
    console.log("Contract Address:", contractAddress);
    console.log("Treasury Address:", treasuryAddress);
    console.log("Minting Enabled:", await croakCity.mintingEnabled());
    console.log("Max Supply:", await croakCity.maxSupply());
    console.log("Mint Price:", hre.ethers.formatEther(await croakCity.MINT_PRICE()), "QUAI");

    // Print verification info
    await verifyContract(contractAddress, constructorArgs);

  } catch (error) {
    console.error("Deployment failed:", error);
    process.exit(1);
  }
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });