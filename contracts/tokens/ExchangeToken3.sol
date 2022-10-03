//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Standart ERC20 token
contract ExchangeToken3 is ERC20 {
    
    /// @notice Calling base ERC20 contract to premint 1000 EX3 tokens
    constructor() ERC20("ExchangeToken3", "EX3") {
        _mint(msg.sender, 1000 ether);
    }
}