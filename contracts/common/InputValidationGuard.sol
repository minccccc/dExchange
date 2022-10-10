// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import { DExchangeLib } from "../libraries/DExchangeLib.sol";

abstract contract InputValidationGuard {

    /// @notice Validate that the token is listed on the exchange
    modifier tokenToBeListed(address tokenAddress) {
        require(DExchangeLib.getListedToken(tokenAddress).tokenAddress != address(0), 
            "This token is not listed on the exchange");
        _;
    }

    /// @notice Validate caller has sufficient token balanace on the exchange
    modifier enoughBalance(address tokenAddress, uint amount) {
        uint balance = DExchangeLib.getTokenBalance(msg.sender, tokenAddress);
        require(balance >= amount, "Insufficient balance");
        _;
    }

    /// @notice Validate input fields are positive numbers
    modifier validOrderInput(uint price, uint tokenAmount) {
        require(tokenAmount > 0, 'Order token amount can not be 0');
        require(price > 0, 'Order price can not be 0');
        _;
    }
}

