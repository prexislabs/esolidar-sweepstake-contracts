const hre = require("hardhat");
const { deployments, getNamedAccounts } = hre;

(async () => {
  const contracts = await deployments.all();

  const ERC721 = await hre.ethers.getContractFactory("ERC721EsolidarSweepstake");
  const erc721 = await ERC721.attach(contracts.ERC721EsolidarSweepstake.receipt.contractAddress);

  // Set sweepstake address on ERC721 contract
  const tx1 = await erc721.setSweepstakeAddress(
    contracts.EsolidarSweepstake.receipt.contractAddress
  );
  console.log("setSweepstakeAddress Tx", (await tx1.wait()).transactionHash);

  // Configure baseURI on ERC721 contract
  const baseURI = "ifps://";
  const tx2 = await erc721.setBaseURI(baseURI);
  console.log("setBaseURI Tx", (await tx2.wait()).transactionHash);
})();
