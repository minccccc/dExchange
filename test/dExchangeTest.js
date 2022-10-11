const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { deployDiamond } = require('../scripts/deploy.js');

describe("DExchangeTest", function () {
  async function deployFixture() {
    const contracts = await deployDiamond(true)
    const diamondAddress = contracts['Diamond'];
    const [owner, addr2, addr3] = await ethers.getSigners();
    const ownership = await ethers.getContractAt('OwnershipFacet', diamondAddress);
    const accountBalance = await ethers.getContractAt('AccountBalanceFacet', diamondAddress);
    const depositToken = await ethers.getContractAt('DepositTokenFacet', diamondAddress);
    const displayOrders = await ethers.getContractAt('DisplayOrdersFacet', diamondAddress);
    const orderExecutor = await ethers.getContractAt('OrderExecutorFacet', diamondAddress);
    const orderFactory = await ethers.getContractAt('OrderFactoryFacet', diamondAddress);
    const tokenFactory = await ethers.getContractAt('TokenFactoryFacet', diamondAddress);
    const withdrawToken = await ethers.getContractAt('WithdrawTokenFacet', diamondAddress);

    const token1 = await ethers.getContractAt('ExchangeToken1', contracts['ExchangeToken1']);
    const token2 = await ethers.getContractAt('ExchangeToken2', contracts['ExchangeToken2']);
    const token3 = await ethers.getContractAt('ExchangeToken3', contracts['ExchangeToken3']);

    return { owner, addr2, addr3, token1, token2, token3, diamondAddress,
      ownership, accountBalance, depositToken, displayOrders,
      orderExecutor, orderFactory, tokenFactory, withdrawToken };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { owner, ownership } = await loadFixture(deployFixture);
      expect(await ownership.owner()).to.equal(owner.address);
    });
  });
  
  describe('addToken()', async () => {
    it('The owner should be able to add new tokens to the exchange', async () => {
      const { owner, tokenFactory, token1 } = await loadFixture(deployFixture);
      await tokenFactory.connect(owner).addToken(token1.address);
    })
    
    it('Should revert the transaction if the token is already added in the exchange', async () => {
      const { owner, tokenFactory, token1 } = await loadFixture(deployFixture);
      await tokenFactory.connect(owner).addToken(token1.address);

      await expect(tokenFactory.connect(owner).addToken(token1.address))
        .to.be.revertedWith("This token is already listed on the exchange");
    })
    
    it('Should revert the transaction if the token address is empty', async () => {
      const { owner, tokenFactory } = await loadFixture(deployFixture);

      await expect(tokenFactory.connect(owner).addToken('0x0000000000000000000000000000000000000000'))
        .to.be.revertedWith("Token address is empty");
    })

    it('Only owner can add new tokens to the exchange', async () => {
      const { tokenFactory, token1, addr2 } = await loadFixture(deployFixture);

      await expect(tokenFactory.connect(addr2).addToken(token1.address))
        .to.be.revertedWith("Only the owner can add tokens into the exchange");
    })
  
    it('All added tokens have to be in "listedTokens"', async () => {
      const { tokenFactory, token1, token2, token3, owner } = await loadFixture(deployFixture);

      await tokenFactory.connect(owner).addToken(token1.address);
      await tokenFactory.connect(owner).addToken(token2.address);

      const listedTokens = await tokenFactory.getListedTokens();

      expect(listedTokens.length == 2);
      expect(listedTokens[0].name).to.be.equal('ExchangeToken1');
      expect(listedTokens[1].name).to.be.equal('ExchangeToken2');

    })
    
  })

  describe('deposit()', async () => {
    it('Should be able to deposit tokens and emit "TokensDeposited" event', async () => {
      const { diamondAddress, tokenFactory, depositToken, token2, owner, addr2 } = await loadFixture(deployFixture);

      await tokenFactory.connect(owner).addToken(token2.address);
      var amount = 1000;
    
      await token2.connect(addr2).approve(diamondAddress, amount);
      await expect(depositToken.connect(addr2).deposit(token2.address, amount))
        .to.emit(depositToken, "TokensDeposited").withArgs(addr2.address, token2.address, amount)

      //second deposit
      await token2.connect(addr2).approve(diamondAddress, amount);    
      await expect(depositToken.connect(addr2).deposit(token2.address, amount))
        .to.emit(depositToken, "TokensDeposited").withArgs(addr2.address, token2.address, amount);
    
      expect(await token2.balanceOf(addr2.address)).to.equal(999999999999999998000n);
      expect(await token2.balanceOf(diamondAddress)).to.equal(2000);
    })

    it('Should fail if the transfer is not approved', async () => {
      const { tokenFactory, depositToken, token2, owner, addr2 } = await loadFixture(deployFixture);
      await tokenFactory.connect(owner).addToken(token2.address);

      await expect(depositToken.connect(addr2).deposit(token2.address, 1000))
        .to.be.revertedWith("ERC20: insufficient allowance");
    })

    it('Should fail if the token is not listed to the exchange', async () => {
      const { diamondAddress, depositToken, token2, addr2 } = await loadFixture(deployFixture);

      await token2.connect(addr2).approve(diamondAddress, 1000);
      await expect(depositToken.connect(addr2).deposit(token2.address, 1000))
        .to.be.revertedWith("This token is not listed on the exchange");
    }) 
  })

  describe('withdraw()', async () => {
    it('Should be able to withdraw tokens and emit "Withdrawn" event', async () => {
      const { diamondAddress, tokenFactory, depositToken, withdrawToken, token2, owner, addr2 } = await loadFixture(deployFixture);

      await tokenFactory.connect(owner).addToken(token2.address);
      await token2.connect(addr2).approve(diamondAddress, 1000);
      await depositToken.connect(addr2).deposit(token2.address, 1000);

      expect(await token2.balanceOf(addr2.address)).to.equal(999999999999999999000n);
      expect(await token2.balanceOf(diamondAddress)).to.equal(1000);

      await expect(withdrawToken.connect(addr2).withdraw(token2.address, 1000))
        .to.emit(withdrawToken, "Withdrawn").withArgs(addr2.address, token2.address, 1000)

      expect(await token2.balanceOf(addr2.address)).to.equal(1000000000000000000000n);
      expect(await token2.balanceOf(diamondAddress)).to.equal(0);
    })

    it('Should fail if the balance is insufficient', async () => {
      const { diamondAddress, tokenFactory, depositToken, withdrawToken, 
        token2, owner, addr2 } = await loadFixture(deployFixture);

      await tokenFactory.connect(owner).addToken(token2.address);
      await token2.connect(addr2).approve(diamondAddress, 1000);
      await depositToken.connect(addr2).deposit(token2.address, 1000);

      await expect(withdrawToken.connect(addr2).withdraw(token2.address, 2000))
        .to.be.revertedWith("Insufficient balance");
    })

    it('Should fail if the token is not listed to the exchange', async () => {
      const { withdrawToken, token2, addr2 } = await loadFixture(deployFixture);

      await expect(withdrawToken.connect(addr2).withdraw(token2.address, 1000))
        .to.be.revertedWith("This token is not listed on the exchange");
    }) 
  })
  
  describe('placeSellOrder()', async () => {
    it('Should be able to place multiple sell order', async () => {
      const { diamondAddress, tokenFactory, depositToken, orderFactory,
        accountBalance, token2, owner, addr2 } = await loadFixture(deployFixture);

      await tokenFactory.connect(owner).addToken(token2.address);
      await token2.connect(addr2).approve(diamondAddress, 1000);
      await depositToken.connect(addr2).deposit(token2.address, 1000);

      await expect(orderFactory.connect(addr2).placeSellOrder(token2.address, 2, 250))
        .to.emit(orderFactory, "SellOrderPlaced").withArgs(token2.address, 2, 250)

      expect(await accountBalance.connect(addr2).checkBalance(token2.address)).to.equal(750);

      await expect(orderFactory.connect(addr2).placeSellOrder(token2.address, 0, 250))
        .to.be.revertedWith("Order price can not be 0");
        
      await expect(orderFactory.connect(addr2).placeSellOrder(token2.address, 2, 0))
        .to.be.revertedWith("Order token amount can not be 0");
      
      await expect(orderFactory.connect(addr2).placeSellOrder(token2.address, 0, 0))
        .to.be.revertedWith("Order token amount can not be 0");
        
      expect(await accountBalance.connect(addr2).checkBalance(token2.address)).to.equal(750);
    })

    it('Should fail if try to place sell order > current balance', async () => {
      const { diamondAddress, tokenFactory, depositToken, orderFactory,
        token2, owner, addr2 } = await loadFixture(deployFixture);

      await tokenFactory.connect(owner).addToken(token2.address);
      await token2.connect(addr2).approve(diamondAddress, 1000);
      await depositToken.connect(addr2).deposit(token2.address, 1000);

      await expect(orderFactory.connect(addr2).placeSellOrder(token2.address, 2, 2000))
        .to.be.revertedWith("Insufficient balance");
    })

    it('Should fail if try to place order for token which is not listed', async () => {
      const { orderFactory, token2, addr2 } = await loadFixture(deployFixture);

      await expect(orderFactory.connect(addr2).placeSellOrder(token2.address, 2, 2000))
        .to.be.revertedWith("This token is not listed on the exchange");
    })
  })

  describe('placeBuyOrder()', async () => {
    it('Should be able to place multiple buy order', async () => {
      const { diamondAddress, tokenFactory, depositToken, orderFactory,
        token2, owner, addr2, addr3 } = await loadFixture(deployFixture);
        
      await tokenFactory.connect(owner).addToken(token2.address);
      await token2.connect(addr2).approve(diamondAddress, 1000);
      await depositToken.connect(addr2).deposit(token2.address, 1000);

      await expect(orderFactory.connect(addr3).placeBuyOrder(token2.address, 10, 100, {
        value: 1000
      })).to.emit(orderFactory, "BuyOrderPlaced").withArgs(token2.address, 10, 100)
      
      await expect(orderFactory.connect(addr3).placeBuyOrder(token2.address, 10, 100, {
        value: 1000
      })).to.emit(orderFactory, "BuyOrderPlaced").withArgs(token2.address, 10, 100)

      await expect(orderFactory.connect(addr3).placeBuyOrder(token2.address, 7, 100, {
        value: 100
      })).to.be.revertedWith("Insufficient ethers sent");
      
      await expect(orderFactory.connect(addr3).placeBuyOrder(token2.address, 0, 100, {
        value: 100
      })).to.be.revertedWith("Order price can not be 0");
      
      await expect(orderFactory.connect(addr3).placeBuyOrder(token2.address, 7, 0, {
        value: 100
      })).to.be.revertedWith("Order token amount can not be 0");

      await expect(orderFactory.connect(addr3).placeBuyOrder(token2.address, 7, 100, {
        value: 0
      })).to.be.revertedWith("Insufficient ethers sent");

      await expect(orderFactory.connect(addr3).placeBuyOrder(token2.address, 0, 0, {
        value: 0
      })).to.be.revertedWith("Order token amount can not be 0");

    })

    it('Should fail if try to place order for token which is not listed', async () => {
      const { orderFactory, token2, addr3 } = await loadFixture(deployFixture);

      await expect(orderFactory.connect(addr3).placeBuyOrder(token2.address, 5, 100, {
        value: 500
      })).to.be.revertedWith("This token is not listed on the exchange");
    })
  })

  describe('getTopBuyOrders()', async () => {
    it('Should be able to place 15 buy orders and to return top 10 ordered by price', async () => {
      const { diamondAddress, tokenFactory, depositToken, orderFactory,
        displayOrders, token2, owner, addr2, addr3 } = await loadFixture(deployFixture);

      await tokenFactory.connect(owner).addToken(token2.address);
      await token2.connect(addr2).approve(diamondAddress, 1000);
      await depositToken.connect(addr2).deposit(token2.address, 1000);

      await orderFactory.connect(addr3).placeBuyOrder(token2.address, 10, 100, { value: 10000 });
      await orderFactory.connect(addr3).placeBuyOrder(token2.address, 15, 100, { value: 10000 });
      await orderFactory.connect(addr3).placeBuyOrder(token2.address, 20, 100, { value: 10000 });
      await orderFactory.connect(addr3).placeBuyOrder(token2.address, 25, 100, { value: 10000 });
      await orderFactory.connect(addr3).placeBuyOrder(token2.address, 30, 100, { value: 10000 });
      await orderFactory.connect(addr3).placeBuyOrder(token2.address, 5, 100, { value: 10000 });
      await orderFactory.connect(addr3).placeBuyOrder(token2.address, 50, 100, { value: 10000 });
      await orderFactory.connect(addr3).placeBuyOrder(token2.address, 17, 100, { value: 10000 });
      await orderFactory.connect(addr3).placeBuyOrder(token2.address, 1, 100, { value: 10000 });
      await orderFactory.connect(addr3).placeBuyOrder(token2.address, 28, 100, { value: 10000 });
      await orderFactory.connect(addr3).placeBuyOrder(token2.address, 55, 100, { value: 10000 });
      await orderFactory.connect(addr3).placeBuyOrder(token2.address, 4, 100, { value: 10000 });
      await orderFactory.connect(addr3).placeBuyOrder(token2.address, 3, 100, { value: 10000 });
      await orderFactory.connect(addr3).placeBuyOrder(token2.address, 2, 100, { value: 10000 });
      await orderFactory.connect(addr3).placeBuyOrder(token2.address, 8, 100, { value: 10000 });
      
      var expectedOrder = [55, 50, 30, 28, 25, 20, 17, 15, 10, 8];
      
      var topOrders = await displayOrders.connect(addr3).getTopBuyOrders(token2.address, 10);
      topOrders.forEach(order => {
        expect(parseInt(order.price)).to.equal(expectedOrder.shift());
      });
    })


    it('Should fail if try to place order for token which is not listed', async () => {
      const { orderFactory, token2, addr3 } = await loadFixture(deployFixture);

      await expect(orderFactory.connect(addr3).placeBuyOrder(token2.address, 5, 100, {
        value: 500
      })).to.be.revertedWith("This token is not listed on the exchange");
    })
  })
    
  describe('getTopSellOrders()', async () => {
    it('Should be able to place multiple sell orders and to return top 10 ordered by price', async () => {
      const { diamondAddress, tokenFactory, depositToken, orderFactory, displayOrders,
        token2, owner, addr2 } = await loadFixture(deployFixture);

      await tokenFactory.connect(owner).addToken(token2.address);
      await token2.connect(addr2).approve(diamondAddress, 1000);
      await depositToken.connect(addr2).deposit(token2.address, 1000);

      await orderFactory.connect(addr2).placeSellOrder(token2.address, 4, 200);
      await orderFactory.connect(addr2).placeSellOrder(token2.address, 3, 250);
      await orderFactory.connect(addr2).placeSellOrder(token2.address, 20, 15);
      await orderFactory.connect(addr2).placeSellOrder(token2.address, 100, 10);
      await orderFactory.connect(addr2).placeSellOrder(token2.address, 5, 50);
      await orderFactory.connect(addr2).placeSellOrder(token2.address, 10, 5);
      await orderFactory.connect(addr2).placeSellOrder(token2.address, 50, 100);
      await orderFactory.connect(addr2).placeSellOrder(token2.address, 250, 5);
      await orderFactory.connect(addr2).placeSellOrder(token2.address, 1, 15);
      await orderFactory.connect(addr2).placeSellOrder(token2.address, 14, 15);

      var expectedOrder = [1, 3, 4, 5, 10, 14, 20, 50, 100, 250];
      
      var topOrders = await displayOrders.connect(addr2).getTopSellOrders(token2.address, 10);
      topOrders.forEach(order => {
        expect(parseInt(order.price)).to.equal(expectedOrder.shift());
      });
    })
  })

  describe('cancelBuyOrder()', async () => {
    it('Should remote the order when it is canceled', async () => {
      const { diamondAddress, tokenFactory, depositToken, orderFactory, orderExecutor,
        displayOrders, token2, owner, addr2, addr3 } = await loadFixture(deployFixture);

      await tokenFactory.connect(owner).addToken(token2.address);
      await token2.connect(addr2).approve(diamondAddress, 1000);
      await depositToken.connect(addr2).deposit(token2.address, 1000);

      await orderFactory.connect(addr3).placeBuyOrder(token2.address, 10, 100, { value: 10000 });
      await orderFactory.connect(addr3).placeBuyOrder(token2.address, 15, 100, { value: 10000 });
      await orderFactory.connect(addr3).placeBuyOrder(token2.address, 20, 100, { value: 10000 });
      await orderFactory.connect(addr3).placeBuyOrder(token2.address, 25, 100, { value: 10000 });
      await orderFactory.connect(addr3).placeBuyOrder(token2.address, 30, 100, { value: 10000 });

      await expect(orderExecutor.connect(addr3).cancelBuyOrder(token2.address, 1))
        .to.emit(orderExecutor, "OrderCanceled").withArgs(token2.address, 1)
      
      var topOrders = await displayOrders.connect(addr3).getTopBuyOrders(token2.address, 5);
      topOrders.forEach(order => {
        //order with price 10 have to be removed
        expect(parseInt(order.price)).to.not.equal(10);
      });
    })

    it('Should fail if try to cancel invalid buy order', async () => {
      const { diamondAddress, tokenFactory, depositToken, orderFactory, orderExecutor,
        token2, owner, addr2, addr3 } = await loadFixture(deployFixture);

      await tokenFactory.connect(owner).addToken(token2.address);
      await token2.connect(addr2).approve(diamondAddress, 1000);
      await depositToken.connect(addr2).deposit(token2.address, 1000);

      await orderFactory.connect(addr3).placeBuyOrder(token2.address, 10, 100, { value: 10000 });
      await orderFactory.connect(addr3).placeBuyOrder(token2.address, 15, 100, { value: 10000 });

      await expect(orderExecutor.connect(addr3).cancelBuyOrder(token2.address, 123))
      .to.be.revertedWith("There is no such a order");
    })
  })

  describe('cancelSellOrder()', async () => {
    it('Should remote the order when it is canceled', async () => {
      const { diamondAddress, tokenFactory, depositToken, orderFactory, orderExecutor,
        displayOrders, token2, owner, addr2 } = await loadFixture(deployFixture);

      await tokenFactory.connect(owner).addToken(token2.address);
      await token2.connect(addr2).approve(diamondAddress, 100000);
      await depositToken.connect(addr2).deposit(token2.address, 100000);

      await orderFactory.connect(addr2).placeSellOrder(token2.address, 10, 100);
      await orderFactory.connect(addr2).placeSellOrder(token2.address, 15, 100);
      await orderFactory.connect(addr2).placeSellOrder(token2.address, 20, 100);
      await orderFactory.connect(addr2).placeSellOrder(token2.address, 25, 100);
      await orderFactory.connect(addr2).placeSellOrder(token2.address, 30, 100);

      await expect(orderExecutor.connect(addr2).cancelSellOrder(token2.address, 1))
        .to.emit(orderExecutor, "OrderCanceled").withArgs(token2.address, 1)
      
      var topOrders = await displayOrders.connect(addr2).getTopSellOrders(token2.address, 5);
      topOrders.forEach(order => {
        //order with price 10 have to be removed
        expect(parseInt(order.price)).to.not.equal(10);
      });
    })

    it('Should fail if try to cancel invalid sell order', async () => {
      const { diamondAddress, tokenFactory, depositToken, orderFactory, orderExecutor,
        token2, owner, addr2 } = await loadFixture(deployFixture);

      await tokenFactory.connect(owner).addToken(token2.address);
      await token2.connect(addr2).approve(diamondAddress, 100000);
      await depositToken.connect(addr2).deposit(token2.address, 100000);

      await orderFactory.connect(addr2).placeSellOrder(token2.address, 10, 100);
      await orderFactory.connect(addr2).placeSellOrder(token2.address, 15, 10000);

      await expect(orderExecutor.connect(addr2).cancelSellOrder(token2.address, 123))
      .to.be.revertedWith("There is no such a order");
    })
  })

  describe('buyTokens()', async () => {
    it('Should be able to buy tokens and throw error if input is not valid', async () => {
      const { diamondAddress, tokenFactory, depositToken, orderFactory, displayOrders,
        orderExecutor, token2, owner, addr2, addr3 } = await loadFixture(deployFixture);

      await tokenFactory.connect(owner).addToken(token2.address);
      await token2.connect(addr2).approve(diamondAddress, 100000000000000000000n);
      await depositToken.connect(addr2).deposit(token2.address, 100000000000000000000n);

      await orderFactory.connect(addr2).placeSellOrder(token2.address, 200000000000000000n, 20000000000000000000n);
      await orderFactory.connect(addr2).placeSellOrder(token2.address, 100000000000000000n, 25000000000000000000n);
      await orderFactory.connect(addr2).placeSellOrder(token2.address, 2000000000000000000n, 1500000000000000000n);
      await orderFactory.connect(addr2).placeSellOrder(token2.address, 500000000000000000n, 5000000000000000000n);
      await orderFactory.connect(addr2).placeSellOrder(token2.address, 1000000000000000000n, 500000000000000000n);
      await orderFactory.connect(addr2).placeSellOrder(token2.address, 5000000000000000000n, 10000000000000000000n);
    
      await expect(orderExecutor.connect(addr3).buyTokens(token2.address, {
        value: 2500000000000000000n
      })).to.emit(orderExecutor, "TokensPurchased")
         .withArgs(addr3.address, token2.address, 2500000000000000000n, 25000000000000000000n)
      
      var topOrders = await displayOrders.connect(addr2).getTopSellOrders(token2.address, 10);
      expect(topOrders.filter(order => order.id != 0).length).to.be.equal(5);
      expect(topOrders[0].amount.toString()).to.be.equal(20000000000000000000n);
      
      await expect(orderExecutor.connect(addr3).buyTokens(token2.address, {
        value: 0
      })).to.be.revertedWith("Purchase price can not be 0");
         
      await expect(orderExecutor.connect(addr3).buyTokens(token2.address, {
        value: 9900000000000000000000n
      })).to.be.revertedWith("There are not enough tokens on the exchange");

    })
  })

  describe('sellTokens()', async () => {
    it('Should be able to sell tokens and throw error if input is not valid', async () => {
      const { diamondAddress, tokenFactory, depositToken, orderFactory, displayOrders,
        orderExecutor, token2, owner, addr2, addr3 } = await loadFixture(deployFixture);

      await tokenFactory.connect(owner).addToken(token2.address);
      await token2.connect(addr2).approve(diamondAddress, 500000000000000000000n);
      await depositToken.connect(addr2).deposit(token2.address, 500000000000000000000n);

      await orderFactory.connect(addr3).placeBuyOrder(token2.address, 100000000000000000n, 10000000000000000000n, { value: 10000000000000000000n });
      await orderFactory.connect(addr3).placeBuyOrder(token2.address, 150000000000000000n, 10000000000000000000n, { value: 10000000000000000000n });
      await orderFactory.connect(addr3).placeBuyOrder(token2.address, 200000000000000000n, 10000000000000000000n, { value: 10000000000000000000n });
      await orderFactory.connect(addr3).placeBuyOrder(token2.address, 250000000000000000n, 10000000000000000000n, { value: 10000000000000000000n });
      await orderFactory.connect(addr3).placeBuyOrder(token2.address, 300000000000000000n, 10000000000000000000n, { value: 10000000000000000000n });
      await orderFactory.connect(addr3).placeBuyOrder(token2.address, 500000000000000000n, 10000000000000000000n, { value: 10000000000000000000n });

      await expect(orderExecutor.connect(addr2).sellTokens(token2.address, 12500000000000000000n))
        .to.emit(orderExecutor, "TokensSold")
        .withArgs(addr2.address, token2.address, 5750000000000000000n, 12500000000000000000n)
      
      var topOrders = await displayOrders.connect(addr2).getTopBuyOrders(token2.address, 10);
      expect(topOrders.filter(order => order.id != 0).length).to.be.equal(5);
      expect(topOrders[0].amount.toString()).to.be.equal(7500000000000000000n);
      
      await expect(orderExecutor.connect(addr2).sellTokens(token2.address, 0))
        .to.be.revertedWith("Can not sell 0 tokens");
         
      await expect(orderExecutor.connect(owner).sellTokens(token2.address, 1))
        .to.be.revertedWith("Insufficient balance");
    })
  })
  

});
