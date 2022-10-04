//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./Order.sol";
import "./OrderTypeEnum.sol";

/// @dev Collect all orders sorted like in LinkedList
contract OrderList {

    OrderType private orderType;

    uint public head;
    uint public idCounter;
    mapping (uint => Order) public orders;
    
    // constructor(OrderType _orderType) {
    //     orderType = _orderType;
    // }

    function setOrderType(OrderType _orderType) public {
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

    function getFirst() internal view returns(Order memory) {
        return orders[head];
    }
    
    function getNext(Order memory order) internal view returns(Order memory) {
        return orders[order.next];
    }
    
    function getOrdersCount() public view returns (uint){
        return idCounter > 0 ? idCounter - 1 : 0;
    }

    function getOrder(uint _orderId) public view returns(Order memory) {
        Order memory order = orders[_orderId];
        require (order.id > 0, 'There is no such a order');
        return order;
    }
    
    function shoudAddOnTop(uint _newOrderPrice, uint _currentOrderPrice) private view returns (bool){
        if (_newOrderPrice <= _currentOrderPrice && orderType == OrderType.ASC) {
            return true;
        } else if (_newOrderPrice >= _currentOrderPrice && orderType == OrderType.DESC) {
            return true;
        }
        return false;
    }
    
    function shoudAddInBetween(
        uint _newOrderPrice, 
        uint _currentOrderPrice,
        uint _nextOrderPrice
    ) private view returns (bool){
        if (_newOrderPrice > _currentOrderPrice && _newOrderPrice <= _nextOrderPrice && orderType == OrderType.ASC) {
            return true;
        } else if (_newOrderPrice < _currentOrderPrice && _newOrderPrice >= _nextOrderPrice && orderType == OrderType.DESC) {
            return true;
        }
        return false;
    }
}