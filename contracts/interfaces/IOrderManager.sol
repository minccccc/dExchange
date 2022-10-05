//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "../common/Order.sol";
import "../common/DisplayOrder.sol";
import "./IOrderList.sol";

interface IOrderManager is IOrderList {
    function processOrder(uint purchase) external returns(Order[] memory, uint, uint);

    function cancelOrder(uint orderId) external returns(Order memory);

    function calculatePurchaseTokensAmount(uint purchase) external view returns(uint);

    function getTopOrders(uint maxDispayOrders) external view returns(DisplayOrder[] memory);

    function getMyOrders(uint maxDispayOrders) external view returns(DisplayOrder[] memory);
}