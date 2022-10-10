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

  if (!testDeploy) {
    logs.forEach(log => {
      console.log(log);
    });
  }

  //TODO: seed some data


  // returning the address of the diamond
  return contractAddresses
}

async function deployContract(owner, contractName) {
  const Contract = await ethers.getContractFactory(contractName);
  const contract = await Contract.connect(owner).deploy();
  await contract.deployed();

  return contract;
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