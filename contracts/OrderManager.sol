//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./common/Order.sol";
import "./common/DisplayOrder.sol";
import "./OrderList.sol";
import "./common/OrderTypeEnum.sol";
import "./interfaces/IOrderManager.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract OrderManager is IOrderManager, OrderList {
    using SafeMath for uint;

    OrderType private immutable _orderType;
    address private owner;
    
    constructor(OrderType orderType) OrderList(orderType) {
        owner = msg.sender;
        _orderType = orderType;
    }

    function processOrder(uint purchase) public returns(Order[] memory, uint, uint) {
        (Order[] memory executedOrders, uint amount, uint charge) = ordersToBeExecuted(purchase);

        for (uint256 i = 0; i < executedOrders.length; i++) {
            Order memory executedOrder = executedOrders[i];

            if (executedOrder.id == 0) {
                break;
            }

            Order storage storedOrder = orders[executedOrder.id];
            if (executedOrder.amount == storedOrder.amount) {
                //whole order is executed
                finalizeOrder(executedOrder.id);
            } else {
                //last not fully executed order
                storedOrder.amount = storedOrder.amount.sub(executedOrder.amount);
            }
        }

        return (executedOrders, amount, charge);
    }

    function cancelOrder(uint orderId) public returns(Order memory) {
        return finalizeOrder(orderId);
    }

    function calculatePurchaseTokensAmount(uint purchase) public view returns(uint) {
        (, uint amount, ) = ordersToBeExecuted(purchase);
        return amount;
    }

    function getTopOrders(uint maxDispayOrders) public view returns(DisplayOrder[] memory){
        return topOrdersToDisplay(maxDispayOrders, false);
    }
    
    function getMyOrders(uint maxDispayOrders) public view returns(DisplayOrder[] memory){
        return topOrdersToDisplay(maxDispayOrders, true);
    }


    function topOrdersToDisplay(
        uint maxDispayOrders,
        bool onlyMine
    ) private view returns(DisplayOrder[] memory){
        require(maxDispayOrders > 0, "At least one order must be displayed");

        DisplayOrder[] memory displayOrders = new DisplayOrder[](maxDispayOrders);
        Order memory order = getFirst();
        uint i = 0;
        if (!onlyMine || order.user == msg.sender) {
            displayOrders[i++] = orderToDisplay(order);
        }

        while(order.id != 0 && i < maxDispayOrders){
            order = getNext(order);
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

    function finalizeOrder(uint orderId) private returns(Order memory) {
        Order memory order = orders[orderId];
        require (order.user == msg.sender || owner == msg.sender, 'You don''t have permissions to finalize this order');
        require (order.id == orderId && orderId != 0, 'There is no such a order');

        Order storage previous = orders[order.prev];
        Order storage next = orders[order.next];

        previous.next = next.id != 0 ? next.id : 0;
        next.prev = previous.id != 0 ? previous.id : 0;
        if (head == order.id) {
            head = next.id;
        }

        delete orders[orderId];
        return order;
    }
    
    function ordersToBeExecuted(uint purchasePrice) private view returns (Order[] memory, uint, uint) {
        Order memory order = getFirst();

        require(purchasePrice > 0, _orderType == OrderType.ASC ? 'You can not buy tokens for 0 price' : 'You can not sell 0 tokens');
        require(order.id > 0 && order.price > 0 && order.amount > 0, 'There are no orders listed on the exchange');

        Order[] memory executedOrders = new Order[](idCounter - head + 1);
        uint orderIndex;
        uint _total;
        uint _purchaseChange = purchasePrice;
        uint currentOrderPrice;
        while(true) {
            if (orderIndex > 0){
                order = getNext(order);
            }

            if (order.id == 0) {
                break;
            }

            currentOrderPrice = calculateOrderPrice(order.price, order.amount);
            if (_orderType == OrderType.ASC && currentOrderPrice >= _purchaseChange) {
                order.amount = _purchaseChange.mul(1 ether).div(order.price);
                executedOrders[orderIndex++] = order;
                uint price = order.amount.mul(order.price).div(1 ether); 
                assert (price >= _purchaseChange);
                return (executedOrders, _total + order.amount, price - _purchaseChange);
            } else if (_orderType == OrderType.DESC && order.amount >= _purchaseChange) {
                uint price = _purchaseChange.mul(order.price).div(1 ether);
                order.amount = _purchaseChange;
                executedOrders[orderIndex++] = order;
                return (executedOrders, _total + price, 0);
            } else {
                _total += _orderType == OrderType.ASC ? order.amount : order.price.mul(order.amount).div(1 ether);
                _purchaseChange -= _orderType == OrderType.ASC ? currentOrderPrice : order.amount;
                
                executedOrders[orderIndex++] = order;
                assert(_purchaseChange >= 0);
            }
        }
        revert('There are not enough tokens on the exchange');
    }

    function calculateOrderPrice(uint price, uint amount) private pure returns (uint) {
        uint _orderPrice = amount.mul(price).div(1 ether);
        uint _orderPriceDecimal = amount.mul(price).mod(1 ether);
        _orderPrice = _orderPrice.add(_orderPriceDecimal);
        return _orderPrice;
    }

}