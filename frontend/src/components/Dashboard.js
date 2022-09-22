import React from "react";
import { ethers } from "ethers";
import ExchangeArtifact from "../contracts/DExchange.json";
import contractAddress from "../contracts/contract-address.json";
import { TopOrders } from "./TopOrders";
import { MyOrders } from "./MyOrders";
import { LastActions } from "./LastActions";
import { Account } from "./Account";

export class Dashboard extends React.Component {
  constructor(props) {
    super(props);

    let provider = new ethers.providers.Web3Provider(window.ethereum);
    let exchange = new ethers.Contract(
      contractAddress.DExchange,
      ExchangeArtifact.abi,
      provider.getSigner(0)
    );

    this.state = {
      exchange: exchange,
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

  async componentDidMount() {
    this.getListedTokens();
    this.setEventListeners();
  }

  toUpdateOrders(blockNumber, event) {
    // console.log(ethers.utils.formatUnits(price));
    if (event.blockNumber >= blockNumber) {
      this.refreshOrders(this.state.selectedToken);
    }
  }

  toUpdateAccount(blockNumber, event) {
    if (event.blockNumber >= blockNumber) {
      //update account balance
      alert("Update Account");
    }
  }

  async setEventListeners() {
    let provider = new ethers.providers.Web3Provider(window.ethereum);
    const blockNumber = await provider.getBlockNumber();
    
    // var evenets = await this.state.exchange.queryFilter(filter, -300, "latest");
    this.state.exchange.on("OrderCanceled", (tokenAddress, orderId, event) => {
      this.toUpdateOrders(blockNumber, event);
    })
    this.state.exchange.on("BuyOrderPlaced", (tokenAddress, price, amount, event) => {
      this.toUpdateOrders(blockNumber, event);
    })
    this.state.exchange.on("SellOrderPlaced", (tokenAddress, price, amount, event) => {
      this.toUpdateOrders(blockNumber, event);
    })
    
    this.state.exchange.on("TokensPurchased", (account, tokenAddress, price, amount, event) => {
      this.toUpdateOrders(blockNumber, event);
    })
    this.state.exchange.on("TokensSold", (account, tokenAddress, price, amount, event) => {
      this.toUpdateOrders(blockNumber, event);
    })
    
    //update account only
    this.state.exchange.on("TokensDeposited", (account, tokenAddress, amount, event) => {
      this.toUpdateAccount(blockNumber, event);
    })
    this.state.exchange.on("Withdrawn", (account, tokenAddress, amount, event) => {
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
      let listedTokens = await this.state.exchange.getListedTokens();

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
      let topSellOrders = await this.state.exchange.getTopSellOrders(tokenAddress);
      this.setState({ topSellOrders });
    } catch (error) {
      console.log(`${error.code} : ${error.errorArgs[0]}`);
    }
  }

  async getTopBuyOrders(tokenAddress) {
    try {
      let topBuyOrders = await this.state.exchange.getTopBuyOrders(tokenAddress);
      this.setState({ topBuyOrders });
    } catch (error) {
      console.log(`${error.code} : ${error.errorArgs[0]}`);
    }
  }

  async getMyBuyOrders(tokenAddress) {
    try {
      let myBuyOrders = await this.state.exchange.getMyBuyOrders(tokenAddress);
      this.setState({ myBuyOrders });
    } catch (error) {
      console.log(`${error.code} : ${error.errorArgs[0]}`);
    }
  }

  async getMySellOrders(tokenAddress) {
    try {
      let mySellOrders = await this.state.exchange.getMySellOrders(tokenAddress);
      this.setState({ mySellOrders });
    } catch (error) {
      console.log(`${error.code} : ${error.errorArgs[0]}`);
    }
  }
  
  async getMyBalance() {
    try {
        let myBalance = await this.state.exchange.getMyBalance();
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
