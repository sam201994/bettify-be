// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./BitcoinPrediction.sol";
import "./MinimalProxy.sol";

/**
 * @title BitcoinPredictionFactoryContract
 * @dev A factory contract for creating proxy instances of the BitcoinPrediction contract.
 */
contract BitcoinPredictionFactoryContract is Ownable {
    using Clones for address;

    address public templateAddress;

    event ProxyCreated(
        address indexed proxy,
        address indexed ownerAddress,
        uint256 createdAt,
        uint256 bettingPeriodEndsAt,
        uint256 lockInPeriodEndsAt,
        uint256 stakeAmount
    );

    /**
     * @dev Initializes the BitcoinPredictionFactoryContract with the address of the template contract.
     * @param _templateAddress The address of the template contract to be used for creating proxies.
     */
    constructor(address _templateAddress) {
        templateAddress = _templateAddress;
    }

    /**
     * @dev Creates a proxy instance of the BitcoinPrediction contract.
     * @param _bettingPeriodEndsAt The timestamp indicating the end of the betting period for the prediction.
     * @param _lockInPeriodEndsAt The timestamp indicating the end of the lock-in period for the prediction.
     * @param _stakeAmount The amount of stake required for participating in the prediction.
     * @return The address of the newly created proxy contract.
     */
    function createProxy(
        uint256 _bettingPeriodEndsAt,
        uint256 _lockInPeriodEndsAt,
        uint256 _stakeAmount
    ) public returns (address) {
        address payable proxy = payable(templateAddress.clone());
        BitcoinPrediction(proxy).initialize(_bettingPeriodEndsAt, _lockInPeriodEndsAt, _stakeAmount);
        emit ProxyCreated(proxy, msg.sender, block.timestamp, _bettingPeriodEndsAt, _lockInPeriodEndsAt, _stakeAmount);
        return proxy;
    }

    /**
     * @dev Updates the address of the template contract to be used for creating proxies.
     * @param _newTemplateAddress The new address of the template contract.
     */
    function updateTemplateAddress(address _newTemplateAddress) public onlyOwner {
        templateAddress = _newTemplateAddress;
    }
}
