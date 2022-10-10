// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import { DExchangeLib } from "../libraries/DExchangeLib.sol";
import { InputValidationGuard } from "../common/InputValidationGuard.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @notice Withdraw ERC20 tokens from the exchange
contract WithdrawTokenFacet is InputValidationGuard, ReentrancyGuard{

    event Withdrawn( address indexed account, address indexed token, uint amount);
    
    /// @dev Withdraw tokens to the users wallet
    /// @param tokenAddress Token address
    /// @param tokenAmount Amount to be withdrawn
    function withdraw(address tokenAddress, uint tokenAmount) external 
        nonReentrant()
        tokenToBeListed(tokenAddress)
        enoughBalance(tokenAddress, tokenAmount)
    {
        DExchangeLib.DExchangeStorage storage stg = DExchangeLib.getStorage();

        stg.tokenBalances[msg.sender][tokenAddress] -= tokenAmount;
        stg.listedTokens[tokenAddress].tokenContract.transfer(msg.sender, tokenAmount);

        emit Withdrawn(msg.sender, tokenAddress, tokenAmount);
    }
}
