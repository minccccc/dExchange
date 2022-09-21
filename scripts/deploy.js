const path = require("path");

async function main() {
  // ethers is available in the global scope
  const [exhangeOwner, addr2, addr3] = await ethers.getSigners();
  console.log(
    "Deploying the contracts with the account:",
    await exhangeOwner.getAddress()
  );

  console.log("Account balance:", (await exhangeOwner.getBalance()).toString());

  let token1 = await deployContract(exhangeOwner, "ExchangeToken1");
  let token2 = await deployContract(addr2, "ExchangeToken2");
  let token3 = await deployContract(addr3, "ExchangeToken3");
  let dExchange = await deployContract(exhangeOwner, "DExchange");

  saveContractAddress({
    ExchangeToken1: token1.address,
    ExchangeToken2: token2.address,
    ExchangeToken3: token3.address,
    DExchange: dExchange.address
  });

  //seed some data
  await dExchange.connect(exhangeOwner).addToken(token1.address);
  await dExchange.connect(exhangeOwner).addToken(token2.address);
  await dExchange.connect(exhangeOwner).addToken(token3.address);
  await token1.connect(exhangeOwner).approve(dExchange.address, 100000000000000000000n);
  await dExchange.connect(exhangeOwner).deposit(token1.address, 100000000000000000000n);

  await dExchange.connect(exhangeOwner).placeSellOrder(token1.address, 200000000000000000n, 20000000000000000000n);
  await dExchange.connect(exhangeOwner).placeSellOrder(token1.address, 100000000000000000n, 25000000000000000000n);
  await dExchange.connect(exhangeOwner).placeSellOrder(token1.address, 2000000000000000000n, 1500000000000000000n);
  await dExchange.connect(exhangeOwner).placeSellOrder(token1.address, 500000000000000000n, 5000000000000000000n);
  await dExchange.connect(exhangeOwner).placeSellOrder(token1.address, 1000000000000000000n, 500000000000000000n);
  await dExchange.connect(exhangeOwner).placeSellOrder(token1.address, 5000000000000000000n, 10000000000000000000n);

  await dExchange.connect(exhangeOwner).placeBuyOrder(
    token2.address, 
    ethers.utils.parseEther("2"), 
    ethers.utils.parseEther("5"),
    {
      value: ethers.utils.parseEther("10")
    });

  await dExchange.connect(exhangeOwner).placeBuyOrder(
    token2.address, 
    ethers.utils.parseEther("0.01"), 
    ethers.utils.parseEther("1"),
    {
      value: ethers.utils.parseEther("0.1")
    });

}

async function deployContract(owner, contractName) {
  const Contract = await ethers.getContractFactory(contractName);
  const contract = await Contract.connect(owner).deploy();
  await contract.deployed();

  console.log(contractName, "contract address:", contract.address);

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

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
