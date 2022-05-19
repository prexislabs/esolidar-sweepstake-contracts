module.exports = async ({ getNamedAccounts, deployments, getChainId, getUnnamedAccounts }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const erc721 = await deploy("ERC721EsolidarSweepstake", {
    from: deployer,
    log: true,
  });

  const brl = await deploy("PrexisTestBRL", { from: deployer, log: true, });
  const eur = await deploy("PrexisTestEUR", { from: deployer, log: true, });
  const usd = await deploy("PrexisTestUSD", { from: deployer, log: true, });

  await deploy("EsolidarSweepstake", {
    from: deployer,
    log: true,
    args: [erc721.receipt.contractAddress]
  });

};
module.exports.tags = ["ESolidar"];
