import React from "react";
import { ethers } from "ethers";
import { NoWalletDetected } from "./NoWalletDetected";
import { ConnectWallet } from "./ConnectWallet";
import { Loading } from "./Loading";
import { Dashboard } from "./Dashboard";

const HARDHAT_NETWORK_ID = '1337';

export class Dapp extends React.Component {
  constructor(props) {
    super(props);
    
    this.initialState = {
      selectedAddress: undefined,
      balance: undefined,
      networkError: undefined,
    };

    this.state = this.initialState;
  }

  render() {
    if (window.ethereum === undefined) {
      return <NoWalletDetected />;
    }

    if (!this.state.selectedAddress) {
      return (
        <ConnectWallet 
          connectWallet={() => this._connectWallet()} 
          networkError={this.state.networkError}
          dismiss={() => this._dismissNetworkError()}
        />
      );
    }

    if (!this.state.balance) {
      return <Loading />;
    }

    // If everything is loaded, we render the application.
    return (
      <div className="container p-4">
        <div className="row">
          <div className="col-12">
            <h5>
              Welcome <b>{this.state.selectedAddress}</b>, you have{" "}
              <b>{this.state.balance} ETH.</b>
            </h5>
          </div>
        </div>

        <hr />

        <div className="row">
          <div className="col-12">
            <Dashboard selectedAddress={this.state.selectedAddress} />
          </div>
        </div>
      </div>
    );
  }

  componentWillUnmount() {
    this._stopPollingData();
  }

  async _connectWallet() {
    if (!this._checkNetwork()) {
      return;
    }

    const [selectedAddress] = await window.ethereum.request({ method: 'eth_requestAccounts' });
    this._initialize(selectedAddress);

    window.ethereum.on("accountsChanged", ([newAddress]) => {
      this._stopPollingData();
      
      if (newAddress === undefined) {
        return this._resetState();
      }
      
      this._initialize(newAddress);
    });
    
    window.ethereum.on("chainChanged", ([networkId]) => {
      this._stopPollingData();
      this._resetState();
    });
  }

  _initialize(userAddress) {
    this.setState({
      selectedAddress: userAddress,
    });

    this._startPollingData();
  }

  _startPollingData() {
    this._pollDataInterval = setInterval(() => this._updateBalance(), 1000);
    this._updateBalance();
  }

  _stopPollingData() {
    clearInterval(this._pollDataInterval);
    this._pollDataInterval = undefined;
  }

  async _updateBalance() {
    //TODO: get provider from the state
    if (this.state.selectedAddress) {
      let provider = new ethers.providers.Web3Provider(window.ethereum);
      const wei = await provider.getBalance(this.state.selectedAddress);
      let balance = ethers.utils.formatEther(wei.toString());
      balance = parseFloat((+balance).toFixed(4));
      
      this.setState({ balance });
    }
  }

  _dismissNetworkError() {
    this.setState({ networkError: undefined });
  }

  _resetState() {
    this.setState(this.initialState);
  }

  // This method checks if Metamask selected network is Localhost:8545 
  _checkNetwork() {
    if (window.ethereum.networkVersion === HARDHAT_NETWORK_ID) {
      return true;
    }

    this.setState({ 
      networkError: 'Please connect Metamask to Localhost:8545'
    });

    return false;
  }
}
