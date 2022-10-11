// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import { Order } from "../common/Order.sol";
import { OrderListLib } from "../libraries/OrderListLib.sol";

contract DisplayOrdersFacet {
    /// @notice Order presentation model for clients
    /// @param id Id of the order
    /// @param price Price per token in ETH
    /// @param amount Amount of tokens in the order
    struct DisplayOrder {
        uint id;
        uint price;
        uint amount;
    }

    /// @dev Returns sorted DisplayOrder list of the top/first buy orders to be executed
    /// @param tokenAddress Specifies token address
    /// @param maxDispayOrders Define number of orders to be returned
    function getTopBuyOrders(address tokenAddress, uint maxDispayOrders) external view returns(DisplayOrder[] memory){
        OrderListLib.TokenOrderList storage orderList = OrderListLib.getBuyOrderList(tokenAddress);
        return topOrdersToDisplay(orderList, maxDispayOrders, false);
    }
    
    /// @dev Returns sorted DisplayOrder list with sell orders from the caller
    /// @param tokenAddress Specifies token address
    /// @param maxDispayOrders Define number of orders to be returned
    function getMyBuyOrders(address tokenAddress, uint maxDispayOrders) external view returns(DisplayOrder[] memory){
        OrderListLib.TokenOrderList storage orderList = OrderListLib.getBuyOrderList(tokenAddress);
        return topOrdersToDisplay(orderList, maxDispayOrders, true);
    }

    /// @dev Returns sorted DisplayOrder list of the top/first sell orders to be executed
    /// @param tokenAddress Specifies token address
    /// @param maxDispayOrders Define number of orders to be returned
    function getTopSellOrders(address tokenAddress, uint maxDispayOrders) external view returns(DisplayOrder[] memory){
        OrderListLib.TokenOrderList storage orderList = OrderListLib.getSellOrderList(tokenAddress);
        return topOrdersToDisplay(orderList, maxDispayOrders, false);
    }
    
    /// @dev Returns sorted DisplayOrder list with sell orders from the caller
    /// @param tokenAddress Specifies token address
    /// @param maxDispayOrders Define number of orders to be returned
    function getMySellOrders(address tokenAddress, uint maxDispayOrders) external view returns(DisplayOrder[] memory){
        OrderListLib.TokenOrderList storage orderList = OrderListLib.getSellOrderList(tokenAddress);
        return topOrdersToDisplay(orderList, maxDispayOrders, true);
    }

    function topOrdersToDisplay(
        OrderListLib.TokenOrderList storage orderList,
        uint maxDispayOrders,
        bool onlyMine
    ) private view returns(DisplayOrder[] memory){
        require(maxDispayOrders > 0, "At least one order must be displayed");

        DisplayOrder[] memory displayOrders = new DisplayOrder[](maxDispayOrders);
        Order memory order = orderList.orders[orderList.head];
        uint i = 0;
        if (!onlyMine || order.user == msg.sender) {
            displayOrders[i++] = orderToDisplay(order);
        }

        while(order.id != 0 && i < maxDispayOrders){
            order = orderList.orders[order.next];
            if (!onlyMine || order.user == msg.sender) {
                displayOrders[i++] = orderToDisplay(order);
            }
        }

        return displayOrders;
    }

    function orderToDisplay(Order memory order) private pure returns(DisplayOrder memory){
        return DisplayOrder({
            id: order.id,
            price: order.price,
            amount: order.amount
        });
    }

}
