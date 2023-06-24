// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "hardhat/console.sol";

import "./interfaces/IAaveV2.sol";
import "./interfaces/ILendingPoolAddressesProvider.sol";

import "./Ticket.sol";

/**
 * @title BitcoinPrediction
 * @dev A contract for placing bets on Bitcoin price predictions and determining the winner.
 * Inherits from the Ticket contract for minting and managing ERC721 tickets.
 */
contract BitcoinPrediction is Ticket, Initializable {
    using SafeMath for uint256;

    // Chainlink Aggregator for Bitcoin price feed
    AggregatorV3Interface private immutable priceFeed;

    // Aave V2 interface for interacting with Aave protocol
    IAaveV2 private immutable iAaveV2;

    // Aave aToken interface for interacting with aToken
    IERC20 private immutable iAToken;

    // LendingPoolAddressesProvider interface for getting LendingPool address
    ILendingPoolAddressesProvider private immutable lendingPoolAddressesProvider;

    address immutable LENDING_POOL_ADDRESS;

    uint256 bettingPeriodEndsAt;
    uint256 lockInPeriodEndsAt;
    uint256 stakeAmount;
    uint256 public winnerTicket;

    mapping(uint256 => uint256) public bets;

    event BetPlaced(address indexed proxyAddress, address indexed user, uint256 guessPrice, uint256 ticketId);

    event Withdrawal(address indexed proxyAddress, address indexed user, uint256 amount, uint256 ticketId);

    event WinnerFound(address indexed proxyAddress, address indexed user, uint256 ticketId, uint256 guessPrice);

    /**
     * @dev Initializes the BitcoinPrediction contract with the necessary addresses.
     * @param _BTC_USD_FEED_ADDRESS The address of the Chainlink Aggregator for Bitcoin price feed.
     * @param _AAVE_V2_ADDRESS The address of the Aave V2 contract.
     * @param _AAVE_ATOKEN_ADDRESS The address of the Aave aToken contract.
     * @param _LENDING_POOL_PROVIDER_ADDRESS The address of the LendingPoolAddressesProvider contract.
     */
    constructor(
        address _BTC_USD_FEED_ADDRESS,
        address _AAVE_V2_ADDRESS,
        address _AAVE_ATOKEN_ADDRESS,
        address _LENDING_POOL_PROVIDER_ADDRESS
    ) {
        priceFeed = AggregatorV3Interface(_BTC_USD_FEED_ADDRESS);
        iAaveV2 = IAaveV2(_AAVE_V2_ADDRESS);
        iAToken = IERC20(_AAVE_ATOKEN_ADDRESS);
        lendingPoolAddressesProvider = ILendingPoolAddressesProvider(_LENDING_POOL_PROVIDER_ADDRESS);
        LENDING_POOL_ADDRESS = getLendingPoolAddress();
    }

    /**
     * @dev Initializes the BitcoinPrediction contract with the betting and lock-in periods, and stake amount.
     * @param _bettingPeriodEndsAt The timestamp when the betting period ends.
     * @param _lockInPeriodEndsAt The timestamp when the lock-in period ends.
     * @param _stakeAmount The amount of Ether required to place a bet.
     */
    function initialize(
        uint256 _bettingPeriodEndsAt,
        uint256 _lockInPeriodEndsAt,
        uint256 _stakeAmount
    ) public initializer {
        bettingPeriodEndsAt = _bettingPeriodEndsAt;
        lockInPeriodEndsAt = _lockInPeriodEndsAt;
        stakeAmount = _stakeAmount;
        iAToken.approve(address(iAaveV2), type(uint256).max);
    }

    /**
     * @dev Allows users to place a bet on the Bitcoin price prediction.
     * @param _bitcoinGuesspriceInUSD The guessed Bitcoin price in USD.
     */
    function placeBet(uint256 _bitcoinGuesspriceInUSD) external payable {
        require(block.timestamp < bettingPeriodEndsAt, "Bet staking period has ended");
        require(msg.value == stakeAmount, "Invalid stake amount");

        uint256 ticketId = super.mint(msg.sender);
        bets[ticketId] = _bitcoinGuesspriceInUSD;

        iAaveV2.depositETH{ value: msg.value }(LENDING_POOL_ADDRESS, address(this), 0);
        emit BetPlaced(address(this), msg.sender, _bitcoinGuesspriceInUSD, ticketId);
    }

    /**
     * @dev Allows users to withdraw their funds after the lock-in period ends.
     * @param ticketId The ID of the ticket to withdraw funds from.
     */
    function withdrawFunds(uint256 ticketId) external {
        // Check conditions for withdrawal

        uint256 bettingPeriodEndTimestamp = bettingPeriodEndsAt;
        require(
            block.timestamp < bettingPeriodEndTimestamp || block.timestamp > lockInPeriodEndsAt,
            "Cannot withdraw funds in lockin period"
        );
        require(super.ownerOf(ticketId) == msg.sender, "This ticket does not belong to caller");

        // Calculate the amount to withdraw
        uint256 amount = stakeAmount;

        // Add interest if the ticket is the winning ticket
        if (ticketId == winnerTicket) {
            uint256 interest = _calculateInterest();
            amount += interest;
        }

        // Withdraw ETH from Aave
        iAaveV2.withdrawETH(LENDING_POOL_ADDRESS, amount, address(this));

        // Burn the ticket
        super._burn(ticketId);

        // Clear the bet if still in the betting period
        if (block.timestamp < bettingPeriodEndTimestamp) {
            bets[ticketId] = 0;
        }

        // Transfer the funds to the caller
        address payable caller = payable(msg.sender);
        caller.transfer(amount);

        // Emit the Withdrawal event
        emit Withdrawal(address(this), msg.sender, amount, ticketId);
    }

    /**
     * @dev Determines the winner of the prediction based on the closest guess to the actual Bitcoin price.
     * @return The ticket ID and the guess price of the winner.
     */
    function findWinner() external returns (uint256, uint256) {
        // Check if the lock-in period has ended
        require(block.timestamp > lockInPeriodEndsAt, "Bet has not ended");

        // Get the current ticket ID
        uint256 currentTicketId = getCurrentTokenId();
        require(currentTicketId > 0, "There are no users");

        // Get the target Bitcoin price from the price feed
        uint256 target = uint256(getBitcoinPrice()).div(10 ** 8);

        // Variables to store the closest guess and its ticket ID
        uint256 closestNumber;
        uint256 closestTicketId;

        // Calculate the initial minimum difference
        uint256 minDifference = absDiff(bets[0], target);

        // Iterate through all the bets and find the closest guess
        for (uint256 i = 1; i <= currentTicketId; i++) {
            uint256 currentUserBet = bets[i];
            if (currentUserBet != 0) {
                uint256 difference = absDiff(currentUserBet, target);
                if (difference < minDifference) {
                    minDifference = difference;
                    closestNumber = currentUserBet;
                    closestTicketId = i;
                }
            }
        }

        // Set the winner ticket ID
        winnerTicket = closestTicketId;

        // Emit the WinnerFound event
        emit WinnerFound(address(this), msg.sender, closestTicketId, closestNumber);

        // Return the winner ticket ID and guess price
        return (closestTicketId, closestNumber);
    }

    /**
     * @dev Calculates the interest earned by the contract from Aave.
     * @return The amount of interest earned.
     */
    function _calculateInterest() internal view returns (uint256) {
        // Get the Aave balance of the contract
        uint256 aaveBalanceOfMyContract = iAToken.balanceOf(address(this));

        // Get the total supply of tickets
        uint256 totalSupplyOfTickets = super.totalSupply();

        // Calculate the total value of tickets
        uint256 totalTicketValue = (totalSupplyOfTickets * stakeAmount);

        // only for testnets
        if (aaveBalanceOfMyContract < totalTicketValue) {
            return 0;
        }

        // Calculate the interest by subtracting the total ticket value from the Aave balance
        uint256 interest = aaveBalanceOfMyContract - totalTicketValue;
        return interest;
    }

    /**
     * @dev Gets the latest Bitcoin price from the Chainlink price feed.
     * @return The latest Bitcoin price in USD.
     */
    function getBitcoinPrice() public view returns (int256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return price;
    }

    /**
     * @dev Calculates the absolute difference between two numbers.
     * @param a The first number.
     * @param b The second number.
     * @return The absolute difference between the two numbers.
     */
    function absDiff(uint256 a, uint256 b) private pure returns (uint256) {
        return a > b ? a.sub(b) : b.sub(a);
    }

    /**
     * @dev Retrieves the address of the Aave lending pool.
     * @return The address of the Aave lending pool.
     */
    function getLendingPoolAddress() private view returns (address) {
        return lendingPoolAddressesProvider.getLendingPool();
    }

    /**
     * @dev Fallback function to receive Ether when the contract receives a direct transfer.
     */
    receive() external payable {}
}
