const hre = require("hardhat");

async function main() {
  const name = "Croak City";
  const symbol = "CROAK";
  const baseURI = "https://www.croakcity.com/assets/json/";

  const CroakCity = await hre.ethers.getContractFactory("CroakCity");
  const croakCity = await CroakCity.deploy(name, symbol, baseURI);

  await croakCity.deployed();

  console.log(`CroakCity deployed to ${croakCity.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
