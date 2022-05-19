const { expect } = require("chai");
const { expectRevert } = require("@openzeppelin/test-helpers");
const { ethers } = require("hardhat");
// eslint-disable-next-line node/no-extraneous-require
const { formatEther, parseEther, formatUnits, hexZeroPad } = require("@ethersproject/units");
const { isCommunityResourcable } = require("@ethersproject/providers");
const { BigNumber } = require("ethers");
const { deployContract } = require("ethereum-waffle");
const { parse } = require("dotenv");

async function deploy(name, ...params) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then((f) => f.deployed());
}

async function getEventValue(tx, arg, convertBigNumber = false) {
  if (!convertBigNumber) return (await tx.wait()).events[0].args[arg];
  return formatUnits((await tx.wait()).events[0].args[arg], "wei");
}

describe("eSolidar", function () {
  before(async function () {
    // ERC20
    this.usd = await deploy("PrexisTestUSD");
    this.eur = await deploy("PrexisTestEUR");
    this.brl = await deploy("PrexisTestBRL");

    // ERC721
    this.nft = await deploy("ERC721EsolidarSweepstake");
    console.log("ERC721 deployed at", this.nft.address);

    // Sweepstake
    this.sweepstake = await deploy("EsolidarSweepstake", this.nft.address);
    console.log("Sweepstake deployed at", this.sweepstake.address);

    // Set Sweepstake address on ERC721 contract
    await this.nft.setSweepstakeAddress(this.sweepstake.address);

    [this.owner, ...this.addrs] = await ethers.getSigners();

    // Mint ERC20 token to addrs 1, 2 and 3
    await this.usd.mint(this.addrs[1].address, parseEther("1000"));
    await this.usd.mint(this.addrs[2].address, parseEther("1000"));
    await this.usd.mint(this.addrs[3].address, parseEther("1000"));
    await this.usd.mint(this.addrs[4].address, parseEther("1000"));
    await this.usd.mint(this.addrs[5].address, parseEther("1000"));
    await this.usd.mint(this.addrs[6].address, parseEther("1000"));
    await this.usd.mint(this.addrs[7].address, parseEther("1000"));
    await this.usd.mint(this.addrs[8].address, parseEther("1000"));
    await this.usd.mint(this.addrs[9].address, parseEther("1000"));
    await this.usd.mint(this.addrs[10].address, parseEther("1000"));
    await this.usd.mint(this.addrs[11].address, parseEther("1000"));
    await this.usd.mint(this.addrs[12].address, parseEther("1000"));
    await this.usd.mint(this.addrs[13].address, parseEther("1000"));
    await this.usd.mint(this.addrs[14].address, parseEther("1000"));

    await this.usd
      .connect(this.addrs[1])
      .increaseAllowance(this.sweepstake.address, parseEther("1000"));
    await this.usd
      .connect(this.addrs[2])
      .increaseAllowance(this.sweepstake.address, parseEther("1000"));
    await this.usd
      .connect(this.addrs[3])
      .increaseAllowance(this.sweepstake.address, parseEther("1000"));
    await this.usd
      .connect(this.addrs[4])
      .increaseAllowance(this.sweepstake.address, parseEther("1000"));
    await this.usd
      .connect(this.addrs[5])
      .increaseAllowance(this.sweepstake.address, parseEther("1000"));
    await this.usd
      .connect(this.addrs[6])
      .increaseAllowance(this.sweepstake.address, parseEther("1000"));
    await this.usd
      .connect(this.addrs[7])
      .increaseAllowance(this.sweepstake.address, parseEther("1000"));
    await this.usd
      .connect(this.addrs[8])
      .increaseAllowance(this.sweepstake.address, parseEther("1000"));
    await this.usd
      .connect(this.addrs[9])
      .increaseAllowance(this.sweepstake.address, parseEther("1000"));
    await this.usd
      .connect(this.addrs[10])
      .increaseAllowance(this.sweepstake.address, parseEther("1000"));
    await this.usd
      .connect(this.addrs[11])
      .increaseAllowance(this.sweepstake.address, parseEther("1000"));
    await this.usd
      .connect(this.addrs[12])
      .increaseAllowance(this.sweepstake.address, parseEther("1000"));
    await this.usd
      .connect(this.addrs[13])
      .increaseAllowance(this.sweepstake.address, parseEther("1000"));
    await this.usd
      .connect(this.addrs[14])
      .increaseAllowance(this.sweepstake.address, parseEther("1000"));

    this.tokenId = 0;
  });

  describe("Deploy checks", function () {
    it("Should sweepstake owner equal ERC721 address", async function () {
      expect(await this.sweepstake.owner()).to.eq(this.nft.address);
    });
  });

  describe("First donation event", function () {
    it("Should mint ERC721 and automatically create a linked Sweepstake", async function () {
      const tx = await this.nft.connect(this.owner).mint("metadata.json", this.usd.address, 0);

      this.tokenId = await getEventValue(tx, "tokenId", true);

      expect(this.tokenId).to.eq((await this.sweepstake.sweepstakes(this.tokenId)).tokenId);
      expect(this.owner.address).to.eq((await this.sweepstake.sweepstakes(this.tokenId)).owner);
      expect(this.usd.address).to.eq((await this.sweepstake.sweepstakes(this.tokenId)).erc20Token);
      expect(true).to.eq((await this.sweepstake.sweepstakes(this.tokenId)).active);
    });

    it("Should donor #1 can stakes ERC20 token for the first time", async function () {
      await this.sweepstake.connect(this.addrs[1]).stake(this.tokenId, parseEther("100"));

      expect((await this.sweepstake.sweepstakes(this.tokenId)).totalStakedTokens).to.eq(
        parseEther("100")
      );
      expect(await this.sweepstake.erc20TokenPerDonor(this.addrs[1].address, this.tokenId)).to.eq(
        parseEther("100")
      );

      expect(await this.sweepstake.getSweepstakeNumberOfDonors(this.tokenId)).to.eq(1);
    });

    it("Should donor #1 can stakes ERC20 token for the second time", async function () {
      await this.sweepstake.connect(this.addrs[1]).stake(this.tokenId, parseEther("20.50"));

      expect((await this.sweepstake.sweepstakes(this.tokenId)).totalStakedTokens).to.eq(
        parseEther("120.50")
      );
      expect(await this.sweepstake.erc20TokenPerDonor(this.addrs[1].address, this.tokenId)).to.eq(
        parseEther("120.50")
      );

      expect(await this.sweepstake.getSweepstakeNumberOfDonors(this.tokenId)).to.eq(1);
    });

    it("Should donor #2 can stakes ERC20 token for the first time", async function () {
      await this.sweepstake.connect(this.addrs[2]).stake(this.tokenId, parseEther("35"));

      expect((await this.sweepstake.sweepstakes(this.tokenId)).totalStakedTokens).to.eq(
        parseEther("155.5")
      );
      expect(await this.sweepstake.erc20TokenPerDonor(this.addrs[2].address, this.tokenId)).to.eq(
        parseEther("35")
      );

      expect(await this.sweepstake.getSweepstakeNumberOfDonors(this.tokenId)).to.eq(2);
    });

    it("Should donor #3 can stakes ERC20 token for the first time", async function () {
      await this.sweepstake.connect(this.addrs[3]).stake(this.tokenId, parseEther("200"));

      expect((await this.sweepstake.sweepstakes(this.tokenId)).totalStakedTokens).to.eq(
        parseEther("355.5")
      );
      expect(await this.sweepstake.erc20TokenPerDonor(this.addrs[3].address, this.tokenId)).to.eq(
        parseEther("200")
      );

      expect(await this.sweepstake.getSweepstakeNumberOfDonors(this.tokenId)).to.eq(3);
    });

    it("Should donor #3 can stakes ERC20 token for the second time", async function () {
      await this.sweepstake.connect(this.addrs[3]).stake(this.tokenId, parseEther("11"));

      expect((await this.sweepstake.sweepstakes(this.tokenId)).totalStakedTokens).to.eq(
        parseEther("366.5")
      );
      expect(await this.sweepstake.erc20TokenPerDonor(this.addrs[3].address, this.tokenId)).to.eq(
        parseEther("211")
      );

      expect(await this.sweepstake.getSweepstakeNumberOfDonors(this.tokenId)).to.eq(3);
    });
  });

  describe("Sorting", function () {
    it("Should add more donors", async function () {
      await this.sweepstake.connect(this.addrs[4]).stake(this.tokenId, parseEther("10"));
      await this.sweepstake.connect(this.addrs[5]).stake(this.tokenId, parseEther("20"));
      await this.sweepstake.connect(this.addrs[6]).stake(this.tokenId, parseEther("40"));
      await this.sweepstake.connect(this.addrs[7]).stake(this.tokenId, parseEther("80"));
      await this.sweepstake.connect(this.addrs[8]).stake(this.tokenId, parseEther("160"));
      await this.sweepstake.connect(this.addrs[9]).stake(this.tokenId, parseEther("320"));
      await this.sweepstake.connect(this.addrs[10]).stake(this.tokenId, parseEther("680"));
      await this.sweepstake.connect(this.addrs[11]).stake(this.tokenId, parseEther("1"));
      await this.sweepstake.connect(this.addrs[12]).stake(this.tokenId, parseEther("300"));
      await this.sweepstake.connect(this.addrs[13]).stake(this.tokenId, parseEther("200"));
      await this.sweepstake.connect(this.addrs[14]).stake(this.tokenId, parseEther("10"));
    });

    it("Should draw, transfer NFT to winner and tokens to charity", async function () {
      // const donors = await this.sweepstake.getSweepstakeDonorsInfo(0);
      // console.log("donor", donors);

      // const totalStaked = (await this.sweepstake.sweepstakes(0)).totalStakedTokens;

      // console.log();
      // console.log("TotalStaked: ", formatEther(totalStaked));

      // let perc;

      // for (const donor of donors) {
      //   console.log();
      //   console.log("Address: ", donor.donor);
      //   console.log("Staked: ", formatEther(donor.totalStaked));
      //   console.log("Cumulative: ", formatEther(donor.cumulative));
      //   perc = formatUnits(donor.totalStaked.mul(100000).div(totalStaked), "wei");
      //   console.log("%", (perc / 100000) * 100);
      // }

      // console.log();
      // console.log("==== RESULT ====");

      const owner = (await this.sweepstake.sweepstakes(this.tokenId)).owner;
      const totalStaked = (await this.sweepstake.sweepstakes(this.tokenId)).totalStakedTokens;

      const initialBalance = await this.sweepstake.balances(owner);

      const result = await (await this.sweepstake.draw(0)).wait();
      const drawEvent = result.events?.filter((x) => {
        return x.event === "SweepstakeDraw";
      });

      console.log("Winner", drawEvent[0].args.winner);
      expect(await this.nft.ownerOf(this.tokenId)).to.eq(drawEvent[0].args.winner);

      console.log("TotalStaked: ", formatEther(totalStaked));

      expect(totalStaked).to.eq(initialBalance.add(totalStaked));
    });
  });

  describe("Second donation event, with burn token/destroy sweepstake", function () {
    it("Should mint ERC721 and automatically create a linked Sweepstake", async function () {
      const tx = await this.nft.connect(this.owner).mint("metadata.json", this.usd.address, 0);

      this.tokenId = await getEventValue(tx, "tokenId", true);

      expect(this.tokenId).to.eq((await this.sweepstake.sweepstakes(this.tokenId)).tokenId);
      expect(this.owner.address).to.eq((await this.sweepstake.sweepstakes(this.tokenId)).owner);
      expect(this.usd.address).to.eq((await this.sweepstake.sweepstakes(this.tokenId)).erc20Token);
      expect(true).to.eq((await this.sweepstake.sweepstakes(this.tokenId)).active);
    });

    it("Should donor #1 can stakes ERC20 token for the first time", async function () {
      await this.sweepstake.connect(this.addrs[1]).stake(this.tokenId, parseEther("10"));

      expect((await this.sweepstake.sweepstakes(this.tokenId)).totalStakedTokens).to.eq(
        parseEther("10")
      );
      expect(await this.sweepstake.erc20TokenPerDonor(this.addrs[1].address, this.tokenId)).to.eq(
        parseEther("10")
      );

      expect(await this.sweepstake.getSweepstakeNumberOfDonors(this.tokenId)).to.eq(1);
    });

    it("Should donor #2 can stakes ERC20 token for the first time", async function () {
      await this.sweepstake.connect(this.addrs[2]).stake(this.tokenId, parseEther("20"));

      expect((await this.sweepstake.sweepstakes(this.tokenId)).totalStakedTokens).to.eq(
        parseEther("30")
      );
      expect(await this.sweepstake.erc20TokenPerDonor(this.addrs[2].address, this.tokenId)).to.eq(
        parseEther("20")
      );

      expect(await this.sweepstake.getSweepstakeNumberOfDonors(this.tokenId)).to.eq(2);
    });

    it("Should donor #3 can stakes ERC20 token for the first time", async function () {
      await this.sweepstake.connect(this.addrs[3]).stake(this.tokenId, parseEther("45"));

      expect((await this.sweepstake.sweepstakes(this.tokenId)).totalStakedTokens).to.eq(
        parseEther("75")
      );
      expect(await this.sweepstake.erc20TokenPerDonor(this.addrs[3].address, this.tokenId)).to.eq(
        parseEther("45")
      );

      expect(await this.sweepstake.getSweepstakeNumberOfDonors(this.tokenId)).to.eq(3);
    });
  });

  describe("Viewing", function () {
    it("Should return the correct number of donors", async function () {
      expect(formatUnits(await this.sweepstake.getSweepstakeNumberOfDonors(1), "wei")).to.eq("3");
    });
    it("Should return the active sweepstake dataset", async function () {
      // console.log(await this.sweepstake.getActiveSweepstakes());
    });
  });
});
