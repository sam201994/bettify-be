// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title Ticket
 * @dev A contract for minting and managing ERC721 tickets.
 */
contract Ticket is ERC721, ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    /**
     * @dev Initializes the Ticket contract with the name and symbol for the ERC721 token.
     */
    constructor() ERC721("Kite", "KITE") {}

    /**
     * @dev Mints a new ticket and assigns it to the specified address.
     * @param to The address to which the minted ticket will be assigned.
     * @return The ID of the minted ticket.
     */
    function mint(address to) internal returns (uint256) {
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        _safeMint(to, tokenId);
        return tokenId;
    }

    /**
     * @dev Retrieves the current token ID counter value.
     * @return The current token ID counter value.
     */

    function getCurrentTokenId() public view returns (uint256) {
        return _tokenIdCounter.current();
    }

    /**
     * @dev Hook function called before transferring tokens.
     * @param from The address from which the tokens are being transferred.
     * @param to The address to which the tokens are being transferred.
     * @param tokenId The ID of the token being transferred.
     * @param batchSize The number of tokens being transferred in a batch.
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    /**
     * @dev Returns true if the contract implements the specified interface.
     * @param interfaceId The interface identifier.
     * @return A boolean value indicating whether the contract implements the interface.
     */
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
