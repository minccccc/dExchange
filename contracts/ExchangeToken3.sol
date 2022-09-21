//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ExchangeToken3 is ERC20 {
    constructor() ERC20("ExchangeToken3", "EX3") {
        _mint(msg.sender, 1000 ether);
    }
}