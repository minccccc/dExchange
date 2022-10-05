//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "../common/Order.sol";
import "../common/DisplayOrder.sol";

interface IOrderList {
    function addOrder(address user, uint price, uint amount) external;

    function getFirst() external view returns(Order memory);

    function getNext(Order memory order) external view returns(Order memory);

    function getOrdersCount() external view returns (uint);

    function getOrder(uint orderId) external view returns(Order memory);
}