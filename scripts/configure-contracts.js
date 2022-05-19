const hre = require("hardhat");
const { deployments, getNamedAccounts } = hre;

(async () => {
  const contracts = await deployments.all();

  const ERC721 = await hre.ethers.getContractFactory("ERC721EsolidarSweepstake");
  const erc721 = await ERC721.attach(contracts.ERC721EsolidarSweepstake.receipt.contractAddress);

  const tx = await erc721.setSweepstakeAddress(
    contracts.EsolidarSweepstake.receipt.contractAddress
  );
  console.log("Tx", (await tx.wait()).transactionHash);
})();
