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

    async priceChanged(event) {
        this.setState({ price: parseFloat(event.target.value) });

        if (this.state.type === 1) {
            await this.calculateMarketBuyAmount(parseFloat(event.target.value));
        }
    }
    async amountChanged(event) {
        this.setState({ amount: event.target.value });
        
        if (this.state.type === 2) {
            await this.calculateMarketSellPrice(parseFloat(event.target.value));
        }
    }
    typeChanged(event) {
        this.setState({
            type: parseInt(event.target.value),
            price: 0,
            amount: 0
        });
    }

    getPrice() {
        return this.toWei(this.state.price);
    }

    getAmount() {
        return this.toWei(this.state.amount);
    }

    toWei(number) {
        if (parseFloat(number) < 0) {
            throw new Error("Negative value");
        }
        return ethers.utils.parseEther(number.toString());
    }

    toEther(amount) {
        if (amount && amount > 0) {
            let eth = ethers.utils.formatEther(amount);
            return (+eth).toFixed(4);
        }
        return 0;
    }

    async calculateMarketBuyAmount(price) {
        let amount = 0;
        if (price !== 0 ) {
            try {
                const amountBN = await this.props.exchange.orderExecutor.calculateBuyTokensAmount(
                    this.props.selectedToken.tokenAddress,
                    this.toWei(price)
                );
                amount = this.toEther(amountBN);
            } catch (error) {
                console.log(`${error.code} : ${error.errorArgs[0]}`);
            }
        }
        
        this.setState({ amount });
    }
    
    async calculateMarketSellPrice(amount) {
        let price = 0;
        if (amount !== 0 ) {
            try {
                const priceBN = await this.props.exchange.orderExecutor.calculateSellTokensPrice(
                    this.props.selectedToken.tokenAddress,
                    this.toWei(amount)
                );
                price = this.toEther(priceBN);
            } catch (error) {
                console.log(`${error.code} : ${error.errorArgs[0]}`);
            }
        }
        
        this.setState({ price });
    }

    async processOrder() {
        if (!this.props.selectedToken?.tokenAddress) {
            console.log("There is not selected token");
            return;
        }

        try {
            switch (this.state.type) {
                case 1:
                    // "Market Buy"
                    await this.props.exchange.orderExecutor.buyTokens(
                        this.props.selectedToken.tokenAddress,
                        {
                            value: this.getPrice()
                        }
                    );
                    break;
                case 2:
                    // "Market Sell"
                    await this.props.exchange.orderExecutor.sellTokens(
                        this.props.selectedToken.tokenAddress,
                        this.getAmount()
                    );
                    break;
                case 3:
                    // "Limit Buy"
                    const ethAmount = parseFloat(this.state.price) * parseFloat(this.state.amount);
                    await this.props.exchange.orderFactory.placeBuyOrder(
                        this.props.selectedToken.tokenAddress,
                        this.getPrice(),
                        this.getAmount(),
                        {
                            value: ethers.utils.parseEther(ethAmount.toString()) 
                        }
                    );
                    break;
                case 4:
                    // "Limit Sell"
                    await this.props.exchange.orderFactory.placeSellOrder(
                        this.props.selectedToken.tokenAddress,
                        this.getPrice(),
                        this.getAmount()
                    );
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
