// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import { Order } from "../common/Order.sol";

library OrderListLib {
    bytes32 constant ORDER_LIST_STORAGE_POSITION = keccak256("order.list.storage");
    
    /// @notice Enum with possible Orders sorting options
    enum SortingOrderType { ASC, DESC }    
    
    struct TokenOrderList {
        uint head;
        uint idCounter;
        SortingOrderType sortingOrder;
        mapping (uint => Order) orders;
    }

    struct OrderListStorage {
        mapping (address => TokenOrderList) buyOrders;
        mapping (address => TokenOrderList) sellOrders;
    }

    function getStorage() private pure returns (OrderListStorage storage s) {
        bytes32 position = ORDER_LIST_STORAGE_POSITION;
        assembly {
            s.slot := position
        }
    }

    function getBuyOrderList(address tokenAddress) internal view returns (TokenOrderList storage) {
        return getStorage().buyOrders[tokenAddress];
    }

    function getSellOrderList(address tokenAddress) internal view returns (TokenOrderList storage) {
        return getStorage().sellOrders[tokenAddress];
    }

}

