import React from "react";
import { ethers } from "ethers";

export class TopOrders extends React.Component {
    convertToEther(amount) {
        if (amount && amount > 0) {
            let eth = ethers.utils.formatEther(amount);
            return (+eth).toFixed(4);
        }
        return 0;
    }

    render() {
        const rows = this.props.topOrders.map((order, i) => {
            let isEmpty = !order.id || order.id.toString() === "0"; 
            return (
                <tr key={i}>
                    <td>{isEmpty ? "" : order.id.toString()}</td>
                    <td>{isEmpty ? "-" : this.convertToEther(order.price)}</td>
                    <td>{isEmpty ? "-" : this.convertToEther(order.amount)}</td>
                </tr>
            );
        });

        return (
            <div className="bg-light border bg-padding rounded-3" >
                <h6>Top {this.props.kind} Orders</h6>
                <div className="bd-example-snippet pt-3 bd-code-snippet">
                    <div className="bd-example">
                        <table className="table table-sm">
                        <thead>
                            <tr>
                                <th scope="col">Id</th>
                                <th scope="col">Price [ETH]</th>
                                <th scope="col">Amount [{this.props.selectedToken?.symbol}]</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows}
                        </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }
}
