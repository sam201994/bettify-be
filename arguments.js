const { ethers, network, hardhat } = require("hardhat");

const { BTC_USD_FEED_ADDRESS, AAVE_V2_ADDRESS, AAVE_ATOKEN_ADDRESS, LENDING_POOL_PROVIDER_ADDRESS } =
	network.config.constants;

module.exports = [BTC_USD_FEED_ADDRESS, AAVE_V2_ADDRESS, AAVE_ATOKEN_ADDRESS, LENDING_POOL_PROVIDER_ADDRESS];
