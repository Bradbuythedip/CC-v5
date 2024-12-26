require("@nomicfoundation/hardhat-toolbox");
require('quai-hardhat-plugin');
const dotenv = require("dotenv");
dotenv.config({ path: "../.env" });

const rpcUrl = process.env.RPC_URL || "https://rpc.quai.network";
const chainId = Number(process.env.CHAIN_ID || "9000");
const privateKey = process.env.CYPRUS1_PK;

if (!privateKey) {
  console.warn("⚠️ No CYPRUS1_PK found in .env file");
}

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "cyprus1",
  networks: {
    cyprus1: {
      url: rpcUrl,
      chainId: chainId,
      accounts: privateKey ? [privateKey] : [],
      timeout: 60000, // 60 seconds
    }
  },
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 40000
  }
};