require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: ".env.hardhat" });

/** @type import("hardhat/config").HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    cyprus1: {
      url: "https://rpc.cyprus1.colosseum.quai.network",
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
