//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./common/Order.sol";
import "./common/OrderTypeEnum.sol";
import "./interfaces/IOrderList.sol";

/// @dev Iterable orders list structured like LinkedList
contract OrderList is IOrderList {

    OrderType private immutable _orderType;

    uint public head;
    uint public idCounter;
    mapping (uint => Order) public orders;
    
    constructor(OrderType orderType) {
        _orderType = orderType;
    }

    function addOrder(
        address user,
        uint price,
        uint amount
    ) public {
        require(amount > 0, 'Can not trade 0 tokens');
        require(price > 0, 'Can not trade tokens for 0 price');

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
                if (shoudAddOnTop(price, current.price)) {
                    head = idCounter;
                    current.prev = head;
                    linkPrev = 0;
                    linkNext = current.id;
                    break;
                } else if (shoudAddInBetween(price, current.price, next.price)) {
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
            user : user,
            price : price,
            amount : amount
        });
        
        idCounter += 1;
    }

    function getFirst() public view returns(Order memory) {
        return orders[head];
    }
    
    function getNext(Order memory order) public view returns(Order memory) {
        return orders[order.next];
    }
    
    function getOrdersCount() public view returns (uint){
        return idCounter > 0 ? idCounter - 1 : 0;
    }

    function getOrder(uint orderId) public view returns(Order memory) {
        Order memory order = orders[orderId];
        require (order.id > 0, 'There is no such a order');
        return order;
    }
    
    function shoudAddOnTop(
        uint newOrderPrice,
        uint currentOrderPrice
    ) private view returns (bool){
        if (newOrderPrice <= currentOrderPrice && _orderType == OrderType.ASC) {
            return true;
        } else if (newOrderPrice >= currentOrderPrice && _orderType == OrderType.DESC) {
            return true;
        }
        return false;
    }
    
    function shoudAddInBetween(
        uint newOrderPrice, 
        uint currentOrderPrice,
        uint nextOrderPrice
    ) private view returns (bool){
        if (newOrderPrice > currentOrderPrice && newOrderPrice <= nextOrderPrice && _orderType == OrderType.ASC) {
            return true;
        } else if (newOrderPrice < currentOrderPrice && newOrderPrice >= nextOrderPrice && _orderType == OrderType.DESC) {
            return true;
        }
        return false;
    }
}