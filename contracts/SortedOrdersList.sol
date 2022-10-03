//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract SortedOrdersList {
    using SafeMath for uint;

    struct Order {
        uint id;
        uint prev;
        uint next;
        address user;
        uint price;
        uint amount;
    }    
    struct DisplayOrder {
        uint id;
        uint price;
        uint amount;
    }
    enum OrderType { ASC, DESC }

    address private owner;
    OrderType private orderType;
    uint private head;
    uint private idCounter;
    mapping (uint => Order) private orders;

    constructor(OrderType _orderType) {
        owner = msg.sender;
        orderType = _orderType;
    }

    function addOrder(address _user, uint _price, uint _amount) public {
        require(_amount > 0, 'Can not trade 0 tokens');
        require(_price > 0, 'Can not trade tokens for 0 price');

        uint linkPrev = 0;
        uint linkNext = 0;
        Order storage current = orders[head];

        if (current.id == 0 && current.prev == 0 && current.next == 0) {
            //First record
            head = 1;
            idCounter = 1;
        } else {
            while(true) {
                Order storage next  = orders[current.next];
                if (shoudAddOnTop(_price, current.price)) {
                    head = idCounter;
                    current.prev = head;
                    linkPrev = 0;
                    linkNext = current.id;
                    break;
                } else if (shoudAddInBetween(_price, current.price, next.price)) {
                    current.next = idCounter;
                    next.prev = idCounter;
                    linkPrev = current.id;
                    linkNext = next.id;
                    break;
                } else if (next.id == 0 && next.prev == 0 && next.next == 0) {
                    current.next = idCounter;
                    linkPrev = current.id;
                    linkNext = 0;
                    break;
                }
                
                current = next;
            }
        }

        orders[idCounter] = Order({
            id: idCounter,
            prev: linkPrev,
            next: linkNext,
            user : _user,
            price : _price,
            amount : _amount
        });
        
        idCounter += 1;
    }

    function getOrdersCount() private view returns (uint){
        return idCounter > 0 ? idCounter - 1 : 0;
    }

    function getOrder(uint _orderId) public view returns(Order memory) {
        Order memory order = orders[_orderId];
        require (order.user == msg.sender || owner == msg.sender, 'You don''t have permissions to cancel this order');
        require (order.id == _orderId, 'There is no such a order');
        return order;
    }

    function getFirst() private view returns(Order memory) {
        return orders[head];
    }
    
    function getNext(Order memory order) private view returns(Order memory) {
        return orders[order.next];
    }

    function cancelOrder(uint _orderId) public returns(Order memory) {
        return finalizeOrder(_orderId);
    }

    function getTopOrders(uint _maxDispayOrders) public view returns(DisplayOrder[] memory){
        DisplayOrder[] memory displayOrders = new DisplayOrder[](_maxDispayOrders);
        Order memory order = getFirst();
        displayOrders[0] = OrderToDisplay(order);

        for (uint i = 1; i < _maxDispayOrders; i++) {
            order = getNext(order);
            if(order.id == 0) {
                break;
            }
            displayOrders[i] = OrderToDisplay(order);
        }

        return displayOrders;
    }

    function getMyOrders(uint _maxDispayOrders) public view returns(DisplayOrder[] memory){
        DisplayOrder[] memory displayOrders = new DisplayOrder[](_maxDispayOrders);
        Order memory order = getFirst();
        if (order.user == msg.sender) {
            displayOrders[0] = OrderToDisplay(order);
        }

        uint i = 1;
        while(order.id == 0 && i < _maxDispayOrders){
            order = getNext(order);
            if (order.user == msg.sender) {
                displayOrders[i++] = OrderToDisplay(order);
            }
        }

        return displayOrders;
    }

    function shoudAddOnTop(uint _newOrderPrice, uint _currentOrderPrice) private view returns (bool){
        if (_newOrderPrice <= _currentOrderPrice && orderType == OrderType.ASC) {
            return true;
        } else if (_newOrderPrice >= _currentOrderPrice && orderType == OrderType.DESC) {
            return true;
        }
        return false;
    }
    
    function shoudAddInBetween(uint _newOrderPrice, uint _currentOrderPrice, uint _nextOrderPrice) private view returns (bool){
        if (_newOrderPrice > _currentOrderPrice && _newOrderPrice <= _nextOrderPrice && orderType == OrderType.ASC) {
            return true;
        } else if (_newOrderPrice < _currentOrderPrice && _newOrderPrice >= _nextOrderPrice && orderType == OrderType.DESC) {
            return true;
        }
        return false;
    }

    function OrderToDisplay(Order memory order) private pure returns(DisplayOrder memory){
        return DisplayOrder({
            id: order.id,
            price: order.price,
            amount: order.amount
        });
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
    
    function ordersToBeExecuted(uint _purchasePrice) private view returns (Order[] memory, uint, uint) {
        Order memory order = getFirst();

        require(_purchasePrice > 0, orderType == OrderType.ASC ? 'You can not buy tokens for 0 price' : 'You can not sell 0 tokens');
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
            if (orderType == OrderType.ASC && currentOrderPrice >= _purchaseChange) {
                order.amount = _purchaseChange.mul(1 ether).div(order.price);
                executedOrders[orderIndex++] = order;
                uint price = order.amount.mul(order.price).div(1 ether); 
                assert (price >= _purchaseChange);
                return (executedOrders, _total + order.amount, price - _purchaseChange);
            } else if (orderType == OrderType.DESC && order.amount >= _purchaseChange) {
                uint price = _purchaseChange.mul(order.price).div(1 ether);
                order.amount = _purchaseChange;
                executedOrders[orderIndex++] = order;
                return (executedOrders, _total + price, 0);
            } else {
                _total += orderType == OrderType.ASC ? order.amount : order.price.mul(order.amount).div(1 ether);
                _purchaseChange -= orderType == OrderType.ASC ? currentOrderPrice : order.amount;
                
                executedOrders[orderIndex++] = order;
                assert(_purchaseChange >= 0);
            }
        }
        revert('There are not enough tokens on the exchange');
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

    function calculateOrderPrice(uint _price, uint _amount) private pure returns (uint) {
        uint _orderPrice = _amount.mul(_price).div(1 ether);
        uint _orderPriceDecimal = _amount.mul(_price).mod(1 ether);
        _orderPrice = _orderPrice.add(_orderPriceDecimal);
        return _orderPrice;
    } 
}
