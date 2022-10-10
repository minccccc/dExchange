// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

library DExchangeLib {
    bytes32 constant DEXCHANGE_STORAGE_POSITION = keccak256("dexchange.storage");
        
    struct ListedToken {
        string name;
        string symbol;
        address tokenAddress;
        ERC20 tokenContract;
    }

    struct DExchangeStorage {
        mapping (address => ListedToken) listedTokens;
        address[] listedTokensArray;
        mapping (address => mapping ( address => uint)) tokenBalances;
    }

    function getStorage() internal pure returns (DExchangeStorage storage s) {
        bytes32 position = DEXCHANGE_STORAGE_POSITION;
        assembly {
            s.slot := position
        }
    }

    function getListedTokensArray() internal view returns (address[] memory) {
        return getStorage().listedTokensArray;
    }

    function getListedToken(address tokenAddress) internal view returns (ListedToken memory) {
        return getStorage().listedTokens[tokenAddress];
    }

    function getTokenBalance(address user, address tokenAddress) internal view returns (uint) {
        return getStorage().tokenBalances[user][tokenAddress];
    }
}

