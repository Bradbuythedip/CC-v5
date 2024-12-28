require("@nomiclabs/hardhat-ethers");
require("dotenv").config({ path: ".env.hardhat" });

const PRIVATE_KEY = process.env.PRIVATE_KEY;
// Remove "0x" prefix if present
const formattedKey = PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY.slice(2) : PRIVATE_KEY;

module.exports = {
  defaultNetwork: "cyprus1",
  networks: {
    hardhat: {},
    cyprus1: {
      url: "https://rpc.quai.network/cyprus1",
      accounts: [`0x${formattedKey}`],
      chainId: 9000,
      gasLimit: 8000000,
      gasPrice: 1000000000
    }
  },
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  }
};
