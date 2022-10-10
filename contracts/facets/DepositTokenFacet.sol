// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import { DExchangeLib } from "../libraries/DExchangeLib.sol";
import { InputValidationGuard } from "../common/InputValidationGuard.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @notice Deposit ERC20 tokens to the exchange
contract DepositTokenFacet is InputValidationGuard, ReentrancyGuard {
    
    event TokensDeposited(address indexed account, address indexed token, uint amount);
    
    /// @dev Deposit tokens from users wallet
    /// @notice To be able to call "transferFrom" the user have to accept this transfer in advance
    /// @param tokenAddress Token address
    /// @param tokenAmount Amount to be deposited
    function deposit(address tokenAddress, uint tokenAmount) external 
        nonReentrant()
        tokenToBeListed(tokenAddress)
    {
        DExchangeLib.DExchangeStorage storage stg = DExchangeLib.getStorage();

        stg.tokenBalances[msg.sender][tokenAddress] += tokenAmount;       
        stg.listedTokens[tokenAddress].tokenContract.transferFrom(msg.sender, address(this), tokenAmount);
        
        emit TokensDeposited(msg.sender, tokenAddress, tokenAmount);
    }
}
