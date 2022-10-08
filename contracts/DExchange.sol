//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./common/Order.sol";
import "./common/DisplayOrder.sol";
import "./common/OrderTypeEnum.sol";
import "./interfaces/IOrderManager.sol";
import "./OrderManager.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract DExchange {
    using SafeMath for uint;

    struct ListedToken {
        string name;
        string symbol;
        address tokenAddress;
        ERC20 tokenContract;
    }

    struct Balance {
        address tokenAddress;
        uint wallet;
        uint exchange;
    }

    event TokensDeposited(address indexed account, address indexed token, uint amount);
    event Withdrawn( address indexed account, address indexed token, uint amount);
    event TokensPurchased(address indexed account, address indexed token, uint price, uint amount);
    event TokensSold(address indexed account, address indexed token, uint price, uint amount);
    event BuyOrderPlaced(address indexed token, uint price, uint amount);
    event SellOrderPlaced(address indexed token, uint price, uint amount);
    event OrderCanceled(address indexed token, uint orderId);

    address public owner;
    bool public locked;
    mapping (address => IOrderManager) private buyOrders;
    mapping (address => IOrderManager) private sellOrders;

    mapping (address => ListedToken) public listedTokens;
    address[] private listedTokensArray;
    mapping (address => mapping ( address => uint)) private tokenBalances;

    uint8 private maxDispayOrders = 10;
    
    
    constructor() {
        owner = msg.sender;
    }

    modifier tokenToBeListed(address tokenAddress) {
        require(listedTokens[tokenAddress].tokenAddress != address(0), 
            "This token is not listed on the exchange");
        _;
    }

    /// @notice Validate caller has sufficient token balanace on the exchange
    modifier enoughBalance(address tokenAddress, uint amount) {
        uint balance = tokenBalances[msg.sender][tokenAddress];
        require(balance >= amount, "Insufficient balance");
        _;
    }

    //TODO: check reentrancy from OpenZeppelin
    modifier noReentrancy() {
        require(!locked, "Exchange locked, please try again!");
        locked = true;
        _;
        locked = false;
    }

    /// @notice Validate input fields are positive numbers
    modifier validOrderInput(uint price, uint tokenAmount) {
        require(tokenAmount > 0, 'Order token amount can not be 0');
        require(price > 0, 'Order price can not be 0');
        _;
    }

    /// @dev Adds a new token address to the list of tokens on the exchange  
    /// @param token Address of the token contract
    function addToken(ERC20 token) external {
        require(msg.sender == owner, "Only the owner can add tokens into the exchange");
        require(address(token) != address(0), "Token address is empty");
        require(listedTokens[address(token)].tokenAddress == address(0), "This token is already listed on the exchange");

        listedTokens[address(token)] = ListedToken({
            name : token.name(),
            symbol : token.symbol(),
            tokenAddress : address(token),
            tokenContract : token
        });
        listedTokensArray.push(address(token));

        buyOrders[address(token)] = new OrderManager(OrderType.DESC);
        sellOrders[address(token)] = new OrderManager(OrderType.ASC);
    }

    /// @dev Returns all listed tokens ot the exchange
    function getListedTokens() external view returns (ListedToken[] memory) {
        ListedToken[] memory result = new ListedToken[](listedTokensArray.length);
        for (uint i = 0; i < listedTokensArray.length; i++) {
            result[i] = listedTokens[listedTokensArray[i]];
        }
        return result;
    }

    /// @dev Returns balance of all listed tokens (on exchange and on wallet) 
    /// for current user
    function getMyBalance() external view returns (Balance[] memory) {
        Balance[] memory result = new Balance[](listedTokensArray.length);
        for (uint i = 0; i < listedTokensArray.length; i++) {
            result[i] = Balance({
                tokenAddress : listedTokensArray[i],
                wallet : listedTokens[listedTokensArray[i]].tokenContract.balanceOf(msg.sender),
                exchange : tokenBalances[msg.sender][listedTokensArray[i]]
            });
        }
        
        return result;
    }

    /// @dev Returns token balance for current user
    /// @param tokenAddress Token address to check the balance
    function checkBalance(address tokenAddress) external view returns(uint) {
        return tokenBalances[msg.sender][tokenAddress];
    }

    /// @dev Deposit tokens from users wallet
    /// @notice To be able to call "transferFrom" the user have to accept this transfer in advance
    /// @param tokenAddress Token address
    /// @param tokenAmount Amount to be deposited
    function deposit(address tokenAddress, uint tokenAmount) external 
        noReentrancy tokenToBeListed(tokenAddress){

        tokenBalances[msg.sender][tokenAddress] += tokenAmount;       
        listedTokens[tokenAddress].tokenContract.transferFrom(msg.sender, address(this), tokenAmount);
        
        emit TokensDeposited(msg.sender, tokenAddress, tokenAmount);
    }

    /// @dev Withdraw tokens to the users wallet
    /// @param tokenAddress Token address
    /// @param tokenAmount Amount to be withdrawn
    function withdraw(address tokenAddress, uint tokenAmount) external 
            noReentrancy tokenToBeListed(tokenAddress) enoughBalance(tokenAddress, tokenAmount) {

        tokenBalances[msg.sender][tokenAddress] -= tokenAmount;
        listedTokens[tokenAddress].tokenContract.transfer(msg.sender, tokenAmount);

        emit Withdrawn(msg.sender, tokenAddress, tokenAmount);
    }

    /// @dev Add buy order to the order list
    /// @param tokenAddress Token to be bought
    /// @param price Price for a token in ETH
    /// @param tokenAmount Amount of tokens to be bought
    function placeBuyOrder(address tokenAddress, uint price, uint tokenAmount) external payable
            tokenToBeListed(tokenAddress) validOrderInput(price, tokenAmount) {

        uint eth = 1 ether;
        uint _orderPrice = tokenAmount.mul(price).div(eth);
        //to calculate order price properly
        uint _orderPriceDecimal = tokenAmount.mul(price).mod(eth);
        _orderPrice = _orderPrice.add(_orderPriceDecimal);

        require(msg.value >= _orderPrice , 'Insufficient ethers sent');

        buyOrders[tokenAddress].addOrder(msg.sender, price, tokenAmount);

        uint _change = msg.value.sub(_orderPrice);
        if (_change > 0) {
            (bool success,)= payable(msg.sender).call{value: _change}("");
            require(success, 'Something went wrong');
        }

        emit BuyOrderPlaced(tokenAddress, price, tokenAmount);
    }

    /// @dev Remove buy order
    /// @param tokenAddress Order token address
    /// @param orderId Id ot the order
    function cancelBuyOrder(address tokenAddress, uint orderId) external tokenToBeListed(tokenAddress) {
        Order memory order = buyOrders[tokenAddress].cancelOrder(orderId);
                
        uint _orderPrice = order.amount.mul(order.price).div(1 ether);
        (bool success,)= payable(order.user).call{value: _orderPrice}("");
        require(success, 'Something went wrong');

        emit OrderCanceled(tokenAddress, orderId);
    }

    /// @dev Add sell order to the order list
    /// @param tokenAddress Address ot the token to be sold
    /// @param price Price for a token in ETH
    /// @param tokenAmount Amount of tokens to be sold
    function placeSellOrder(address tokenAddress, uint price, uint tokenAmount) external
            tokenToBeListed(tokenAddress) enoughBalance(tokenAddress, tokenAmount) validOrderInput(price, tokenAmount) {
        
        sellOrders[tokenAddress].addOrder(msg.sender, price, tokenAmount);
        tokenBalances[msg.sender][tokenAddress] = tokenBalances[msg.sender][tokenAddress].sub(tokenAmount);
        
        emit SellOrderPlaced(tokenAddress, price, tokenAmount);
    }

    /// @dev Remove sell order
    /// @param tokenAddress Order token address
    /// @param orderId Id ot the order
    function cancelSellOrder(address tokenAddress, uint orderId) external tokenToBeListed(tokenAddress) {
        Order memory order = sellOrders[tokenAddress].cancelOrder(orderId);
        tokenBalances[order.user][tokenAddress] = tokenBalances[order.user][tokenAddress].add(order.amount);

        emit OrderCanceled(tokenAddress, orderId);
    }

    /// @dev Returns sorted DisplayOrder list of the top/first buy orders to be executed
    /// @param tokenAddress Specifies token address
    function getTopBuyOrders(address tokenAddress) external view 
        tokenToBeListed(tokenAddress) returns(DisplayOrder[] memory) {

        return buyOrders[tokenAddress].getTopOrders(maxDispayOrders);
    }

    /// @dev Returns sorted DisplayOrder list of the top/first sell orders to be executed
    /// @param tokenAddress Specifies token address
    function getTopSellOrders(address tokenAddress) external view 
        tokenToBeListed(tokenAddress) returns(DisplayOrder[] memory) {
        
        return sellOrders[tokenAddress].getTopOrders(maxDispayOrders);
    }

    /// @dev Returns sorted DisplayOrder list with sell orders from the caller
    /// @param tokenAddress Specifies token address
    function getMyBuyOrders(address tokenAddress) external view
        tokenToBeListed(tokenAddress) returns(DisplayOrder[] memory) {
        return buyOrders[tokenAddress].getTopOrders(maxDispayOrders);
    }

    /// @dev Returns sorted DisplayOrder list with sell orders from the caller
    /// @param tokenAddress Specifies token address
    function getMySellOrders(address tokenAddress) external view
        tokenToBeListed(tokenAddress) returns(DisplayOrder[] memory) {
        return sellOrders[tokenAddress].getTopOrders(maxDispayOrders);
    }

    /// @dev Calculate how many tokens the user can buy
    /// @param tokenAddress Token address
    /// @param purchasePrice The amount in ETH for the purchase
    /// @return Amount of tokens the user can buy at the moment for the specified amount ot ETH
    function calculateBuyTokensAmount(address tokenAddress, uint purchasePrice) external view
        tokenToBeListed(tokenAddress) returns(uint) {
        return sellOrders[tokenAddress].calculatePurchaseTokensAmount(purchasePrice);
    }

    /// @dev Calculate how many tokens the user can sell
    /// @param tokenAddress Token address
    /// @param purchaseAmount Amount of tokens to be sell
    /// @return Amount of ETHs the user can get at the moment if sell the tokens
    function calculateSellTokensPrice(address tokenAddress, uint purchaseAmount) external view
        tokenToBeListed(tokenAddress) returns(uint) {
        return buyOrders[tokenAddress].calculatePurchaseTokensAmount(purchaseAmount);
    }

    /// @notice Buy tokens (market buy) and if any charge send it back to the user
    ///         Will send the ETHs for each executed order to the resposible seller.
    /// @dev The amount of tokens will be calculated based on ETH send to the function
    /// @param tokenAddress Token address
    function buyTokens(address tokenAddress) external payable
        noReentrancy tokenToBeListed(tokenAddress) {
        
        require(msg.value > 0, "Purchase price can not be 0");
        (Order[] memory executedOrders, uint amount, uint charge) = sellOrders[tokenAddress].processOrder(msg.value);

        require(executedOrders.length > 0, "There is not executed order");
        tokenBalances[msg.sender][tokenAddress] = tokenBalances[msg.sender][tokenAddress].add(amount);

        for (uint i = 0; i < executedOrders.length; i++) {
            Order memory order = executedOrders[i];

            if (order.id != 0 && order.user != address(0)) {
                (bool sent, ) = order.user.call{value: msg.value}("");
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
        noReentrancy enoughBalance(tokenAddress, tokenAmount) tokenToBeListed(tokenAddress) {
        
        require(tokenAmount > 0, "Can not sell 0 tokens");
        (Order[] memory executedOrders, uint amount,) = buyOrders[tokenAddress].processOrder(tokenAmount);

        require(executedOrders.length > 0, "There is no executed order");
        tokenBalances[msg.sender][tokenAddress] = tokenBalances[msg.sender][tokenAddress].sub(tokenAmount);

        uint purchasePrice = 0;
        for (uint i = 0; i < executedOrders.length; i++) {
            Order memory order = executedOrders[i];
            purchasePrice += order.price.mul(order.amount).div(1 ether);
            tokenBalances[order.user][tokenAddress] += amount;
        }
        (bool sent, ) = payable(msg.sender).call{value: purchasePrice}("");
        require(sent, "Failed to send Ether to the seller");

        emit TokensSold(msg.sender, tokenAddress, purchasePrice, tokenAmount);
    }
    
}