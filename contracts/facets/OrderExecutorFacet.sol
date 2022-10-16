// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import { Order } from "../common/Order.sol";
import { OrderListLib } from "../libraries/OrderListLib.sol";
import { DExchangeLib } from "../libraries/DExchangeLib.sol";
import { DiamondLib } from "../libraries/DiamondLib.sol";
import { InputValidationGuard } from "../common/InputValidationGuard.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "hardhat/console.sol";

error NotEnoughTokensOnExchange();

contract OrderExecutorFacet is InputValidationGuard, ReentrancyGuard {
    using SafeMath for uint;

    event OrderCanceled(address indexed token, uint orderId);
    event TokensPurchased(address indexed account, address indexed token, uint price, uint amount);
    event TokensSold(address indexed account, address indexed token, uint price, uint amount);
        
    /// @dev Remove buy order
    /// @param tokenAddress Order token address
    /// @param orderId Id ot the order
    function cancelBuyOrder(address tokenAddress, uint orderId) external tokenToBeListed(tokenAddress) {
        
        OrderListLib.TokenOrderList storage orderList = OrderListLib.getBuyOrderList(tokenAddress);
        Order memory order = cancelOrder(orderList, orderId);
                
        uint _orderPrice = order.amount.mul(order.price).div(1 ether);
        (bool success,)= payable(order.user).call{value: _orderPrice}("");
        require(success, 'Something went wrong');

        emit OrderCanceled(tokenAddress, orderId);
    }

    /// @dev Remove sell order
    /// @param tokenAddress Order token address
    /// @param orderId Id ot the order
    function cancelSellOrder(address tokenAddress, uint orderId) external tokenToBeListed(tokenAddress) {

        OrderListLib.TokenOrderList storage orderList = OrderListLib.getSellOrderList(tokenAddress);
        DExchangeLib.DExchangeStorage storage stg = DExchangeLib.getStorage();
        
        Order memory order = cancelOrder(orderList, orderId);
        stg.tokenBalances[order.user][tokenAddress] += order.amount;

        emit OrderCanceled(tokenAddress, orderId);
    }

    /// @dev Calculate how many tokens the user can buy
    /// @param tokenAddress Token address
    /// @param purchasePrice The amount in ETH for the purchase
    /// @return Amount of tokens the user can buy at the moment for the specified amount ot ETH
    function calculateBuyTokensAmount(address tokenAddress, uint purchasePrice) external view
        tokenToBeListed(tokenAddress) returns(uint)
    {
        OrderListLib.TokenOrderList storage orderList = OrderListLib.getSellOrderList(tokenAddress);
        return calculatePurchaseTokensAmount(orderList, purchasePrice);
    }

    /// @dev Calculate how many tokens the user can sell
    /// @param tokenAddress Token address
    /// @param purchaseAmount Amount of tokens to be sell
    /// @return Amount of ETHs the user can get at the moment if sell the tokens
    function calculateSellTokensPrice(address tokenAddress, uint purchaseAmount) external view
        tokenToBeListed(tokenAddress) returns(uint)
    {
        OrderListLib.TokenOrderList storage orderList = OrderListLib.getBuyOrderList(tokenAddress);
        return calculatePurchaseTokensAmount(orderList, purchaseAmount);
    }

    /// @notice Buy tokens (market buy) and if any charge send it back to the user
    ///         Will send the ETHs for each executed order to the resposible seller.
    /// @dev The amount of tokens will be calculated based on ETH send to the function
    /// @param tokenAddress Token address
    function buyTokens(address tokenAddress) external payable
        nonReentrant()
        tokenToBeListed(tokenAddress)
    {
        require(msg.value > 0, "Purchase price can not be 0");

        OrderListLib.TokenOrderList storage orderList = OrderListLib.getSellOrderList(tokenAddress);
        (Order[] memory executedOrders, uint amount, uint charge) = processOrder(orderList, msg.value);

        require(executedOrders.length > 0, "There is not executed order");
        
        DExchangeLib.DExchangeStorage storage stg = DExchangeLib.getStorage();
        stg.tokenBalances[msg.sender][tokenAddress] += amount;

        for (uint i = 0; i < executedOrders.length; i++) {
            Order memory order = executedOrders[i];

            if (order.id != 0 && order.user != address(0)) {
                uint ethToSend = order.price.mul(order.amount).div(1 ether);
                (bool sent, ) = order.user.call{value: ethToSend}("");
                require(sent, "Failed to send Ether to the seller");
            }
        }

        if (charge > 0) {
            (bool success,)= payable(msg.sender).call{value: charge}("");
            require(success, 'Failed to send charge to the buyer');
        }

        emit TokensPurchased(msg.sender, tokenAddress, msg.value - charge, amount);
    }

    /// @notice Sell tokens (market sell), the amount of ETH from the sale will be send to the user
    ///         address and sold tokens will be splitter between executed buy orders (on the exchange)
    /// @param tokenAddress Token address
    /// @param tokenAddress Amount of tokens to be sold
    function sellTokens(address tokenAddress, uint tokenAmount) external 
        nonReentrant() 
        enoughBalance(tokenAddress, tokenAmount)
        tokenToBeListed(tokenAddress)
    {
        require(tokenAmount > 0, "Can not sell 0 tokens");
        OrderListLib.TokenOrderList storage orderList = OrderListLib.getBuyOrderList(tokenAddress);
        (Order[] memory executedOrders, uint amount,) = processOrder(orderList, tokenAmount);

        require(executedOrders.length > 0, "There is no executed order");
        
        DExchangeLib.DExchangeStorage storage stg = DExchangeLib.getStorage();
        stg.tokenBalances[msg.sender][tokenAddress] -= tokenAmount;

        uint purchasePrice = 0;
        for (uint i = 0; i < executedOrders.length; i++) {
            Order memory order = executedOrders[i];
            purchasePrice += order.price.mul(order.amount).div(1 ether);
            stg.tokenBalances[order.user][tokenAddress] += amount;
        }
        (bool sent, ) = payable(msg.sender).call{value: purchasePrice}("");
        require(sent, "Failed to send Ether to the seller");

        emit TokensSold(msg.sender, tokenAddress, purchasePrice, tokenAmount);
    }

    function processOrder(OrderListLib.TokenOrderList storage orderList, uint purchase) private returns(Order[] memory, uint, uint) {
        (Order[] memory executedOrders, uint amount, uint charge) = ordersToBeExecuted(orderList, purchase);

        for (uint256 i = 0; i < executedOrders.length; i++) {
            Order memory executedOrder = executedOrders[i];

            if (executedOrder.id == 0) {
                break;
            }

            Order storage storedOrder = orderList.orders[executedOrder.id];
            if (executedOrder.amount == storedOrder.amount) {
                //whole order is executed
                finalizeOrder(orderList, executedOrder.id);
            } else {
                //last not fully executed order
                assert(storedOrder.amount >= executedOrder.amount);
                storedOrder.amount = storedOrder.amount.sub(executedOrder.amount);
            }
        }

        return (executedOrders, amount, charge);
    }

    function cancelOrder(OrderListLib.TokenOrderList storage orderList, uint orderId) private returns(Order memory) {
        Order memory order = orderList.orders[orderId];
        require (order.id == 0 || order.user == msg.sender || DiamondLib.isContractOwner(), 'You don''t have permissions to finalize this order');
        
        return finalizeOrder(orderList, orderId);
    }

    function calculatePurchaseTokensAmount(OrderListLib.TokenOrderList storage orderList, uint purchase) private view returns(uint) {
        (, uint amount, ) = ordersToBeExecuted(orderList, purchase);
        return amount;
    }

    function finalizeOrder(OrderListLib.TokenOrderList storage orderList, uint orderId) private returns(Order memory) {

        Order memory order = orderList.orders[orderId];
        require (order.id == orderId && orderId != 0, 'There is no such a order');

        Order storage previous = orderList.orders[order.prev];
        Order storage next = orderList.orders[order.next];

        previous.next = next.id != 0 ? next.id : 0;
        next.prev = previous.id != 0 ? previous.id : 0;
        if (orderList.head == order.id) {
            orderList.head = next.id;
        }

        delete orderList.orders[orderId];
        return order;
    }
    
    function ordersToBeExecuted(OrderListLib.TokenOrderList storage orderList, uint purchasePrice) private view returns (Order[] memory, uint, uint) {
        //get first order (head)
        Order memory order = orderList.orders[orderList.head];

        require(purchasePrice > 0, orderList.sortingOrder == OrderListLib.SortingOrderType.ASC ? 'You can not buy tokens for 0 price' : 'You can not sell 0 tokens');
        require(order.id > 0 && order.price > 0 && order.amount > 0, 'There are no orders listed on the exchange');

        Order[] memory executedOrders = new Order[](orderList.idCounter - orderList.head + 1);
        uint orderIndex;
        uint _total;
        uint _purchaseChange = purchasePrice;
        uint currentOrderPrice;
        while(true) {
            if (orderIndex > 0){
                //get next
                order = orderList.orders[order.next];
            }

            if (order.id == 0) {
                break;
            }

            currentOrderPrice = calculateOrderPrice(order.price, order.amount);
            if (orderList.sortingOrder == OrderListLib.SortingOrderType.ASC && currentOrderPrice >= _purchaseChange) {
                order.amount = _purchaseChange.mul(1 ether).div(order.price);
                executedOrders[orderIndex++] = order;
                uint price = order.amount.mul(order.price).div(1 ether); 
                assert (price >= _purchaseChange);
                return (executedOrders, _total + order.amount, price - _purchaseChange);
            } else if (orderList.sortingOrder == OrderListLib.SortingOrderType.DESC && order.amount >= _purchaseChange) {
                uint price = _purchaseChange.mul(order.price).div(1 ether);
                order.amount = _purchaseChange;
                executedOrders[orderIndex++] = order;
                return (executedOrders, _total + price, 0);
            } else {
                _total += orderList.sortingOrder == OrderListLib.SortingOrderType.ASC ? order.amount : order.price.mul(order.amount).div(1 ether);
                _purchaseChange -= orderList.sortingOrder == OrderListLib.SortingOrderType.ASC ? currentOrderPrice : order.amount;
                
                executedOrders[orderIndex++] = order;
                assert(_purchaseChange >= 0);
            }
        }

        revert NotEnoughTokensOnExchange();
    }

    function calculateOrderPrice(uint price, uint amount) private pure returns (uint) {
        uint _orderPrice = amount.mul(price).div(1 ether);
        uint _orderPriceDecimal = amount.mul(price).mod(1 ether);
        _orderPrice = _orderPrice.add(_orderPriceDecimal);
        return _orderPrice;
    }
    
}
