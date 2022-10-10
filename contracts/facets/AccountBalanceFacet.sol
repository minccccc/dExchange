// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import { DExchangeLib } from "../libraries/DExchangeLib.sol";

/// @notice Returns information about token balances
contract AccountBalanceFacet {
    
    struct Balance {
        address tokenAddress;
        uint wallet;
        uint exchange;
    }

    /// @dev Returns balance of all listed tokens (on exchange and on wallet) 
    /// for current user
    function getMyBalance() external view returns (Balance[] memory) {
        address[] memory listedTokens = DExchangeLib.getListedTokensArray();
        Balance[] memory result = new Balance[](listedTokens.length);

        for (uint i = 0; i < listedTokens.length; i++) {
            result[i] = Balance({
                tokenAddress : listedTokens[i],
                wallet : DExchangeLib.getListedToken(listedTokens[i]).tokenContract.balanceOf(msg.sender),
                exchange : DExchangeLib.getTokenBalance(msg.sender, listedTokens[i])
            });
        }
        
        return result;
    }

    /// @dev Returns token balance for current user
    /// @param tokenAddress Token address to check the balance
    function checkBalance(address tokenAddress) external view returns(uint) {
        return DExchangeLib.getTokenBalance(msg.sender, tokenAddress);
    }
}
