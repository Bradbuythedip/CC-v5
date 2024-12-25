/**
 * @type import('hardhat/config').HardhatUserConfig
 */

require("@nomicfoundation/hardhat-toolbox");
const dotenv = require("dotenv");
dotenv.config({ path: "../.env" });

const rpcUrl = process.env.RPC_URL;
const chainId = Number(process.env.CHAIN_ID);

module.exports = {
  defaultNetwork: "cyprus1",
  networks: {
    cyprus1: {
      url: rpcUrl,
      accounts: [process.env.CYPRUS1_PK],
      chainId: chainId,
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