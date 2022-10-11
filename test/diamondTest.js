/* global describe it before ethers */

const {
    getSelectors,
    FacetCutAction,
    removeSelectors,
    findAddressPositionInFacets
  } = require('../scripts/libraries/diamond.js')
  
  const { deployDiamond } = require('../scripts/deploy.js')
  const { assert } = require('chai')
  const { ethers } = require('hardhat')
  
  describe('DiamondTest', async function () {
    let diamondAddress
    let diamondCutFacet
    let diamondLoupeFacet
    let ownershipFacet
    let accountBalanceFacet
    let depositTokenFacet
    let displayOrdersFacet
    let orderExecutorFacet
    let orderFactoryFacet
    let tokenFactoryFacet
    let withdrawTokenFacet
    let tx
    let receipt
    let result
    const addresses = []
  
    before(async function () {
      const contracts = await deployDiamond(true)
      diamondAddress = contracts['Diamond'];
      diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', diamondAddress)
      diamondLoupeFacet = await ethers.getContractAt('DiamondLoupeFacet', diamondAddress)
      ownershipFacet = await ethers.getContractAt('OwnershipFacet', diamondAddress)
      accountBalanceFacet = await ethers.getContractAt('AccountBalanceFacet', diamondAddress)
      depositTokenFacet = await ethers.getContractAt('DepositTokenFacet', diamondAddress)
      displayOrdersFacet = await ethers.getContractAt('DisplayOrdersFacet', diamondAddress)
      orderExecutorFacet = await ethers.getContractAt('OrderExecutorFacet', diamondAddress)
      orderFactoryFacet = await ethers.getContractAt('OrderFactoryFacet', diamondAddress)
      tokenFactoryFacet = await ethers.getContractAt('TokenFactoryFacet', diamondAddress)
      withdrawTokenFacet = await ethers.getContractAt('WithdrawTokenFacet', diamondAddress)
    })
  
    it('should have 10 facets -- call to facetAddresses function', async () => {
      for (const address of await diamondLoupeFacet.facetAddresses()) {
        addresses.push(address)
      }
      
      assert.equal(addresses.length, 10)
    })
  
    it('facets should have the right function selectors -- call to facetFunctionSelectors function', async () => {
      let selectors = getSelectors(diamondCutFacet)
      result = await diamondLoupeFacet.facetFunctionSelectors(addresses[0])
      assert.sameMembers(result, selectors)
      selectors = getSelectors(diamondLoupeFacet)
      result = await diamondLoupeFacet.facetFunctionSelectors(addresses[1])
      assert.sameMembers(result, selectors)
      selectors = getSelectors(ownershipFacet)
      result = await diamondLoupeFacet.facetFunctionSelectors(addresses[2])
      assert.sameMembers(result, selectors)
      
      selectors = getSelectors(accountBalanceFacet)
      result = await diamondLoupeFacet.facetFunctionSelectors(addresses[3])
      assert.sameMembers(result, selectors)
    })
  
    it('selectors should be associated to facets correctly -- multiple calls to facetAddress function', async () => {
      assert.equal(
        addresses[0],
        await diamondLoupeFacet.facetAddress('0x1f931c1c')
      )
      assert.equal(
        addresses[1],
        await diamondLoupeFacet.facetAddress('0xcdffacc6')
      )
      assert.equal(
        addresses[1],
        await diamondLoupeFacet.facetAddress('0x01ffc9a7')
      )
      assert.equal(
        addresses[2],
        await diamondLoupeFacet.facetAddress('0xf2fde38b')
      )
      assert.equal(
        addresses[3],
        await diamondLoupeFacet.facetAddress('0x5f515226')
      )
      assert.equal(
        addresses[4],
        await diamondLoupeFacet.facetAddress('0x47e7ef24')
      )
      assert.equal(
        addresses[5],
        await diamondLoupeFacet.facetAddress('0x61d8f1c5')
      )
      assert.equal(
        addresses[6],
        await diamondLoupeFacet.facetAddress('0xec8ac4d8')
      )
      assert.equal(
        addresses[7],
        await diamondLoupeFacet.facetAddress('0x360a67c9')
      )
      assert.equal(
        addresses[8],
        await diamondLoupeFacet.facetAddress('0xd48bfca7')
      )
      assert.equal(
        addresses[9],
        await diamondLoupeFacet.facetAddress('0xf3fef3a3')
      )
    })
  
    it('should add test1 functions', async () => {
      const Test1Facet = await ethers.getContractFactory('Test1Facet')
      const test1Facet = await Test1Facet.deploy()
      await test1Facet.deployed()
      addresses.push(test1Facet.address)
      const selectors = getSelectors(test1Facet).remove(['supportsInterface(bytes4)'])
      tx = await diamondCutFacet.diamondCut(
        [{
          facetAddress: test1Facet.address,
          action: FacetCutAction.Add,
          functionSelectors: selectors
        }],
        ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
      receipt = await tx.wait()
      if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`)
      }
      result = await diamondLoupeFacet.facetFunctionSelectors(test1Facet.address)
      assert.sameMembers(result, selectors)
    })
  
    it('should test function call', async () => {
      const test1Facet = await ethers.getContractAt('Test1Facet', diamondAddress)
      await test1Facet.test1Func10()


    })
  
    it('should replace supportsInterface function', async () => {
      const Test1Facet = await ethers.getContractFactory('Test1Facet')
      const selectors = getSelectors(Test1Facet).get(['supportsInterface(bytes4)'])
      const testFacetAddress = addresses[10]
      tx = await diamondCutFacet.diamondCut(
        [{
          facetAddress: testFacetAddress,
          action: FacetCutAction.Replace,
          functionSelectors: selectors
        }],
        ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
      receipt = await tx.wait()
      if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`)
      }
      result = await diamondLoupeFacet.facetFunctionSelectors(testFacetAddress)
      assert.sameMembers(result, getSelectors(Test1Facet))
    })
  
    it('should add test2 functions', async () => {
      const Test2Facet = await ethers.getContractFactory('Test2Facet')
      const test2Facet = await Test2Facet.deploy()
      await test2Facet.deployed()
      addresses.push(test2Facet.address)
      const selectors = getSelectors(test2Facet)
      tx = await diamondCutFacet.diamondCut(
        [{
          facetAddress: test2Facet.address,
          action: FacetCutAction.Add,
          functionSelectors: selectors
        }],
        ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
      receipt = await tx.wait()
      if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`)
      }
      result = await diamondLoupeFacet.facetFunctionSelectors(test2Facet.address)
      assert.sameMembers(result, selectors)
    })
  
    it('should remove some test2 functions', async () => {
      const test2Facet = await ethers.getContractAt('Test2Facet', diamondAddress)
      const functionsToKeep = ['test2Func1()', 'test2Func5()', 'test2Func6()', 'test2Func19()', 'test2Func20()']
      const selectors = getSelectors(test2Facet).remove(functionsToKeep)
      tx = await diamondCutFacet.diamondCut(
        [{
          facetAddress: ethers.constants.AddressZero,
          action: FacetCutAction.Remove,
          functionSelectors: selectors
        }],
        ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
      receipt = await tx.wait()
      if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`)
      }
      result = await diamondLoupeFacet.facetFunctionSelectors(addresses[11])
      assert.sameMembers(result, getSelectors(test2Facet).get(functionsToKeep))
    })
  
    it('should remove some test1 functions', async () => {
      const test1Facet = await ethers.getContractAt('Test1Facet', diamondAddress)
      const functionsToKeep = ['test1Func2()', 'test1Func11()', 'test1Func12()']
      const selectors = getSelectors(test1Facet).remove(functionsToKeep)
      tx = await diamondCutFacet.diamondCut(
        [{
          facetAddress: ethers.constants.AddressZero,
          action: FacetCutAction.Remove,
          functionSelectors: selectors
        }],
        ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
      receipt = await tx.wait()
      if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`)
      }
      result = await diamondLoupeFacet.facetFunctionSelectors(addresses[10])
      assert.sameMembers(result, getSelectors(test1Facet).get(functionsToKeep))
    })
  
    it('remove all functions and facets accept \'diamondCut\' and \'facets\'', async () => {
      let selectors = []
      let facets = await diamondLoupeFacet.facets()
      for (let i = 0; i < facets.length; i++) {
        selectors.push(...facets[i].functionSelectors)
      }
      selectors = removeSelectors(selectors, ['facets()', 'diamondCut(tuple(address,uint8,bytes4[])[],address,bytes)'])
      tx = await diamondCutFacet.diamondCut(
        [{
          facetAddress: ethers.constants.AddressZero,
          action: FacetCutAction.Remove,
          functionSelectors: selectors
        }],
        ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
      receipt = await tx.wait()
      if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`)
      }
      facets = await diamondLoupeFacet.facets()
      assert.equal(facets.length, 2)
      assert.equal(facets[0][0], addresses[0])
      assert.sameMembers(facets[0][1], ['0x1f931c1c'])
      assert.equal(facets[1][0], addresses[1])
      assert.sameMembers(facets[1][1], ['0x7a0ed627'])
    })
  
    it('add most functions and facets', async () => {
      const diamondLoupeFacetSelectors = getSelectors(diamondLoupeFacet).remove(['supportsInterface(bytes4)'])
      const Test1Facet = await ethers.getContractFactory('Test1Facet')
      const Test2Facet = await ethers.getContractFactory('Test2Facet')
      // Any number of functions from any number of facets can be added/replaced/removed in a
      // single transaction
      const cut = [
        {
            facetAddress: addresses[1],
            action: FacetCutAction.Add,
            functionSelectors: diamondLoupeFacetSelectors.remove(['facets()'])
        },
        {
            facetAddress: addresses[2],
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(ownershipFacet)
        },
        {
            facetAddress: addresses[3],
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(accountBalanceFacet)
        },
        {
            facetAddress: addresses[4],
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(depositTokenFacet)
        },
        {
            facetAddress: addresses[5],
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(displayOrdersFacet)
        },
        {
            facetAddress: addresses[6],
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(orderExecutorFacet)
        },
        {
            facetAddress: addresses[7],
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(orderFactoryFacet)
        },
        {
            facetAddress: addresses[8],
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(tokenFactoryFacet)
        },
        {
            facetAddress: addresses[9],
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(withdrawTokenFacet)
        },
        {
            facetAddress: addresses[10],
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(Test1Facet)
        },
        {
            facetAddress: addresses[11],
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(Test2Facet)
        }
      ]
      tx = await diamondCutFacet.diamondCut(cut, ethers.constants.AddressZero, '0x', { gasLimit: 8000000 })
      receipt = await tx.wait()
      if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`)
      }
      const facets = await diamondLoupeFacet.facets()
      const facetAddresses = await diamondLoupeFacet.facetAddresses()
      assert.equal(facetAddresses.length, 12)
      assert.equal(facets.length, 12)
      assert.sameMembers(facetAddresses, addresses)
      assert.equal(facets[0][0], facetAddresses[0])
      assert.equal(facets[1][0], facetAddresses[1])
      assert.equal(facets[2][0], facetAddresses[2])
      assert.equal(facets[3][0], facetAddresses[3])
      assert.equal(facets[4][0], facetAddresses[4])
      assert.equal(facets[5][0], facetAddresses[5])
      assert.equal(facets[6][0], facetAddresses[6])
      assert.equal(facets[7][0], facetAddresses[7])
      assert.equal(facets[8][0], facetAddresses[8])
      assert.equal(facets[9][0], facetAddresses[9])
      assert.equal(facets[10][0], facetAddresses[10])
      assert.equal(facets[11][0], facetAddresses[11])
  
      assert.sameMembers(facets[findAddressPositionInFacets(addresses[0], facets)][1], getSelectors(diamondCutFacet))
      assert.sameMembers(facets[findAddressPositionInFacets(addresses[1], facets)][1], diamondLoupeFacetSelectors)
      assert.sameMembers(facets[findAddressPositionInFacets(addresses[2], facets)][1], getSelectors(ownershipFacet))
      assert.sameMembers(facets[findAddressPositionInFacets(addresses[3], facets)][1], getSelectors(accountBalanceFacet))

      assert.sameMembers(facets[findAddressPositionInFacets(addresses[4], facets)][1], getSelectors(depositTokenFacet))
      assert.sameMembers(facets[findAddressPositionInFacets(addresses[5], facets)][1], getSelectors(displayOrdersFacet))
      assert.sameMembers(facets[findAddressPositionInFacets(addresses[6], facets)][1], getSelectors(orderExecutorFacet))
      assert.sameMembers(facets[findAddressPositionInFacets(addresses[7], facets)][1], getSelectors(orderFactoryFacet))
      assert.sameMembers(facets[findAddressPositionInFacets(addresses[8], facets)][1], getSelectors(tokenFactoryFacet))
      assert.sameMembers(facets[findAddressPositionInFacets(addresses[9], facets)][1], getSelectors(withdrawTokenFacet))

      assert.sameMembers(facets[findAddressPositionInFacets(addresses[10], facets)][1], getSelectors(Test1Facet))
      assert.sameMembers(facets[findAddressPositionInFacets(addresses[11], facets)][1], getSelectors(Test2Facet))
    })
  })
  