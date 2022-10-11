import React from "react";
import { ethers } from "ethers";
import contractAddress from "../contracts/contract-address.json";
import AccountBalanceFacet from "../contracts/AccountBalanceFacet.json";
import DepositTokenFacet from "../contracts/DepositTokenFacet.json";
import DisplayOrdersFacet from "../contracts/DisplayOrdersFacet.json";
import OrderExecutorFacet from "../contracts/OrderExecutorFacet.json";
import OrderFactoryFacet from "../contracts/OrderFactoryFacet.json";
import OwnershipFacet from "../contracts/OwnershipFacet.json";
import TokenFactoryFacet from "../contracts/TokenFactoryFacet.json";
import WithdrawTokenFacet from "../contracts/WithdrawTokenFacet.json";
import { TopOrders } from "./TopOrders";
import { MyOrders } from "./MyOrders";
import { LastActions } from "./LastActions";
import { Account } from "./Account";

export class Dashboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      exchange: this.prepareExchangeClients(),
      listedTokens: [],
      topSellOrders: [],
      topBuyOrders: [],
      myBuyOrders: [],
      mySellOrders: [],
      myOrders: [],
      myBalance: [],
      selectedToken: null
    };
  }

  prepareExchangeClients() {
    let provider = new ethers.providers.Web3Provider(window.ethereum);
    return {
      accountBalance: this.createContract(provider, AccountBalanceFacet.abi),
      depositToken: this.createContract(provider, DepositTokenFacet.abi),
      displayOrders: this.createContract(provider, DisplayOrdersFacet.abi),
      orderExecutor: this.createContract(provider, OrderExecutorFacet.abi),
      orderFactory: this.createContract(provider, OrderFactoryFacet.abi),
      // ownership: this.createContract(provider, OwnershipFacet.abi),
      tokenFactory: this.createContract(provider, TokenFactoryFacet.abi),
      withdrawToken: this.createContract(provider, WithdrawTokenFacet.abi)
    };
  }

  createContract(provider, abi) {
    return new ethers.Contract(
      contractAddress.Diamond,
      abi,
      provider.getSigner(0)
    );
  }

  async componentDidMount() {
    this.getListedTokens();
    this.setEventListeners();
  }

  toUpdateOrders(blockNumber, event) {
    if (event.blockNumber >= blockNumber) {
      this.refreshOrders(this.state.selectedToken);
    }
  }

  toUpdateAccount(blockNumber, event) {
    if (event.blockNumber >= blockNumber) {
      //update account balance
      this.getMyBalance();
    }
  }

  async setEventListeners() {
    let provider = new ethers.providers.Web3Provider(window.ethereum);
    const blockNumber = await provider.getBlockNumber();
    this.state.exchange.orderExecutor.on("OrderCanceled", (tokenAddress, orderId, event) => {

      console.log("OrderCanceled");

      this.toUpdateOrders(blockNumber, event);
    })
    this.state.exchange.orderFactory.on("BuyOrderPlaced", (tokenAddress, price, amount, event) => {

      console.log("BuyOrderPlaced");

      this.toUpdateOrders(blockNumber, event);
    })
    this.state.exchange.orderFactory.on("SellOrderPlaced", (tokenAddress, price, amount, event) => {

      console.log("SellOrderPlaced");

      this.toUpdateOrders(blockNumber, event);
    })
    
    this.state.exchange.orderExecutor.on("TokensPurchased", (account, tokenAddress, price, amount, event) => {

      console.log("TokensPurchased");

      this.toUpdateOrders(blockNumber, event);
    })
    this.state.exchange.orderExecutor.on("TokensSold", (account, tokenAddress, price, amount, event) => {

      console.log("TokensSold");

      this.toUpdateOrders(blockNumber, event);
    })
    
    //update account only
    this.state.exchange.depositToken.on("TokensDeposited", (account, tokenAddress, amount, event) => {

      console.log("TokensDeposited");

      this.toUpdateAccount(blockNumber, event);
    })
    this.state.exchange.withdrawToken.on("Withdrawn", (account, tokenAddress, amount, event) => {

      console.log("Withdrawn");

      this.toUpdateAccount(blockNumber, event);
    })
    
  }

  changeSelectedToken(tokenIndex) {
    let token = this.state.listedTokens[tokenIndex];

    this.refreshOrders(token);
    this.setState({ selectedToken: token });
  }

  async getListedTokens() {
    try {
      let listedTokens = await this.state.exchange.tokenFactory.getListedTokens();

      this.setState({
        listedTokens: listedTokens,
        selectedToken: listedTokens[0]
      });

      this.refreshOrders(listedTokens[0]);
    } catch (error) {
      console.log(`${error.code} : ${error.errorArgs[0]}`);
    }
  }

  refreshOrders(token) {
    let tokenAddress = token.tokenAddress;

    this.getTopSellOrders(tokenAddress);
    this.getTopBuyOrders(tokenAddress);
    this.getMyBuyOrders(tokenAddress);
    this.getMySellOrders(tokenAddress);
    this.getMyBalance();
  }

  async getTopSellOrders(tokenAddress) {
    try {
      let topSellOrders = await this.state.exchange.displayOrders.getTopSellOrders(tokenAddress, 10);
      this.setState({ topSellOrders });
    } catch (error) {
      console.log(`${error.code} : ${error.errorArgs[0]}`);
    }
  }

  async getTopBuyOrders(tokenAddress) {
    try {
      let topBuyOrders = await this.state.exchange.displayOrders.getTopBuyOrders(tokenAddress, 10);
      this.setState({ topBuyOrders });
    } catch (error) {
      console.log(`${error.code} : ${error.errorArgs[0]}`);
    }
  }

  async getMyBuyOrders(tokenAddress) {
    try {
      let myBuyOrders = await this.state.exchange.displayOrders.getMyBuyOrders(tokenAddress, 10);
      this.setState({ myBuyOrders });
    } catch (error) {
      console.log(`${error.code} : ${error.errorArgs[0]}`);
    }
  }

  async getMySellOrders(tokenAddress) {
    try {
      let mySellOrders = await this.state.exchange.displayOrders.getMySellOrders(tokenAddress, 10);
      this.setState({ mySellOrders });
    } catch (error) {
      console.log(`${error.code} : ${error.errorArgs[0]}`);
    }
  }
  
  async getMyBalance() {
    try {
        let myBalance = await this.state.exchange.accountBalance.getMyBalance();
        this.setState({ myBalance });
    } catch (error) {
        console.log(`${error.code} : ${error.errorArgs[0]}`);
    }
  }

  render() {
    return (
      <div className="container-fluid pb-3">
        <div className="d-grid" style={{ gridTemplateColumns: "30% 70%" }} >
          <Account
            exchange={this.state.exchange}
            listedTokens={this.state.listedTokens}
            myBalance={this.state.myBalance}
            changeSelectedToken={(tokenIndex) => this.changeSelectedToken(tokenIndex)}
            selectedToken={this.state.selectedToken}
          />

          <div className="container-fluid pb-3">
            <div className="d-grid gap-3" style={{ gridTemplateColumns: "50% 50%" }} >
              <MyOrders
                exchange={this.state.exchange}
                selectedToken={this.state.selectedToken}
                myBuyOrders={this.state.myBuyOrders}
                mySellOrders={this.state.mySellOrders}
              />
              <LastActions />
              <TopOrders
                kind="Sell"
                exchange={this.state.exchange}
                selectedToken={this.state.selectedToken}
                topOrders={this.state.topSellOrders}
              />
              <TopOrders
                kind="Buy"
                exchange={this.state.exchange}
                selectedToken={this.state.selectedToken}
                topOrders={this.state.topBuyOrders}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
}
