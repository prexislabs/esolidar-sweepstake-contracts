require("dotenv").config();

require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require("solidity-coverage");

require("hardhat-abi-exporter");
require("@nomiclabs/hardhat-web3");

require("hardhat-deploy");
require("@nomiclabs/hardhat-ethers");

module.exports = {
  // defaultNetwork: "alfajores",
  namedAccounts: {
    deployer: 0,
  },

  solidity: {
    version: "0.8.7",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    // BSC Testnet
    bsctestnet: {
      url: process.env.RPC_TESTNET,
      accounts:
        process.env.TESTNET_PRIVATE_KEY !== undefined ? [process.env.TESTNET_PRIVATE_KEY] : [],
    },

    // Rinkeby: 4
    rinkeby: {
      url: process.env.RPC_RINKEBY || "",
      accounts:
        process.env.TESTNET_PRIVATE_KEY !== undefined ? [process.env.TESTNET_PRIVATE_KEY] : [],
    },

    alfajores: {
      url: "https://alfajores-forno.celo-testnet.org",
      accounts: process.env.CELO_ADDRESS_PK !== undefined ? [process.env.CELO_ADDRESS_PK] : [],
      chainId: 44787,
    },

    celo: {
      url: "https://forno.celo.org",
      accounts: process.env.CELO_ADDRESS_PK !== undefined ? [process.env.CELO_ADDRESS_PK] : [],
      chainId: 42220,
    },
  },

  gasReporter: {
    enabled: false,
    currency: "USD",
    token: "CELO",
    coinmarketcap: process.env.COINMARKETCAP,
    gasPrice: "0.6",
  },

  abiExporter: {
    path: "./abi",
    runOnCompile: true,
    clear: true,
    flat: true,
    spacing: 2,
    pretty: true,
  },

  etherscan: {
    apiKey: process.env.BSCSCAN_API_KEY,
  },
};
