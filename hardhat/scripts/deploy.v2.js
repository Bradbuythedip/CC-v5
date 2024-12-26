require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy parameters
  const name = "Croak City";
  const symbol = "CROAK";
  const baseURI = "https://api.croakcity.xyz/metadata/";
  const treasury = process.env.TREASURY_ADDRESS || deployer.address;

  // Deploy the contract
  const CroakCity = await ethers.getContractFactory("CroakCity");
  const croakCity = await CroakCity.deploy(name, symbol, baseURI, treasury);

  await croakCity.waitForDeployment();

  const contractAddress = await croakCity.getAddress();
  console.log("Contract deployed to:", contractAddress);
  console.log("Treasury address set to:", treasury);

  // Verify contract on the explorer (optional)
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: [name, symbol, baseURI, treasury],
    });
    console.log("Contract verified successfully");
  } catch (error) {
    console.error("Error verifying contract:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });