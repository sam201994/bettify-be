require("@nomicfoundation/hardhat-toolbox");
require("dotenv/config");
const constants = require("./constants");

// constants
const { GOERLI_PRIVATE_KEY_ALCHEMY, ACCOUNT_PRIVATE_KEY, MAINNET_PRIVATE_KEY_ALCHEMY, ETHERSCAN_API_KEY, POLYGON_PRIVATE_KEY_ALCHEMY } = process.env;

module.exports = {
    networks: {
        hardhat: {
            forking: {
                url: `https://eth-mainnet.alchemyapi.io/v2/${MAINNET_PRIVATE_KEY_ALCHEMY}`,
            },
            chainId: 31337,
            constants: constants.mainnet,
        },
        goerli: {
            url: `https://eth-goerli.g.alchemy.com/v2/${GOERLI_PRIVATE_KEY_ALCHEMY}`,
            accounts: [ACCOUNT_PRIVATE_KEY],
            constants: constants.goerli,
        },
        mainnet: {
            url: `https://eth-mainnet.alchemyapi.io/v2/${MAINNET_PRIVATE_KEY_ALCHEMY}`,
            chainId: 1,
            constants: constants.mainnet,
        },
        polygon: {
            url: `https://polygon-mainnet.g.alchemy.com/v2/${POLYGON_PRIVATE_KEY_ALCHEMY}`,
            accounts: [ACCOUNT_PRIVATE_KEY],
            constants: constants.polygon,
        },
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },
    solidity: {
        compilers: [
            {
                version: "0.8.18",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 100,
                    },
                },
            },
        ],
    },
};
