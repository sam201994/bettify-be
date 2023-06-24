// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title MinimalProxy
 * @dev A minimal proxy contract that delegates all calls to a logic contract.
 */
contract MinimalProxy {
    address public logicContract;

    /**
     * @dev Initializes the MinimalProxy contract with the address of the logic contract.
     * @param _logicContract The address of the logic contract to which calls will be delegated.
     */
    constructor(address _logicContract) {
        logicContract = _logicContract;
    }

    /**
     * @dev Fallback function that delegates the call to the logic contract using delegatecall.
     * It forwards all calldata and returns any received data or reverts with an error message.
     */
    fallback() external payable {
        address target = logicContract;
        assembly {
            let ptr := mload(0x40)
            calldatacopy(ptr, 0, calldatasize())
            let result := delegatecall(gas(), target, ptr, calldatasize(), 0, 0)
            let size := returndatasize()
            returndatacopy(ptr, 0, size)

            switch result
            case 0 {
                revert(ptr, size)
            }
            default {
                return(ptr, size)
            }
        }
    }

    /**
     * @dev Receive function to accept and forward any incoming ether to the logic contract.
     */
    receive() external payable {}
}
