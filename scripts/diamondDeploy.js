/* global ethers */
/* eslint prefer-const: "off" */

const path = require("path");
const { getSelectors, FacetCutAction } = require('./libraries/diamond.js')

async function deployDiamond(testDeploy) {

  const [contractOwner, addr2, addr3] = await ethers.getSigners();
  const logs = [];
  logs.push("Deploying with account:" + await contractOwner.getAddress());
  logs.push("Account balance:" + (await contractOwner.getBalance()).toString());

  let token1 = await deployContract(contractOwner, "ExchangeToken1");
  let token2 = await deployContract(addr2, "ExchangeToken2");
  let token3 = await deployContract(addr3, "ExchangeToken3");
  
  const contractAddresses = {
    ExchangeToken1: token1.address,
    ExchangeToken2: token2.address,
    ExchangeToken3: token3.address,
  };

  // Deploy DiamondInit
  // DiamondInit provides a function that is called when the diamond is upgraded or deployed to initialize state variables
  // Read about how the diamondCut function works in the EIP2535 Diamonds standard
  const DiamondInit = await ethers.getContractFactory('DiamondInit')
  const diamondInit = await DiamondInit.deploy()
  await diamondInit.deployed()
  logs.push('DiamondInit deployed:' + diamondInit.address);

  // Deploy facets and set the `facetCuts` variable
  logs.push('');
  logs.push('Deploying facets');
  const FacetNames = [
    'DiamondCutFacet',
    'DiamondLoupeFacet',
    'OwnershipFacet',
    'AccountBalanceFacet',
    'DepositTokenFacet',
    'DisplayOrdersFacet',
    'OrderExecutorFacet',
    'OrderFactoryFacet',
    'TokenFactoryFacet',
    'WithdrawTokenFacet'
  ]
  // The `facetCuts` variable is the FacetCut[] that contains the functions to add during diamond deployment
  const facetCuts = [];
  for (const facetName of FacetNames) {
    const facet = await deployContract(contractOwner, facetName);
    
    logs.push(`${facetName} deployed: ${facet.address}`);

    facetCuts.push({
      facetAddress: facet.address,
      action: FacetCutAction.Add,
      functionSelectors: getSelectors(facet)
    });

    contractAddresses[facetName] = facet.address;
  }

  // Creating a function call
  // This call gets executed during deployment and can also be executed in upgrades
  // It is executed with delegatecall on the DiamondInit address.
  let functionCall = diamondInit.interface.encodeFunctionData('init')

  // Setting arguments that will be used in the diamond constructor
  const diamondArgs = {
    owner: contractOwner.address,
    init: diamondInit.address,
    initCalldata: functionCall
  }

  // deploy Diamond
  const Diamond = await ethers.getContractFactory('Diamond')
  const diamond = await Diamond.deploy(facetCuts, diamondArgs)
  await diamond.deployed()
  contractAddresses['Diamond'] = diamond.address;

  logs.push('');
  logs.push('Diamond deployed:' + diamond.address);

  saveContractAddress(contractAddresses);
  saveFrontendFiles(contractOwner, 'Diamond');

  if (!testDeploy) {
    logs.forEach(log => {
      console.log(log);
    });
    
    console.log('Seed some data');
    const tokenFactory = await ethers.getContractAt('TokenFactoryFacet', diamond.address);
    const depositToken = await ethers.getContractAt('DepositTokenFacet', diamond.address);
    const orderFactory = await ethers.getContractAt('OrderFactoryFacet', diamond.address);
      
    await tokenFactory.connect(contractOwner).addToken(token1.address);
    await tokenFactory.connect(contractOwner).addToken(token2.address);
    await tokenFactory.connect(contractOwner).addToken(token3.address);
    await token1.connect(contractOwner).approve(diamond.address, 100000000000000000000n);
    await depositToken.connect(contractOwner).deposit(token1.address, 100000000000000000000n);

    await orderFactory.connect(contractOwner).placeSellOrder(token1.address, 200000000000000000n, 20000000000000000000n);
    await orderFactory.connect(contractOwner).placeSellOrder(token1.address, 100000000000000000n, 25000000000000000000n);
    await orderFactory.connect(contractOwner).placeSellOrder(token1.address, 2000000000000000000n, 1500000000000000000n);
    await orderFactory.connect(contractOwner).placeSellOrder(token1.address, 500000000000000000n, 5000000000000000000n);
    await orderFactory.connect(contractOwner).placeSellOrder(token1.address, 1000000000000000000n, 500000000000000000n);
    await orderFactory.connect(contractOwner).placeSellOrder(token1.address, 5000000000000000000n, 10000000000000000000n);
  
    await orderFactory.connect(contractOwner).placeBuyOrder(
      token2.address, 
      ethers.utils.parseEther("2"), 
      ethers.utils.parseEther("5"),
      {
        value: ethers.utils.parseEther("10")
      }
    );
  
    await orderFactory.connect(contractOwner).placeBuyOrder(
      token2.address, 
      ethers.utils.parseEther("0.01"), 
      ethers.utils.parseEther("1"),
      {
        value: ethers.utils.parseEther("0.1")
      }
    );
  }


  // return the address of the diamond
  return contractAddresses
}

async function SeedData() {}

async function deployContract(owner, contractName) {
  const Contract = await ethers.getContractFactory(contractName);
  const contract = await Contract.connect(owner).deploy();
  await contract.deployed();

  // We also save the contract's artifacts and address in the frontend directory
  saveFrontendFiles(contract, contractName);

  return contract;
}

function saveFrontendFiles(contract, contractName) {
  const fs = require("fs");
  const contractsDir = path.join(__dirname, "..", "frontend", "src", "contracts");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  const TokenArtifact = artifacts.readArtifactSync(contractName);

  fs.writeFileSync(
    path.join(contractsDir, contractName + ".json"),
    JSON.stringify(TokenArtifact, null, 2)
  );
}

function saveContractAddress(data) {
  const fs = require("fs");
  const contractsDir = path.join(__dirname, "..", "frontend", "src", "contracts");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    path.join(contractsDir, "contract-address.json"),
    JSON.stringify(data, undefined, 2)
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
if (require.main === module) {
  deployDiamond()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}

exports.deployDiamond = deployDiamond