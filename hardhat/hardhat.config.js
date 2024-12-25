/**
 * @type import('hardhat/config').HardhatUserConfig
 */

require("@nomicfoundation/hardhat-toolbox");
const dotenv = require("dotenv");
dotenv.config({ path: "../.env" });

const rpcUrl = process.env.RPC_URL;
const chainId = Number(process.env.CHAIN_ID);

module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 1337
    },
    cyprus1: {
      url: "https://rpc.cyprus1.colosseum.quai.network",
      accounts: [process.env.CYPRUS1_PK],
      chainId: 9000,
    },
    local: {
      url: "http://localhost:8545",
      accounts: [process.env.CYPRUS1_PK],
      chainId: 1337,
    }
  },
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
};