//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ExchangeToken2 is ERC20 {
    constructor() ERC20("ExchangeToken2", "EX2") {
        _mint(msg.sender, 1000 ether);
    }
}