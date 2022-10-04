//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./Order.sol";
import "./OrderList.sol";
import "./OrderTypeEnum.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/// @dev Managing orders
contract OrderManager is OrderList {
    using SafeMath for uint;

    OrderType private immutable _orderType;
    address private owner;
    
    constructor(OrderType orderType) OrderList(orderType) {
        owner = msg.sender;
        _orderType = orderType;
    }

    //TODO extract to separate file
    struct DisplayOrder {
        uint id;
        uint price;
        uint amount;
    }
    function OrderToDisplay(Order memory order) private pure returns(DisplayOrder memory){
        return DisplayOrder({
            id: order.id,
            price: order.price,
            amount: order.amount
        });
    }
    




    function cancelOrder(uint _orderId) public returns(Order memory) {
        return finalizeOrder(_orderId);
    }

    function getTopOrders(uint _maxDispayOrders) public view returns(DisplayOrder[] memory){
        return topOrdersToDisplay(_maxDispayOrders, false);
    }
    
    function getMyOrders(uint _maxDispayOrders) public view returns(DisplayOrder[] memory){
        return topOrdersToDisplay(_maxDispayOrders, true);
    }

    function processOrder(uint _purchase) public returns(Order[] memory, uint, uint) {
        (Order[] memory executedOrders, uint amount, uint charge) = ordersToBeExecuted(_purchase);

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

    function calculatePurchaseTokensAmount(uint _purchase) public view returns(uint) {
        (, uint amount, ) = ordersToBeExecuted(_purchase);
        return amount;
    }

    function topOrdersToDisplay(
        uint _maxDispayOrders,
        bool _onlyMine
    ) private view returns(DisplayOrder[] memory){
        require(_maxDispayOrders > 0, "At least one order must be displayed");

        DisplayOrder[] memory displayOrders = new DisplayOrder[](_maxDispayOrders);
        Order memory order = getFirst();
        uint i = 0;
        if (!_onlyMine || order.user == msg.sender) {
            displayOrders[i++] = OrderToDisplay(order);
        }

        while(order.id != 0 && i < _maxDispayOrders){
            order = getNext(order);
            if (!_onlyMine || order.user == msg.sender) {
                displayOrders[i++] = OrderToDisplay(order);
            }
        }

        return displayOrders;
    }

    function finalizeOrder(uint _orderId) private returns(Order memory) {
        Order memory order = orders[_orderId];
        require (order.user == msg.sender || owner == msg.sender, 'You don''t have permissions to finalize this order');
        require (order.id == _orderId && _orderId != 0, 'There is no such a order');

        Order storage previous = orders[order.prev];
        Order storage next = orders[order.next];

        previous.next = next.id != 0 ? next.id : 0;
        next.prev = previous.id != 0 ? previous.id : 0;
        if (head == order.id) {
            head = next.id;
        }

        delete orders[_orderId];
        return order;
    }
    
    function ordersToBeExecuted(uint _purchasePrice) private view returns (Order[] memory, uint, uint) {
        Order memory order = getFirst();

        require(_purchasePrice > 0, _orderType == OrderType.ASC ? 'You can not buy tokens for 0 price' : 'You can not sell 0 tokens');
        require(order.id > 0 && order.price > 0 && order.amount > 0, 'There are no orders listed on the exchange');

        Order[] memory executedOrders = new Order[](idCounter - head + 1);
        uint orderIndex;
        uint _total;
        uint _purchaseChange = _purchasePrice;
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

    function calculateOrderPrice(uint _price, uint _amount) private pure returns (uint) {
        uint _orderPrice = _amount.mul(_price).div(1 ether);
        uint _orderPriceDecimal = _amount.mul(_price).mod(1 ether);
        _orderPrice = _orderPrice.add(_orderPriceDecimal);
        return _orderPrice;
    }

}