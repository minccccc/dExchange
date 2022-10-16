// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import { OrderListLib } from "../libraries/OrderListLib.sol";
import { DExchangeLib } from "../libraries/DExchangeLib.sol";
import { DiamondLib } from "../libraries/DiamondLib.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Manage tokens on the exchange
/// @dev Provide functions owner to be able to add new ERC20 compatible tokens on the exchange
contract TokenFactoryFacet {
    
    /// @dev Adds a new token address to the list of tokens on the exchange  
    /// @param token Address of the token contract
    function addToken(ERC20 token) external {
        //TODO: change with "revert error"
        require(DiamondLib.isContractOwner(), "Only the owner can add tokens into the exchange");
        require(address(token) != address(0), "Token address is empty");

        DExchangeLib.DExchangeStorage storage stg = DExchangeLib.getStorage();

        require(stg.listedTokens[address(token)].tokenAddress == address(0), "This token is already listed on the exchange");

        stg.listedTokens[address(token)] = DExchangeLib.ListedToken({
            name : token.name(),
            symbol : token.symbol(),
            tokenAddress : address(token),
            tokenContract : token
        });
        stg.listedTokensArray.push(address(token));

        OrderListLib.getBuyOrderList(address(token)).sortingOrder = OrderListLib.SortingOrderType.DESC;
        OrderListLib.getSellOrderList(address(token)).sortingOrder = OrderListLib.SortingOrderType.ASC;
    }

    /// @dev Returns all listed tokens ot the exchange
    function getListedTokens() external view returns (DExchangeLib.ListedToken[] memory) {

        address[] memory listedTokens = DExchangeLib.getListedTokensArray();
        DExchangeLib.ListedToken[] memory result = new DExchangeLib.ListedToken[](listedTokens.length);

        for (uint i = 0; i < listedTokens.length; i++) {
            result[i] = DExchangeLib.getListedToken(listedTokens[i]);
        }
        return result;
    }
}
