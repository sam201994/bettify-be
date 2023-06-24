## Bettify (Market Prediction)

Smart contract that allows users to create their own market prediction game from a list of templates. Users can place multiple bets. The winner is rewarded with interest and other particpants can withdraw their stake without any loss.

-   BitcoinPredictionFactoryContract - https://goerli.etherscan.io/address/0xdb6D87299ECf39Ffa8AD6710df645c69587C51f4#code
-   BitcoinPrediction - https://goerli.etherscan.io/address/0x98F819395fD431482f785D0bC1Ca1556a23dfaB8#code

## Usage

### To participate in the betting game:

1. Place a bet by calling `placeBet(uint256 _bitcoinGuesspriceInUSD)` and providing a non-zero Bitcoin price guess denominated in USD. Include the amount of ETH the game requires. Every game has a fixed amount of stake set by the user.
2. Wait for the lock-in period to expire to claim your reward.
3. Users can call the `withdrawFunds(uint256 _ticketId)` function to get their stake back.
4. Winner will need to call the `findWinner()` function before claiming their reward.

### To create a new betting game:

1. call the `createProxy( uint256 _bettingPeriodEndsAt,
    uint256 _lockInPeriodEndsAt,
    uint256 _stakeAmount)` function from the factory contract of the desired game you wish to create.

## Contract Deployment

The contract is deployed on the network with the following initial parameters:

1. BTC_USD_FEED_ADDRESS: Address of the Chainlink BTC/USD price feed contract.
2. LENDING_POOL_PROVIDER_ADDRESS: Address of the Aave Lending Pool provider contract.
3. AAVE_V2_ADDRESS: Address of the Aave V2 contract.
4. AAVE_ATOKEN_ADDRESS: Address of the Aave aToken contract.

## Set up

-   copy `.env.exmaple` contents to `.env` file and add the relevant keys.

```
$npm install
$npx hardhat compile // to complie
$npx hardhat test // to test
$npx hardhat run --network NETWORK_NAME scripts/deployFinalBitcoin.js
$npx hardhat verify --network NETWORK_NAME DEPLOYED_CONTRACT_ADDRESS --constructor-args arguments.js
```

## External Dependencies

The DoraBag contract relies on the following Solidity libraries and contracts:

1.  [Chainlink](https://docs.chain.link/data-feeds/price-feeds): The contract uses the Chainlink `AggregatorV3Interface` to fetch the latest price of Bitcoin in USD.

2.  [OpenZeppelin](https://docs.openzeppelin.com/): The contract imports various libraries and contracts from the OpenZeppelin library, including

    -   `Ownable` for ownership functionality
    -   `SafeMath` for safe arithmetic operations
    -   `IERC20` for interacting with ER721 tokens.
    -       `Clones` to create proxy contracts.

3.  [Aave V2](https://docs.aave.com/developers/v/2.0/the-core-protocol/weth-gateway): The contract integrates with the Aave V2 lending protocol to deposit and withdraw ETH. It uses the IAaveV2 interface to interact with the Aave protocol.

## Contract Details

-   SPDX-License-Identifier: MIT
-   Solidity Version: ^0.8.0
