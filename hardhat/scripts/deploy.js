import pkg from "quais";
const { Wallet, Contract, providers } = pkg;
import dotenv from "dotenv";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: ".env.hardhat" });

async function main() {
  console.log("Starting deployment process...");

  try {
    // Setup provider and wallet
    const provider = new providers.JsonRpcProvider("https://rpc.quai.network/cyprus1");
    const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
    console.log(`Deploying from address: ${wallet.address}`);

    // Read the contract artifacts
    const contractPath = join(__dirname, "../artifacts/contracts/CroakCityV2.sol/CroakCityV2.json");
    const contractArtifact = JSON.parse(readFileSync(contractPath, "utf8"));

    // Get contract parameters from environment or defaults
    const contractName = process.env.CONTRACT_NAME || "Croak City";
    const contractSymbol = process.env.CONTRACT_SYMBOL || "CROAK";
    const baseUri = process.env.BASE_URI || "https://www.croakcity.com/assets/json/";

    // Get the contract factory
    const factory = new Contract(null, contractArtifact.abi, wallet);
    const deployTx = factory.getDeployTransaction(
      contractName,
      contractSymbol,
      baseUri,
      {
        data: contractArtifact.bytecode,
        gasLimit: 8000000,
        gasPrice: await provider.getGasPrice()
      }
    );

    console.log("Sending deployment transaction...");
    const tx = await wallet.sendTransaction(deployTx);
    console.log("Waiting for deployment transaction...");
    const receipt = await tx.wait();

    const contractAddress = receipt.contractAddress;
    console.log(`CroakCity deployed to: ${contractAddress}`);

    // Verify the deployment
    const contract = new Contract(contractAddress, contractArtifact.abi, wallet);
    const contractName = await contract.name();
    const contractSymbol = await contract.symbol();

    console.log(`Verified contract:
      Name: ${contractName}
      Symbol: ${contractSymbol}
      Address: ${contractAddress}
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
