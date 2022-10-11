# DExchange - Decentralized Exchange

The purpose of the project is to learn a bit more about Solidity and how it works. For that reason I created the project with idea to be decentralized exchange where the users can trade ERC20 tokens.

DExchange is organized as a modular smart contract system that can be upgraded/extended after deployment and follow so called [EIP-2535 Diamonds](https://github.com/ethereum/EIPs/issues/2535) standart. To Learn more about used diamond implementation check [here](https://github.com/mudgen/diamond-1-hardhat).

## Implementation
The project contains set of facets and libraries to provide the basic functionality for a exchange as well as very simple frontend written on ReactJS with Ethers.js to interact with, and has the following features:
- Only Admin is able to add new ERC20 token to the exchange
- The user is able to see his tokens balance on the exchange and on the wallet as well
- There are tables for top buy and sell orders as well as partucular section for the user orders where he can cancel the order
- The user can place limit buy/sell orders on the partucular price and amount
- Market order - orders which will be executed immediately from already avaialble limit orders
- Eeach order can be canceled only from his owner or from the owner of the exchange
- Orders are stored as a LinkedList and sorted in the particular way (buy orders - DESC, sell orders - ASC)
- Deposit and withdraw

##Prerequisitesssssssssss !@ !#!@!#@!#@!#@! #@!
##Prerequisitesssssssssss !@ !#!@!#@!#@!#@! #@!
##Prerequisitesssssssssss !@ !#!@!#@!#@!#@! #@!
##Prerequisitesssssssssss !@ !#!@!#@!#@!#@! #@!
##Prerequisitesssssssssss !@ !#!@!#@!#@!#@! #@!
METAMASK

## Prerequisites
The exchange uses Metamask, so make sure it is up and running. After that add new network for localhost `127.0.0.1:8545` and import at lease one of the accounts which will be generated when run local node with hardhat.

## Instalation
1. Clone this repo:
```console
git clone git@github.com:minccccc/dExchange.git
```

2. Install NPM packages:
```console
cd dExchange
npm install
```

3. Install FE libraries
```console
cd frontend
npm install
```

## Local deployment
1. Run local node
```console
npx hardhat node
```
2. Run react web app
```console
cd frontend
npm run start
```
3. Deploy the project
```console
npx hardhat --network localhost run .\scripts\deploy.js
```

## Run tests
```console
npx hardhat test
```

**Note:** The project is created only for learning and demo purposes and it is not tested/audited.

## License
MIT license. Anyone can use or modify this software for their purposes.