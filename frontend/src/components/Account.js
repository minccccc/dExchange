import React from "react";
import { ethers } from "ethers";
import { NewOrder } from "./NewOrder";

export class Account extends React.Component {
    convertToEther(amount) {
        if (amount && amount > 0) {
            let eth = ethers.utils.formatEther(amount);
            return (+eth).toFixed(4);
        }
        return 0;
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
                            step="1"
                            name="amount"
                            placeholder="Amount TOK1"
                            min="0"
                        />

                    </div>

                    <div className="btn-group" role="group" aria-label="Basic example">
                        <button type="button" className="btn btn-primary">Deposit</button>
                        <button type="button" className="btn btn-secondary">Withdraw</button>
                    </div>
                </div>


            </div>
        );
    }
}
