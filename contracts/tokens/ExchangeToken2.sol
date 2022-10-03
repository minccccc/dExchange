//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Standart ERC20 token
contract ExchangeToken2 is ERC20 {
    
    /// @notice Calling base ERC20 contract to premint 1000 EX2 tokens
    constructor() ERC20("ExchangeToken2", "EX2") {
        _mint(msg.sender, 1000 ether);
    }
}