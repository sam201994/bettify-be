const { ethers, network, hardhat } = require("hardhat");
const { placeBet, getProxyAddress, getImplementationAddress, withdraw } = require("./utils");
const ProxyContractABI = require("../artifacts/contracts/BitcoinPrediction.sol/BitcoinPrediction.json").abi;

async function main() {
    const { BTC_USD_FEED_ADDRESS, AAVE_V2_ADDRESS, AAVE_ATOKEN_ADDRESS, LENDING_POOL_PROVIDER_ADDRESS } =
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

    const bettingPeriodEndsAt = parseInt(Date.now() / 1000) + 60; // ends in 1 min
    const lockInPeriodEndsAt = bettingPeriodEndsAt + 60; // ends in 1 min

    console.log({ bettingPeriodEndsAt, lockInPeriodEndsAt });
    const txForProxy = await FactoryContractInstance.createProxy(
        bettingPeriodEndsAt,
        lockInPeriodEndsAt,
        ethers.utils.parseEther("1")
    );
    const receiptForProxy = await txForProxy.wait();
    const proxyAddress = getProxyAddress(receiptForProxy);

    const proxyContract = new ethers.Contract(proxyAddress, ProxyContractABI, deployer);
    console.log({ proxyAddress: proxyContract.address });

    const provider = deployer.provider;

    console.log(await provider.getCode(proxyAddress));
    // console.log(await provider.getCode(AAVE_V2_ADDRESS));

    console.log("\n..................Betting has started..................\n");

    // ----------------------- START -----------------------

    // Call the placeBet function from the first account - guess 30000
    const t1 = await placeBet("1", account1, "30000", "1", proxyContract);

    // Call the placeBet function from the second account - guess 21000
    const t2 = await placeBet("2", account2, "21000", "1", proxyContract);

    // Call the placeBet function from the third account - guess 26000
    const t3 = await placeBet("3", account3, "26000", "1", proxyContract);

    // Call the placeBet function from the fourth account - guess 23000
    const t4 = await placeBet("4", account4, "23000", "1", proxyContract);

    // withdraw the bet from the first account so that it becomes ineligible for the winner
    await withdraw("1", account1, proxyContract, t1);

    // Call the placeBet function from the fifth account - guess 25000
    const t5 = await placeBet("5", account5, "25000", "1", proxyContract);

    // await network.provider.send("evm_increaseTime", [20000]);
    await network.provider.send("hardhat_mine", ["0x3e8", "0x3c"]);

    const bitcoinPrice = await proxyContract.getBitcoinPrice();
    console.log({ BitcoinPrice: ethers.utils.formatUnits(bitcoinPrice, 8).toString() });

    console.log("Bet closest to the price wins!");

    // todo : use static call to get the winner
    const res = await proxyContract.callStatic.findWinner();
    console.log({ res });

    await proxyContract.findWinner();

    console.log("\n..................Betting has stopped, Winner Found..................\n");
    const winnerTicket = await proxyContract.winnerTicket();
    const winnerGuess = await proxyContract.bets(winnerTicket.toString());

    console.log({ winnerTicket: winnerTicket.toString(), winnerGuess });

    await withdraw("3", account3, proxyContract, t3);
    await withdraw("5", account5, proxyContract, t5);
}

// Run the deployment script
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
