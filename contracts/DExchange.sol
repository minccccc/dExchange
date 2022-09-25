//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./SortedOrdersList.sol";
import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

//Allow buy/sell token for ETH
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

    address private owner;
    bool public locked;
    mapping (address => SortedOrdersList) private buyOrders;
    mapping (address => SortedOrdersList) private sellOrders;

    mapping (address => ListedToken) public listedTokens;
    address[] private listedTokensArray;
    mapping (address => mapping ( address => uint)) private tokenBalances;

    uint8 private maxDispayOrders = 10;

    event TokensDeposited(
        address indexed account,
        address indexed token,
        uint amount
    );
    
    event Withdrawn(
        address indexed account,
        address indexed token,
        uint amount
    );

    event TokensPurchased(
        address indexed account,
        address indexed token,
        uint price,
        uint amount
    );

    event TokensSold(
        address indexed account,
        address indexed token,
        uint price,
        uint amount
    );

    event BuyOrderPlaced(
        address indexed token,
        uint price,
        uint amount
    );
    
    event SellOrderPlaced(
        address indexed token,
        uint price,
        uint amount
    );

    event OrderCanceled(
        address indexed token,
        uint orderId
    );
    
    constructor() {
        owner = msg.sender;
    }

    modifier tokenToBeListed(address _tokenAddress) {
        require(listedTokens[_tokenAddress].tokenAddress != address(0), 
            "This token is not listed on the exchange");
        _;
    }

    modifier enoughBalance(address _address, uint _amount) {
        uint balance = tokenBalances[msg.sender][_address];
        require(balance >= _amount, "Insufficient balance");
        _;
    }

    modifier noReentrancy() {
        require(!locked, "Exchange locked, please try again!");
        locked = true;
        _;
        locked = false;
    }

    function addToken(ERC20 _token) external {
        require(msg.sender == owner, "Only the owner can add tokens into the exchange");
        require(address(_token) != address(0), "Listed token address is empty");
        require(listedTokens[address(_token)].tokenAddress == address(0), "This token is already listed on the exchange");

        listedTokens[address(_token)] = ListedToken({
            name : _token.name(),
            symbol : _token.symbol(),
            tokenAddress : address(_token),
            tokenContract : _token
        });
        listedTokensArray.push(address(_token));

        buyOrders[address(_token)] = new SortedOrdersList(SortedOrdersList.OrderType.DESC);
        sellOrders[address(_token)] = new SortedOrdersList(SortedOrdersList.OrderType.ASC);
    }

    function getListedTokens() external view returns (ListedToken[] memory) {
        ListedToken[] memory result = new ListedToken[](listedTokensArray.length);
        for (uint i = 0; i < listedTokensArray.length; i++) {
            result[i] = listedTokens[listedTokensArray[i]];
        }
        return result;
    }

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

    function checkBalance(address tokenAddress) external view returns(uint) {
        return tokenBalances[msg.sender][tokenAddress];
    }

    function deposit(address _tokenAddress, uint _tokenAmount) external noReentrancy tokenToBeListed(_tokenAddress){
        
        listedTokens[_tokenAddress].tokenContract.transferFrom(msg.sender, address(this), _tokenAmount);

        tokenBalances[msg.sender][_tokenAddress] = tokenBalances[msg.sender][_tokenAddress].add(_tokenAmount);
        
        emit TokensDeposited(msg.sender, _tokenAddress, _tokenAmount);
    }

    function withdraw(address _tokenAddress, uint _tokenAmount) external 
            noReentrancy tokenToBeListed(_tokenAddress) enoughBalance(_tokenAddress, _tokenAmount) {

        tokenBalances[msg.sender][_tokenAddress] 
            = tokenBalances[msg.sender][_tokenAddress].sub(_tokenAmount);

        listedTokens[_tokenAddress].tokenContract.transfer(msg.sender, _tokenAmount);

        emit Withdrawn(msg.sender, _tokenAddress, _tokenAmount);
    }

    function placeBuyOrder(address _tokenAddress, uint _price, uint _tokenAmount) external payable
            tokenToBeListed(_tokenAddress) {

        require(_tokenAmount > 0, 'Order token amount can not be 0');
        require(_price > 0, 'Order price can not be 0');

        uint eth = 1 ether;
        uint _orderPrice = _tokenAmount.mul(_price).div(eth);
        //to calculate order price properly
        uint _orderPriceDecimal = _tokenAmount.mul(_price).mod(eth);
        _orderPrice = _orderPrice.add(_orderPriceDecimal);

        require(msg.value >= _orderPrice , 'Insufficient ethers sent');

        buyOrders[_tokenAddress].addOrder(msg.sender, _price, _tokenAmount);

        uint _change = msg.value.sub(_orderPrice);
        if (_change > 0) {
            (bool success,)= payable(msg.sender).call{value: _change}("");
            require(success, 'Something went wrong');
        }

        emit BuyOrderPlaced(_tokenAddress, _price, _tokenAmount);
    }

    function cancelBuyOrder(address _tokenAddress, uint _orderId) external tokenToBeListed(_tokenAddress){
        SortedOrdersList.Order memory order = buyOrders[_tokenAddress].cancelOrder(_orderId);
                
        uint _orderPrice = order.amount.mul(order.price).div(1 ether);
        (bool success,)= payable(order.user).call{value: _orderPrice}("");
        require(success, 'Something went wrong');

        emit OrderCanceled(_tokenAddress, _orderId);
    }

    function placeSellOrder(address _tokenAddress, uint _price, uint _tokenAmount) external
            tokenToBeListed(_tokenAddress) enoughBalance(_tokenAddress, _tokenAmount) {
        
        require(_tokenAmount > 0, 'Order token amount can not be 0');
        require(_price > 0, 'Order price can not be 0');

        sellOrders[_tokenAddress].addOrder(msg.sender, _price, _tokenAmount);
        tokenBalances[msg.sender][_tokenAddress] = tokenBalances[msg.sender][_tokenAddress].sub(_tokenAmount);
        
        emit SellOrderPlaced(_tokenAddress, _price, _tokenAmount);
    }

    function cancelSellOrder(address _tokenAddress, uint _orderId) external tokenToBeListed(_tokenAddress){
        SortedOrdersList.Order memory order = sellOrders[_tokenAddress].cancelOrder(_orderId);
        
        // listedTokens[_tokenAddress].tokenContract.transfer(order.user, order.amount);
        tokenBalances[order.user][_tokenAddress] = tokenBalances[order.user][_tokenAddress].add(order.amount);

        emit OrderCanceled(_tokenAddress, _orderId);
    }

    function getTopBuyOrders(address _tokenAddress) external view 
        tokenToBeListed(_tokenAddress) returns(SortedOrdersList.DisplayOrder[] memory) {

        return buyOrders[_tokenAddress].getTopOrders(maxDispayOrders);
    }

    function getTopSellOrders(address _tokenAddress) external view 
        tokenToBeListed(_tokenAddress) returns(SortedOrdersList.DisplayOrder[] memory) {
        
        return sellOrders[_tokenAddress].getTopOrders(maxDispayOrders);
    }

    function getMyBuyOrders(address _tokenAddress) external view
        tokenToBeListed(_tokenAddress) returns(SortedOrdersList.DisplayOrder[] memory) {
        return buyOrders[_tokenAddress].getTopOrders(maxDispayOrders);
    }

    function getMySellOrders(address _tokenAddress) external view
        tokenToBeListed(_tokenAddress) returns(SortedOrdersList.DisplayOrder[] memory) {
        return sellOrders[_tokenAddress].getTopOrders(maxDispayOrders);
    }

    function calculateBuyTokensAmount(address _tokenAddress, uint _purchasePrice) external view
        tokenToBeListed(_tokenAddress) returns(uint) {
        return sellOrders[_tokenAddress].calculatePurchaseTokensAmount(_purchasePrice);
    }

    function calculateSellTokensPrice(address _tokenAddress, uint _purchaseAmount) external view
        tokenToBeListed(_tokenAddress) returns(uint) {
        return buyOrders[_tokenAddress].calculatePurchaseTokensAmount(_purchaseAmount);
    }

    function buyTokens(address _tokenAddress) public payable
        noReentrancy tokenToBeListed(_tokenAddress) {
        
        require(msg.value > 0, "Purchase price can not be 0");
        
        (SortedOrdersList.Order[] memory executedOrders, uint amount, uint charge) = sellOrders[_tokenAddress].processOrder(msg.value);

        require(executedOrders.length > 0, "There is not executed order");

        tokenBalances[msg.sender][_tokenAddress] = tokenBalances[msg.sender][_tokenAddress].add(amount);

        //send the ethers to the sellers address

        if (charge > 0) {
            (bool success,)= payable(msg.sender).call{value: charge}("");
            require(success, 'Something went wrong');
        }

        emit TokensPurchased(msg.sender, _tokenAddress, msg.value - charge, amount);
    }
    
    // function sellTokens(uint _tokenAmount) public {
        //sell tokens for ethers
        // uint amount = _tokenAmount.div(rate);
        
        // require(balances[msg.sender] >= amount, "There are not enough ethers in the exchange");

        // tokenBalance = tokenBalance.add(_tokenAmount);
        // balances[msg.sender] = balances[msg.sender].sub(_tokenAmount);
        
        // emit TokensSold(msg.sender, _tokenAmount, rate);
    // }

}