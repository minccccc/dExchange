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

    // function getFirst() internal view returns(Order memory) {
    //     return getStorage().orders[getStorage().head];
    // }

    // function getNext(Order memory order) internal view returns(Order memory) {
    //     return getStorage().orders[order.next];
    // }
    
    // function getOrdersCount() internal view returns (uint){
    //     return getStorage().idCounter > 0 ? getStorage().idCounter - 1 : 0;
    // }

    // function getOrder(uint orderId) internal view returns(Order memory) {
    //     Order memory order = getStorage().orders[orderId];
    //     require (order.id > 0, 'There is no such a order');
    //     if (order.id == 0) {
    //         revert OrderNotFound(orderId);
    //     } else {
    //         return order;
    //     }
    // }
}

