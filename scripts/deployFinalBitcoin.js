const { ethers, network, hardhat } = require("hardhat");
const { placeBet, getTokenId, getImplementationAddress, withdraw } = require("./utils");

async function main() {
    const { BTC_USD_FEED_ADDRESS, LENDING_POOL_PROVIDER_ADDRESS, AAVE_V2_ADDRESS, AAVE_ATOKEN_ADDRESS } =
        network.config.constants;

    // Retrieve the accounts
    const [deployer, account1, account2, account3, account4, account5] = await ethers.getSigners();

    // Compile the contract
    const ImplementationContract = await ethers.getContractFactory("BitcoinPrediction");

    // Deploy the contract
    const implementaionContractInstance = await ImplementationContract.deploy(
        BTC_USD_FEED_ADDRESS,
        AAVE_V2_ADDRESS,
        AAVE_ATOKEN_ADDRESS,
        LENDING_POOL_PROVIDER_ADDRESS
    );

    await implementaionContractInstance.deployed();
    console.log({ implementaionContract: implementaionContractInstance.address });

    // Compile the contract
    const FactoryContract = await ethers.getContractFactory("BitcoinPredictionFactoryContract");

    // Deploy the contract
    const FactoryContractInstance = await FactoryContract.deploy(implementaionContractInstance.address);
    await FactoryContractInstance.deployed();
    console.log({ factoryContract: FactoryContractInstance.address });
}

// Run the deployment script
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
