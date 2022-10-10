// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import { Order } from "../common/Order.sol";
import { OrderListLib } from "../libraries/OrderListLib.sol";
import { DExchangeLib } from "../libraries/DExchangeLib.sol";
import { InputValidationGuard } from "../common/InputValidationGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract OrderFactoryFacet is InputValidationGuard {
    using SafeMath for uint;

    event BuyOrderPlaced(address indexed token, uint price, uint amount);
    event SellOrderPlaced(address indexed token, uint price, uint amount);
    
    /// @dev Add buy order to the order list
    /// @param tokenAddress Token to be bought
    /// @param price Price for a token in ETH
    /// @param tokenAmount Amount of tokens to be bought
    function placeBuyOrder(address tokenAddress, uint price, uint tokenAmount) external payable
            tokenToBeListed(tokenAddress)
            validOrderInput(price, tokenAmount) {

        uint eth = 1 ether;
        uint _orderPrice = tokenAmount.mul(price).div(eth);
        //to calculate order price properly
        uint _orderPriceDecimal = tokenAmount.mul(price).mod(eth);
        _orderPrice = _orderPrice.add(_orderPriceDecimal);

        require(msg.value >= _orderPrice , 'Insufficient ethers sent');

        OrderListLib.TokenOrderList storage orderList = OrderListLib.getBuyOrderList(tokenAddress);
        addOrder(orderList, msg.sender, price, tokenAmount);

        uint _change = msg.value - _orderPrice;
        if (_change > 0) {
            (bool success,)= payable(msg.sender).call{value: _change}("");
            require(success, 'Something went wrong');
        }

        emit BuyOrderPlaced(tokenAddress, price, tokenAmount);
    }


    /// @dev Add sell order to the order list
    /// @param tokenAddress Address ot the token to be sold
    /// @param price Price for a token in ETH
    /// @param tokenAmount Amount of tokens to be sold
    function placeSellOrder(address tokenAddress, uint price, uint tokenAmount) external
        tokenToBeListed(tokenAddress)
        enoughBalance(tokenAddress, tokenAmount)
        validOrderInput(price, tokenAmount)
    {
        OrderListLib.TokenOrderList storage orderList = OrderListLib.getSellOrderList(tokenAddress);   
        addOrder(orderList, msg.sender, price, tokenAmount);

        DExchangeLib.getStorage().tokenBalances[msg.sender][tokenAddress] -= tokenAmount;
        
        emit SellOrderPlaced(tokenAddress, price, tokenAmount);
    }

    function addOrder(
        OrderListLib.TokenOrderList storage orderList,
        address user,
        uint price,
        uint amount
    ) private {
        require(amount > 0, 'Can not trade 0 tokens');
        require(price > 0, 'Can not trade tokens for 0 price');

        uint linkPrev = 0;
        uint linkNext = 0;
        Order storage current = orderList.orders[orderList.head];

        if (current.id == 0 && current.prev == 0 && current.next == 0) {
            //First record
            orderList.head = 1;
            orderList.idCounter = 1;
        } else {
            while(true) {
                Order storage next  = orderList.orders[current.next];
                if (shoudAddOnTop(orderList.sortingOrder, price, current.price)) {
                    orderList.head = orderList.idCounter;
                    current.prev = orderList.head;
                    linkPrev = 0;
                    linkNext = current.id;
                    break;
                } else if (shoudAddInBetween(orderList.sortingOrder, price, current.price, next.price)) {
                    current.next = orderList.idCounter;
                    next.prev = orderList.idCounter;
                    linkPrev = current.id;
                    linkNext = next.id;
                    break;
                } else if (next.id == 0 && next.prev == 0 && next.next == 0) {
                    current.next = orderList.idCounter;
                    linkPrev = current.id;
                    linkNext = 0;
                    break;
                }
                
                current = next;
            }
        }

        orderList.orders[orderList.idCounter] = Order({
            id: orderList.idCounter,
            prev: linkPrev,
            next: linkNext,
            user : user,
            price : price,
            amount : amount
        });
        
        orderList.idCounter += 1;
    }


    function shoudAddOnTop(
        OrderListLib.SortingOrderType sortingOrder,
        uint newOrderPrice,
        uint currentOrderPrice
    ) private pure returns (bool){
        if (newOrderPrice <= currentOrderPrice && sortingOrder == OrderListLib.SortingOrderType.ASC) {
            return true;
        } else if (newOrderPrice >= currentOrderPrice && sortingOrder == OrderListLib.SortingOrderType.DESC) {
            return true;
        }
        return false;
    }
    
    function shoudAddInBetween(
        OrderListLib.SortingOrderType sortingOrder,
        uint newOrderPrice, 
        uint currentOrderPrice,
        uint nextOrderPrice
    ) private pure returns (bool){
        if (newOrderPrice > currentOrderPrice && newOrderPrice <= nextOrderPrice && sortingOrder == OrderListLib.SortingOrderType.ASC) {
            return true;
        } else if (newOrderPrice < currentOrderPrice && newOrderPrice >= nextOrderPrice && sortingOrder == OrderListLib.SortingOrderType.DESC) {
            return true;
        }
        return false;
    }

}
