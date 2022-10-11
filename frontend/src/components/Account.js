import React from "react";
import { ethers } from "ethers";
import { NewOrder } from "./NewOrder";
import contractAddress from "../contracts/contract-address.json";

export class Account extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            amount: 0
        };

        this.amountChanged = this.amountChanged.bind(this);
    }

    async amountChanged(event) {
        this.setState({ amount: event.target.value });
    }

    convertToEther(amount) {
        if (amount && amount > 0) {
            let eth = ethers.utils.formatEther(amount);
            return (+eth).toFixed(4);
        }
        return 0;
    }

    async approveDeposit(address, amount) {
        const abi = ["function approve(address spender, uint256 value) public returns (bool success)"]
        let provider = new ethers.providers.Web3Provider(window.ethereum);
        let tokenContract = new ethers.Contract(
            address,
            abi,
            provider.getSigner(0)
        );
        await tokenContract.approve(contractAddress.Diamond, amount);
    }

    async transfer(deposit) {
        if (!this.props.selectedToken?.tokenAddress) {
            console.log("There is not selected token");
            return;
        }

        try {
            const address = this.props.selectedToken.tokenAddress;
            const amount = ethers.utils.parseEther(this.state.amount);
            if (deposit) {
                await this.approveDeposit(address, amount);
                await this.props.exchange.depositToken.deposit(address, amount);
            } else {
                await this.props.exchange.withdrawToken.withdraw(address, amount);
            }
        } catch (error) {
            console.log(`${error.code} : ${error.data.message}`);
        }

        this.setState({
            amount: 0
        });
    }

    render() {
        const rows = this.props.listedTokens.map((token, i) => {
            return (
                <tr key={i}
                    className={this.props.selectedToken.tokenAddress === token.tokenAddress ? "table-success" : ""}
                    onClick={() => this.props.changeSelectedToken(i)}>
                    <th>{token.name.toString()}</th>
                    <td>{this.convertToEther(this.props.myBalance[i]?.wallet)}</td>
                    <td>{this.convertToEther(this.props.myBalance[i]?.exchange)}</td>
                </tr>
            );
        });

        return (
            <div className="bg-light border bg-padding rounded-3" >
                <div className="form-group pb-4">
                    <h6>Balance</h6>
                    <table className="table table-hover">
                        <thead>
                            <tr>
                                <th scope="col">Token</th>
                                <th scope="col">Wallet</th>
                                <th scope="col">Exchange</th>
                            </tr>
                        </thead>
                        <tbody style={{ cursor: "pointer" }}>
                            {rows}
                        </tbody>
                    </table>
                </div>

                <h5 className="text-center">
                    {this.props.selectedToken?.name}
                    [ {this.props.selectedToken?.symbol} ]
                </h5>

                <NewOrder
                    exchange={this.props.exchange}
                    selectedToken={this.props.selectedToken} />

                {/* Wallet */}
                <div className="row g-3">
                    <div className="form-group">
                        <h6>Wallet</h6>
                        <input
                            className="form-control"
                            type="number"
                            step="0.1"
                            name="amount"
                            placeholder="1"
                            min="0"
                            value={this.state.amount}
                            onChange={this.amountChanged}
                        />
                    </div>

                    <div className="btn-group" role="group" aria-label="Basic example">
                        <button type="button" className="btn btn-primary"
                            onClick={() => this.transfer.call(this, true)}>
                            Deposit
                        </button>
                        <button type="button" className="btn btn-secondary"
                            onClick={() => this.transfer.call(this, false)}>
                            Withdraw
                        </button>
                    </div>
                </div>


            </div>
        );
    }
}
