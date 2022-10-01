const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("DExchange contract", function () {
  async function deployFixture() {
    const [owner, addr2, addr3] = await ethers.getSigners();
    const dExchange = await deployExchangeToken(owner, "DExchange");
    const token1 = await deployExchangeToken(owner, "ExchangeToken1");
    const token2 = await deployExchangeToken(addr2, "ExchangeToken2");
    const token3 = await deployExchangeToken(addr3, "ExchangeToken3");

    return { dExchange, token1, token2, token3, owner, addr2, addr3 };
  }

  async function deployExchangeToken(owner, contractName) {
    const contract = await ethers.getContractFactory(contractName);
    const token = await contract.connect(owner).deploy();
    await token.deployed();
    return token;
  }

  // You can nest describe calls to create subsections.
  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { dExchange, owner } = await loadFixture(deployFixture);

      expect(await dExchange.owner()).to.equal(owner.address);
    });
  });
  
  describe('addToken()', async () => {
    it('The owner should be able to add new tokens to the exchange', async () => {
      const { dExchange, token1, owner } = await loadFixture(deployFixture);
      await dExchange.connect(owner).addToken(token1.address);
    })
    
    it('Should revert the transaction if the token is already added in the exchange', async () => {
      const { dExchange, token1, owner } = await loadFixture(deployFixture);

      await dExchange.connect(owner).addToken(token1.address);
      await expect(dExchange.connect(owner).addToken(token1.address))
        .to.be.revertedWith("This token is already listed on the exchange");
    })
    
    it('Should revert the transaction if the token address is empty', async () => {
      const { dExchange, owner } = await loadFixture(deployFixture);

      await expect(dExchange.connect(owner).addToken('0x0000000000000000000000000000000000000000'))
        .to.be.revertedWith("Listed token address is empty");
    })

    it('Only owner can add new tokens to the exchange', async () => {
      const { dExchange, token1, addr2 } = await loadFixture(deployFixture);
      
      await expect(dExchange.connect(addr2).addToken(token1.address))
        .to.be.revertedWith("Only the owner can add tokens into the exchange");
    })
  
    it('All added tokens have to be in "listedTokens"', async () => {
      const { dExchange, token1, token2, token3, owner } = await loadFixture(deployFixture);

      await dExchange.connect(owner).addToken(token1.address);
      await dExchange.connect(owner).addToken(token2.address);

      expect((await dExchange.listedTokens(token1.address)).name).to.equal('ExchangeToken1');
      expect((await dExchange.listedTokens(token2.address)).name).to.equal('ExchangeToken2');
      expect((await dExchange.listedTokens(token3.address)).name).to.equal('');
    })
    
  })

  describe('deposit()', async () => {
    it('Should be able to deposit tokens and emit "TokensDeposited" event', async () => {
      const { dExchange, token2, owner, addr2 } = await loadFixture(deployFixture);
      await dExchange.connect(owner).addToken(token2.address);
      var amount = 1000;
    
      await token2.connect(addr2).approve(dExchange.address, amount);
      await expect(dExchange.connect(addr2).deposit(token2.address, amount))
        .to.emit(dExchange, "TokensDeposited").withArgs(addr2.address, token2.address, amount)

      //second deposit
      await token2.connect(addr2).approve(dExchange.address, amount);    
      await expect(dExchange.connect(addr2).deposit(token2.address, amount))
        .to.emit(dExchange, "TokensDeposited").withArgs(addr2.address, token2.address, amount);
    
      expect(await token2.balanceOf(addr2.address)).to.equal(999999999999999998000n);
      expect(await token2.balanceOf(dExchange.address)).to.equal(2000);
    })

    it('Should fail if the transfer is not approved', async () => {
      const { dExchange, token2, owner, addr2 } = await loadFixture(deployFixture);
      await dExchange.connect(owner).addToken(token2.address);

      await expect(dExchange.connect(addr2).deposit(token2.address, 1000))
        .to.be.revertedWith("ERC20: insufficient allowance");
    })

    it('Should fail if the token is not listed to the exchange', async () => {
      const { dExchange, token2, addr2 } = await loadFixture(deployFixture);

      await token2.connect(addr2).approve(dExchange.address, 1000);
      await expect(dExchange.connect(addr2).deposit(token2.address, 1000))
        .to.be.revertedWith("This token is not listed on the exchange");
    }) 
  })

  describe('withdraw()', async () => {
    it('Should be able to withdraw tokens and emit "Withdrawn" event', async () => {
      const { dExchange, token2, owner, addr2 } = await loadFixture(deployFixture);

      await dExchange.connect(owner).addToken(token2.address);
      await token2.connect(addr2).approve(dExchange.address, 1000);
      await dExchange.connect(addr2).deposit(token2.address, 1000);

      expect(await token2.balanceOf(addr2.address)).to.equal(999999999999999999000n);
      expect(await token2.balanceOf(dExchange.address)).to.equal(1000);

      await expect(dExchange.connect(addr2).withdraw(token2.address, 1000))
        .to.emit(dExchange, "Withdrawn").withArgs(addr2.address, token2.address, 1000)

      expect(await token2.balanceOf(addr2.address)).to.equal(1000000000000000000000n);
      expect(await token2.balanceOf(dExchange.address)).to.equal(0);
    })

    it('Should fail if the balance is insufficient', async () => {
      const { dExchange, token2, owner, addr2 } = await loadFixture(deployFixture);

      await dExchange.connect(owner).addToken(token2.address);
      await token2.connect(addr2).approve(dExchange.address, 1000);
      await dExchange.connect(addr2).deposit(token2.address, 1000);

      await expect(dExchange.connect(addr2).withdraw(token2.address, 2000))
        .to.be.revertedWith("Insufficient balance");
    })

    it('Should fail if the token is not listed to the exchange', async () => {
      const { dExchange, token2, addr2 } = await loadFixture(deployFixture);

      await expect(dExchange.connect(addr2).withdraw(token2.address, 1000))
        .to.be.revertedWith("This token is not listed on the exchange");
    }) 
  })
  
  //TODO - test with multiple orders for the same price
  describe('placeSellOrder()', async () => {
    it('Should be able to place multiple sell order', async () => {
      const { dExchange, token2, owner, addr2 } = await loadFixture(deployFixture);
      await dExchange.connect(owner).addToken(token2.address);
      await token2.connect(addr2).approve(dExchange.address, 1000);
      await dExchange.connect(addr2).deposit(token2.address, 1000);

      await expect(dExchange.connect(addr2).placeSellOrder(token2.address, 2, 250))
        .to.emit(dExchange, "SellOrderPlaced").withArgs(token2.address, 2, 250)

      expect(await dExchange.connect(addr2).checkBalance(token2.address)).to.equal(750);

      await expect(dExchange.connect(addr2).placeSellOrder(token2.address, 0, 250))
        .to.be.revertedWith("Order price can not be 0");
        
      await expect(dExchange.connect(addr2).placeSellOrder(token2.address, 2, 0))
        .to.be.revertedWith("Order token amount can not be 0");
      
      await expect(dExchange.connect(addr2).placeSellOrder(token2.address, 0, 0))
        .to.be.revertedWith("Order token amount can not be 0");
        
      expect(await dExchange.connect(addr2).checkBalance(token2.address)).to.equal(750);
    })

    it('Should fail if try to place sell order > current balance', async () => {
      const { dExchange, token2, owner, addr2 } = await loadFixture(deployFixture);
      await dExchange.connect(owner).addToken(token2.address);
      await token2.connect(addr2).approve(dExchange.address, 1000);
      await dExchange.connect(addr2).deposit(token2.address, 1000);

      await expect(dExchange.connect(addr2).placeSellOrder(token2.address, 2, 2000))
        .to.be.revertedWith("Insufficient balance");
    })

    it('Should fail if try to place order for token which is not listed', async () => {
      const { dExchange, token2, owner, addr2 } = await loadFixture(deployFixture);

      await expect(dExchange.connect(addr2).placeSellOrder(token2.address, 2, 2000))
        .to.be.revertedWith("This token is not listed on the exchange");
    })
  })

  //TODO - test with multiple orders for the same price
  describe('placeBuyOrder()', async () => {
    it('Should be able to place multiple buy order', async () => {
      const { dExchange, token2, owner, addr2, addr3 } = await loadFixture(deployFixture);
      await dExchange.connect(owner).addToken(token2.address);
      await token2.connect(addr2).approve(dExchange.address, 1000);
      await dExchange.connect(addr2).deposit(token2.address, 1000);

      await expect(dExchange.connect(addr3).placeBuyOrder(token2.address, 10, 100, {
        value: 1000
      })).to.emit(dExchange, "BuyOrderPlaced").withArgs(token2.address, 10, 100)
      
      await expect(dExchange.connect(addr3).placeBuyOrder(token2.address, 10, 100, {
        value: 1000
      })).to.emit(dExchange, "BuyOrderPlaced").withArgs(token2.address, 10, 100)

      await expect(dExchange.connect(addr3).placeBuyOrder(token2.address, 7, 100, {
        value: 100
      })).to.be.revertedWith("Insufficient ethers sent");
      
      await expect(dExchange.connect(addr3).placeBuyOrder(token2.address, 0, 100, {
        value: 100
      })).to.be.revertedWith("Order price can not be 0");
      
      await expect(dExchange.connect(addr3).placeBuyOrder(token2.address, 7, 0, {
        value: 100
      })).to.be.revertedWith("Order token amount can not be 0");

      await expect(dExchange.connect(addr3).placeBuyOrder(token2.address, 7, 100, {
        value: 0
      })).to.be.revertedWith("Insufficient ethers sent");

      await expect(dExchange.connect(addr3).placeBuyOrder(token2.address, 0, 0, {
        value: 0
      })).to.be.revertedWith("Order token amount can not be 0");

    })

    it('Should fail if try to place order for token which is not listed', async () => {
      const { dExchange, token2, addr3 } = await loadFixture(deployFixture);

      await expect(dExchange.connect(addr3).placeBuyOrder(token2.address, 5, 100, {
        value: 500
      })).to.be.revertedWith("This token is not listed on the exchange");
    })
  })

  describe('getTopBuyOrders()', async () => {
    it('Should be able to place 15 buy orders and to return top 10 ordered by price', async () => {
      const { dExchange, token2, owner, addr2, addr3 } = await loadFixture(deployFixture);
      await dExchange.connect(owner).addToken(token2.address);
      await token2.connect(addr2).approve(dExchange.address, 1000);
      await dExchange.connect(addr2).deposit(token2.address, 1000);

      await dExchange.connect(addr3).placeBuyOrder(token2.address, 10, 100, { value: 10000 });
      await dExchange.connect(addr3).placeBuyOrder(token2.address, 15, 100, { value: 10000 });
      await dExchange.connect(addr3).placeBuyOrder(token2.address, 20, 100, { value: 10000 });
      await dExchange.connect(addr3).placeBuyOrder(token2.address, 25, 100, { value: 10000 });
      await dExchange.connect(addr3).placeBuyOrder(token2.address, 30, 100, { value: 10000 });
      await dExchange.connect(addr3).placeBuyOrder(token2.address, 5, 100, { value: 10000 });
      await dExchange.connect(addr3).placeBuyOrder(token2.address, 50, 100, { value: 10000 });
      await dExchange.connect(addr3).placeBuyOrder(token2.address, 17, 100, { value: 10000 });
      await dExchange.connect(addr3).placeBuyOrder(token2.address, 1, 100, { value: 10000 });
      await dExchange.connect(addr3).placeBuyOrder(token2.address, 28, 100, { value: 10000 });
      await dExchange.connect(addr3).placeBuyOrder(token2.address, 55, 100, { value: 10000 });
      await dExchange.connect(addr3).placeBuyOrder(token2.address, 4, 100, { value: 10000 });
      await dExchange.connect(addr3).placeBuyOrder(token2.address, 3, 100, { value: 10000 });
      await dExchange.connect(addr3).placeBuyOrder(token2.address, 2, 100, { value: 10000 });
      await dExchange.connect(addr3).placeBuyOrder(token2.address, 8, 100, { value: 10000 });
      
      var expectedOrder = [55, 50, 30, 28, 25, 20, 17, 15, 10, 8];
      
      var topOrders = await dExchange.connect(addr3).getTopBuyOrders(token2.address);
      topOrders.forEach(order => {
        expect(parseInt(order.price)).to.equal(expectedOrder.shift());
      });
    })


    // it('Should fail if try to place order for token which is not listed', async () => {
    //   const { dExchange, token2, addr3 } = await loadFixture(deployFixture);

    //   await expect(dExchange.connect(addr3).placeBuyOrder(token2.address, 5, 100, {
    //     value: 500
    //   })).to.be.revertedWith("This token is not listed on the exchange");
    // })
  })

  //TODO: Test "cancelBuyOrder", "cancelSellOrder"

    
  describe('getTopSellOrders()', async () => {
    it('Should be able to place multiple sell orders and to return top 10 ordered by price', async () => {
      const { dExchange, token2, owner, addr2, addr3 } = await loadFixture(deployFixture);
      await dExchange.connect(owner).addToken(token2.address);
      await token2.connect(addr2).approve(dExchange.address, 1000);
      await dExchange.connect(addr2).deposit(token2.address, 1000);

      await dExchange.connect(addr2).placeSellOrder(token2.address, 4, 200);
      await dExchange.connect(addr2).placeSellOrder(token2.address, 3, 250);
      await dExchange.connect(addr2).placeSellOrder(token2.address, 20, 15);
      await dExchange.connect(addr2).placeSellOrder(token2.address, 100, 10);
      await dExchange.connect(addr2).placeSellOrder(token2.address, 5, 50);
      await dExchange.connect(addr2).placeSellOrder(token2.address, 10, 5);
      await dExchange.connect(addr2).placeSellOrder(token2.address, 50, 100);
      await dExchange.connect(addr2).placeSellOrder(token2.address, 250, 5);
      await dExchange.connect(addr2).placeSellOrder(token2.address, 1, 15);
      await dExchange.connect(addr2).placeSellOrder(token2.address, 14, 15);

      var expectedOrder = [1, 3, 4, 5, 10, 14, 20, 50, 100, 250];
      
      var topOrders = await dExchange.connect(addr2).getTopSellOrders(token2.address);
      topOrders.forEach(order => {
        expect(parseInt(order.price)).to.equal(expectedOrder.shift());
      });
    })
  })




  // describe('buyTokens()', async () => {

  //   it('Allows user to instantly purchase tokens for a fixed price', async () => {
  //     const { dExchange, token1, token2, token3, owner, addr2, addr3 } = await loadFixture(deployFixture);

  //     await dExchange.addToken(token2.address);
  //     let ownerBalance = await dExchange.checkBalance();
  //     let addr2Balance = await dExchange.connect(addr2).checkBalance();
  //     let addr3Balance = await dExchange.connect(addr3).checkBalance();

  //     console.log(ownerBalance.toString());
  //     console.log(addr2Balance.toString());
  //     console.log(addr3Balance.toString());

  //     // const { dExchange, owner, addr2, addr3 } = await loadFixture(deployFixture);
  //     await dExchange.connect(addr2).buyTokens(20000);
      
  //     expect(await dExchange.tokenBalance()).to.equal(999999999999960000n);
  //     expect(await dExchange.balances(addr2.address)).to.equal(40000n);
  //     expect(await dExchange.balances(owner.address)).to.equal(0);
  //     expect(await dExchange.balances(addr3.address)).to.equal(0);
  //   })

  //   it('Should emit TokensPurchased event', async () => {
      
  //     const { dExchange, owner, addr2, addr3 } = await loadFixture(deployFixture);

  //     let amount = 50;
  //     let rate = (await dExchange.rate()).toString();

  //     await expect(dExchange.connect(addr2).buyTokens(amount))
  //       .to.emit(dExchange, "TokensPurchased").withArgs(addr2.address, amount * rate, rate)
  //   })
  // })

  // describe('sellTokens()', async () => {

  //   it('Allows user to instantly sell tokens for a fixed price', async () => {

  //     const { dExchange, owner, addr2, addr3 } = await loadFixture(deployFixture);
  //     let amount = 20000;
  //     let rate = (await dExchange.rate()).toString();
  //     //first we have to buy some tokens
  //     await dExchange.connect(addr2).buyTokens(amount);
  //     await dExchange.connect(addr2).sellTokens(amount * rate);
      
  //     expect(await dExchange.balances(addr2.address)).to.equal(0);
  //     expect(await dExchange.balances(owner.address)).to.equal(0);
  //     expect(await dExchange.balances(addr3.address)).to.equal(0);
  //   })
    
  //   it('Should not allow to send more tokens than the balance of the exchange', async () => {

  //     const { dExchange, owner, addr2, addr3 } = await loadFixture(deployFixture);
      
  //     await expect(dExchange.connect(addr2).sellTokens(20000))
  //       .to.be.revertedWith("There are not enough ethers in the exchange");
  //   })

  //   it('Should emit TokensSold event', async () => {
      
  //     const { dExchange, owner, addr2, addr3 } = await loadFixture(deployFixture);
  //     //first we have to buy some tokens
  //     await dExchange.connect(addr2).buyTokens(20000);

  //     let amount = 50;
  //     let rate = (await dExchange.rate()).toString();

  //     console.log(rate)

  //     await expect(dExchange.connect(addr2).sellTokens(amount))
  //       .to.emit(dExchange, "TokensSold").withArgs(addr2.address, amount, rate)
  //   })
  // })

});
