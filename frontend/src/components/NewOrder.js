import React from "react";
import { ethers } from "ethers";

export class NewOrder extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            type: 0,
            price: 0,
            amount: 0,
            orderOptions: [
                "Choose...",
                "Market Buy",
                "Market Sell",
                "Limit Buy",
                "Limit Sell"
            ]
        };

        this.priceChanged = this.priceChanged.bind(this);
        this.amountChanged = this.amountChanged.bind(this);
        this.typeChanged = this.typeChanged.bind(this);
    }

    priceChanged(event) {
        this.setState({ price: event.target.value });
    }
    amountChanged(event) {
        this.setState({ amount: event.target.value });
    }
    typeChanged(event) {
        this.setState({
            type: parseInt(event.target.value),
            price: 0,
            amount: 0
        });
    }

    toWei(number) {
        if (parseFloat(number) < 0) {
            throw new Error("Negative valie");
        } else if (isNaN(parseFloat(number))) {
            throw new Error("Not a number");
        }
        return ethers.utils.parseEther(number);
    }

    getPrice() {
        return this.toWei(this.state.price);
    }

    getAmount() {
        return this.toWei(this.state.amount);
    }

    async processOrder() {
        if (!this.props.selectedToken?.tokenAdress) {
            console.log("There is not selected token");
            return;
        }

        try {
            //LISTEN FOR THE EVENTSSSS!!!!

            switch (this.state.type) {
                case 1:
                    // "Market Buy"
                    break;
                case 2:
                    // "Market Sell"
                    break;
                case 3:
                    // "Limit Buy"
                    const ethAmount = parseFloat(this.state.price) * parseFloat(this.state.amount);
                    await this.props.exchange.placeBuyOrder(
                        this.props.selectedToken.tokenAdress,  this.getPrice(), this.getAmount(),
                        { value: ethers.utils.parseEther(ethAmount.toString()) });

                    break;
                case 4:
                    await this.props.exchange.placeSellOrder(this.props.selectedToken.tokenAdress, this.getPrice(), this.getAmount());
                    break;
                default:
                    break;
            }
        } catch (error) {
            console.log(`${error.code} : ${error.errorArgs[0]}`);
        }

        this.setState({
            type: 0,
            price: 0,
            amount: 0
        });
    }

    render() {
        const orderOptions = this.state.orderOptions.map((option, i) => {
            return (<option key={i} value={i}>{option}</option>)
        });
        
        const buttonClass = "btn " + (this.state.type === 0 ? '' : ([1, 3].includes(this.state.type) ? 'btn-success' : 'btn-danger'));

        return (

            <div className="row g-3 pb-5">
                <div className="form-group">
                    <h6>New Order</h6>
                    <select className="form-select" value={this.state.type} onChange={this.typeChanged}>
                        {orderOptions}
                    </select>
                </div>

                <div className="form-group col-md-6">
                    <label>Price ETH</label>
                    <input
                        className="form-control"
                        type="number"
                        step="0.1"
                        name="price"
                        placeholder="1"
                        min="0"
                        value={this.state.price}
                        onChange={this.priceChanged}
                        disabled={[0, 2].includes(this.state.type)}
                    />
                </div>

                <div className="form-group col-md-6">
                    <label>Amount {this.props.selectedToken?.symbol}</label>
                    <input
                        className="form-control"
                        type="number"
                        step="0.1"
                        name="amount"
                        placeholder="1"
                        min="0"
                        value={this.state.amount}
                        onChange={this.amountChanged}
                        disabled={[0, 1].includes(this.state.type)}
                    />
                </div>

                <div className="btn-group" role="group" aria-label="Basic example">
                    <button type="button" className={buttonClass}
                        disabled={this.state.type === 0}
                        onClick={() => this.processOrder.call(this)}>
                        {this.state.orderOptions[this.state.type]}
                    </button>
                </div>
            </div>
        );
    }
}
