require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../.env.local" });

module.exports = {
  networks: {
    cyprus1: {
      url: process.env.RPC_URL || "https://rpc.cyprus1.testnet.quai.network",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: parseInt(process.env.CHAIN_ID || "9000"),
      timeout: 60000,
    }
  },
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000
      },
      evmVersion: "london"
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
