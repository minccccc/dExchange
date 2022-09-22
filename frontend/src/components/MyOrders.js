import React from "react";
import { ethers } from "ethers";

export class MyOrders extends React.Component {
    convertToEther(amount) {
        if (amount && amount > 0) {
            let eth = ethers.utils.formatEther(amount);
            return (+eth).toFixed(4);
        }
        return 0;
    }
    async cancelOrder(isBuy, orderIndex) {
        try {
            if (isBuy && this.props.selectedToken.tokenAddress) {
                await this.props.exchange.cancelBuyOrder(this.props.selectedToken.tokenAddress, orderIndex);
            } else {
                await this.props.exchange.cancelSellOrder(this.props.selectedToken.tokenAddress, orderIndex);
            }
        } catch (error) {
            console.log(`${error.code} : ${error.errorArgs[0]}`);
        }
    }

    isEmpty(order) {
        return order == null || !order.id || order.id.toString() === "0";
    }

    renderRow(order, i, isBuy) {
        return (this.isEmpty(order) ? "" : 
            <tr key={i} className={isBuy ? "table-success" : "table-danger"}>
                <td>{isBuy ? "Buy" : "Sell"}</td>
                <td>{this.convertToEther(order.price)}</td>
                <td>{this.convertToEther(order.amount)}</td>
                <td>
                    <button type="button" className="btn btn-link"
                        onClick={() => this.cancelOrder(isBuy, order.id.toString())}>Cancel
                    </button>
                </td>
            </tr>
        );
    }

    render() {
        const buyRows = this.props.myBuyOrders.map((order, i) => {
            return(this.renderRow(order, i, true))
        });
        const sellRows = this.props.mySellOrders.map((order, i) => {
            return(this.renderRow(order, i, false))
        });

        return (
            <div className="bg-light border bg-padding rounded-3" >
                <h6>My Orders</h6>
                <div className="bd-example-snippet pt-3 bd-code-snippet">
                    <div className="bd-example">
                        <table className="table table-sm">
                            <thead>
                                <tr>
                                    <th scope="col">Order</th>
                                    <th scope="col">Price [ETH]</th>
                                    <th scope="col">Amount [{this.props.selectedToken?.symbol}]</th>
                                    <th scope="col">Cancel</th>
                                </tr>
                            </thead>
                            <tbody>
                                {buyRows}
                                {sellRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }
}
