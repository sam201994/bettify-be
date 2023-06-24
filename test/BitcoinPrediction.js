const { ethers, network } = require("hardhat");
const { expect } = require("chai");
const ProxyContractABI = require("../artifacts/contracts/BitcoinPrediction.sol/BitcoinPrediction.json").abi;
const { getProxyAddress } = require("../scripts/utils");

const { BTC_USD_FEED_ADDRESS, AAVE_V2_ADDRESS, AAVE_ATOKEN_ADDRESS, LENDING_POOL_PROVIDER_ADDRESS } =
    network.config.constants;

describe("BitcoinPrediction Tests", function () {
    let deployer;
    let account1;
    let account2;
    let account3;
    let account4;
    let account5;

    let proxyContract;
    let factoryContract;
    let proxyAddress;
    let bettingPeriodEndsAt;
    let lockInPeriodEndsAt;

    const betAmount = ethers.utils.parseEther("1");

    before(async function () {
        // Retrieve the accounts
        [deployer, account1, account2, account3, account4, account5] = await ethers.getSigners();

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

        // Compile the contract
        const FactoryContract = await ethers.getContractFactory("BitcoinPredictionFactoryContract");

        // Deploy the contract
        const FactoryContractInstance = await FactoryContract.deploy(implementaionContractInstance.address);
        await FactoryContractInstance.deployed();

        factoryContract = FactoryContractInstance;
    });

    describe("Place Bets", function () {
        before(async function () {
            bettingPeriodEndsAt = parseInt(Date.now() / 1000) + 60; // ends in 1 min
            lockInPeriodEndsAt = bettingPeriodEndsAt + 60; // ends in 1 min
            const txForProxy = await factoryContract.createProxy(bettingPeriodEndsAt, lockInPeriodEndsAt, betAmount);
            const receiptForProxy = await txForProxy.wait();
            proxyAddress = getProxyAddress(receiptForProxy);
            proxyContract = new ethers.Contract(proxyAddress, ProxyContractABI, deployer);
        });

        it("should place a bet", async function () {
            const guess = "30000";

            // eth balance of user before placing a bet
            const balanceBefore = await deployer.getBalance();

            const tx = await proxyContract.placeBet(guess, { value: betAmount });
            const receipt = await tx.wait();

            const { events } = receipt;
            const betPlacedEvent = events[events.length - 1];
            const tokenId = betPlacedEvent?.args?.ticketId?.toString();

            // eth balance of user after placing a bet
            const balanceAfter = await deployer.getBalance();

            // check if the eth deducted is more than or equal to the bet amount
            expect(balanceBefore.sub(balanceAfter)).to.be.gte(betAmount);

            // check if the user gets a ticket on placing a bet
            expect(tokenId).to.not.be.undefined;
        });

        it("should give error if the user places a bet with amount different than the amount specified while creating the contract", async function () {
            const guess = "30000";

            await expect(proxyContract.placeBet(guess, { value: ethers.utils.parseEther("2") })).to.be.revertedWith(
                "Invalid stake amount"
            );
        });

        it("should give error if the user places a bet with guess less than 0", async function () {
            const guess = "-1";

            // check for any error
            await expect(proxyContract.placeBet(guess), { value: betAmount }).to.be.throw;
        });

        it("should give error if the user tries to place a bet after the betting period has ended", async function () {
            await ethers.provider.send("evm_setNextBlockTimestamp", [bettingPeriodEndsAt + 1]);
            await ethers.provider.send("evm_mine");

            const guess = "30000";

            await expect(proxyContract.placeBet(guess), { value: betAmount }).to.be.revertedWith(
                "Bet staking period has ended"
            );
        });
    });

    describe("Withdraw Funds", function () {
        let ticketId;
        let snapshotId;

        beforeEach(async function () {
            // Place a bet to obtain a ticket
            bettingPeriodEndsAt = parseInt(Date.now() / 1000) + 60; // ends in 1 min
            lockInPeriodEndsAt = bettingPeriodEndsAt + 60; // ends in 1 min

            // Capture a snapshot of the EVM state
            snapshotId = await ethers.provider.send("evm_snapshot", []);

            const txForProxy = await factoryContract.createProxy(bettingPeriodEndsAt, lockInPeriodEndsAt, betAmount);
            const receiptForProxy = await txForProxy.wait();
            proxyAddress = getProxyAddress(receiptForProxy);
            proxyContract = new ethers.Contract(proxyAddress, ProxyContractABI, deployer);
            const guess = "30000";
            const tx = await proxyContract.placeBet(guess, { value: betAmount });
            const receipt = await tx.wait();
            const { events } = receipt;
            const betPlacedEvent = events[events.length - 1];
            ticketId = betPlacedEvent?.args?.ticketId?.toString();
        });

        afterEach(async function () {
            // Revert the EVM state to the previous snapshot
            await ethers.provider.send("evm_revert", [snapshotId]);
        });

        it("should be able to withdraw funds before the betting period ends", async function () {
            const initialBalance = await deployer.getBalance();

            // Withdraw funds before the betting period ends
            const tx = await proxyContract.withdrawFunds(ticketId);
            await tx.wait();

            const finalBalance = await deployer.getBalance();

            // Check if the funds are successfully withdrawn (balance increased)
            expect(finalBalance).to.be.gt(initialBalance);
        });

        it("the ticket should belong to the user who is withdrawing the funds", async function () {
            // Get the owner of the ticket
            const ticketOwner = await proxyContract.ownerOf(ticketId);

            // Check if the ticket owner is the same as the deployer (user withdrawing the funds)
            expect(ticketOwner).to.equal(deployer.address);
        });

        it("should give error if the user tries to withdraw funds in the lock-in period", async function () {
            // Try to withdraw funds during the lock-in period
            await ethers.provider.send("evm_setNextBlockTimestamp", [bettingPeriodEndsAt + 1]);
            await ethers.provider.send("evm_mine");
            await expect(proxyContract.withdrawFunds(ticketId)).to.be.revertedWith(
                "Cannot withdraw funds in lockin period"
            );
        });

        it("should be able to withdraw funds after the lock-in period ends", async function () {
            const initialBalance = await deployer.getBalance();

            // Move past the lock-in period
            await ethers.provider.send("evm_setNextBlockTimestamp", [lockInPeriodEndsAt + 2]);
            await ethers.provider.send("evm_mine");

            // Withdraw funds after the lock-in period ends
            const tx = await proxyContract.withdrawFunds(ticketId);
            await tx.wait();

            const finalBalance = await deployer.getBalance();

            // Check if the funds are successfully withdrawn (balance increased)
            expect(finalBalance).to.be.gt(initialBalance);
        });
    });

    describe("Find Winner", function () {
        beforeEach(async function () {
            bettingPeriodEndsAt = parseInt(Date.now() / 1000) + 60; // ends in 1 min
            lockInPeriodEndsAt = bettingPeriodEndsAt + 60; // ends in 1 min

            // Capture a snapshot of the EVM state
            snapshotId = await ethers.provider.send("evm_snapshot", []);

            // Create a proxy contract
            const txForProxy = await factoryContract.createProxy(bettingPeriodEndsAt, lockInPeriodEndsAt, betAmount);
            const receiptForProxy = await txForProxy.wait();
            proxyAddress = getProxyAddress(receiptForProxy);
            proxyContract = new ethers.Contract(proxyAddress, ProxyContractABI, deployer);
        });

        afterEach(async function () {
            // Revert the EVM state to the previous snapshot
            await ethers.provider.send("evm_revert", [snapshotId]);
        });

        it("should throw an error if the lock-in period has not ended and findWinner is called", async function () {
            // Try to find the winner during the lock-in period
            await expect(proxyContract.findWinner()).to.be.revertedWith("Bet has not ended");
        });

        it("should throw an error if there are no bets and findWinner is called", async function () {
            // Move past the lock-in period
            await ethers.provider.send("evm_setNextBlockTimestamp", [lockInPeriodEndsAt + 2]);
            await ethers.provider.send("evm_mine");

            // Try to find the winner when there are no bets
            await expect(proxyContract.findWinner()).to.be.revertedWith("There are no users");
        });

        it("should find the winner", async function () {
            const tickets = [];
            // Place 3 bets
            const guess1 = "30000";
            const guess2 = "40000";
            const guess3 = "50000";

            const tx1 = await proxyContract.placeBet(guess1, { value: betAmount });
            const tx2 = await proxyContract.placeBet(guess2, { value: betAmount });
            const tx3 = await proxyContract.placeBet(guess3, { value: betAmount });

            const receipt1 = await tx1.wait();
            const receipt2 = await tx2.wait();
            const receipt3 = await tx3.wait();

            const { events: events1 } = receipt1;
            const { events: events2 } = receipt2;
            const { events: events3 } = receipt3;

            const betPlacedEvent1 = events1[events1.length - 1];
            const betPlacedEvent2 = events2[events2.length - 1];
            const betPlacedEvent3 = events3[events3.length - 1];

            tickets.push(betPlacedEvent1?.args?.ticketId?.toString());
            tickets.push(betPlacedEvent2?.args?.ticketId?.toString());
            tickets.push(betPlacedEvent3?.args?.ticketId?.toString());

            // Move past the lock-in period
            await ethers.provider.send("evm_setNextBlockTimestamp", [lockInPeriodEndsAt + 2]);
            await ethers.provider.send("evm_mine");

            // Find the winner
            const tx = await proxyContract.findWinner();
            await tx.wait();
            const winnerTicket = await proxyContract.winnerTicket();
            const winner = winnerTicket?.toString();

            // Check if the winner is one of the users who placed the bets
            expect(tickets).to.include(winner);
        });
    });
});
