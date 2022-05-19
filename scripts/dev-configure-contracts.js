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

  await erc721.grantRole(
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x1894db8106b6a2694915abffd4cd6be86985641c"
  );
  await erc721.grantRole(
    "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6",
    "0xe2803E34B6591BCBeB519A36D4C928A2E6b366d8"
  );
  await erc721.grantRole(
    "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6",
    "0xdBdE35C639A9D1Fc6Bc662ec4335611f0e0Cd3ec"
  );
})();
