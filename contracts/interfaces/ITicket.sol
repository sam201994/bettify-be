// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ITicket {
    function ownerOf(uint256 tokenId) external view returns (address owner);

    function getCurrentTokenId() external returns (uint256 tokenId);

    function totalSupply() external view returns (uint256);
}
