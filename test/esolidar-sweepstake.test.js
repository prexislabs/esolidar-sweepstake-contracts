const { expect } = require("chai");
const { expectRevert } = require("@openzeppelin/test-helpers");
const { ethers } = require("hardhat");
// eslint-disable-next-line node/no-extraneous-require
const { formatEther, parseEther, formatUnits, hexZeroPad } = require("@ethersproject/units");
const { isCommunityResourcable } = require("@ethersproject/providers");
const { BigNumber } = require("ethers");
const { deployContract } = require("ethereum-waffle");
const { parse } = require("dotenv");
const { convertObjectToArray } = require("ioredis/built/utils");

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

    const amount = parseEther("1000");

    // Mint ERC20 token to addrs 1, 2 and 3
    await this.usd.mint(this.addrs[1].address, amount);
    await this.usd.mint(this.addrs[2].address, amount);
    await this.usd.mint(this.addrs[3].address, amount);
    await this.usd.mint(this.addrs[4].address, amount);
    await this.usd.mint(this.addrs[5].address, amount);
    await this.usd.mint(this.addrs[6].address, amount);
    await this.usd.mint(this.addrs[7].address, amount);
    await this.usd.mint(this.addrs[8].address, amount);
    await this.usd.mint(this.addrs[9].address, amount);
    await this.usd.mint(this.addrs[10].address, amount);
    await this.usd.mint(this.addrs[11].address, amount);
    await this.usd.mint(this.addrs[12].address, amount);
    await this.usd.mint(this.addrs[13].address, amount);
    await this.usd.mint(this.addrs[14].address, amount);

    await this.usd.connect(this.addrs[1]).increaseAllowance(this.sweepstake.address, amount);
    await this.usd.connect(this.addrs[2]).increaseAllowance(this.sweepstake.address, amount);
    await this.usd.connect(this.addrs[3]).increaseAllowance(this.sweepstake.address, amount);
    await this.usd.connect(this.addrs[4]).increaseAllowance(this.sweepstake.address, amount);
    await this.usd.connect(this.addrs[5]).increaseAllowance(this.sweepstake.address, amount);
    await this.usd.connect(this.addrs[6]).increaseAllowance(this.sweepstake.address, amount);
    await this.usd.connect(this.addrs[7]).increaseAllowance(this.sweepstake.address, amount);
    await this.usd.connect(this.addrs[8]).increaseAllowance(this.sweepstake.address, amount);
    await this.usd.connect(this.addrs[9]).increaseAllowance(this.sweepstake.address, amount);
    await this.usd.connect(this.addrs[10]).increaseAllowance(this.sweepstake.address, amount);
    await this.usd.connect(this.addrs[11]).increaseAllowance(this.sweepstake.address, amount);
    await this.usd.connect(this.addrs[12]).increaseAllowance(this.sweepstake.address, amount);
    await this.usd.connect(this.addrs[13]).increaseAllowance(this.sweepstake.address, amount);
    await this.usd.connect(this.addrs[14]).increaseAllowance(this.sweepstake.address, amount);

    this.tokenId = 0;
  });

  describe("Deploy checks", function () {
    it("Should sweepstake owner equal ERC721 address", async function () {
      expect(await this.sweepstake.owner()).to.eq(this.nft.address);
    });
  });

  describe("First donation event", function () {
    it("Should mint ERC721 and automatically create a linked Sweepstake", async function () {
      const tx = await this.nft.connect(this.owner).mint("metadata0.json", this.usd.address, 0);

      this.tokenId = await getEventValue(tx, "tokenId", true);

      expect(this.tokenId).to.eq((await this.sweepstake.sweepstakes(this.tokenId)).tokenId);
      expect(this.owner.address).to.eq((await this.sweepstake.sweepstakes(this.tokenId)).owner);
      expect(this.usd.address).to.eq((await this.sweepstake.sweepstakes(this.tokenId)).erc20Token);
      expect(true).to.eq((await this.sweepstake.sweepstakes(this.tokenId)).active);
    });

    it("Should not transfer when sweepstake is active", async function () {
      await expect(
        this.nft
          .connect(this.owner)
          .transferFrom(this.owner.address, this.addrs[1].address, this.tokenId)
      ).to.be.revertedWith("ERC721S: Sweepstake is active");
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
      const ownerAddress = (await this.sweepstake.sweepstakes(this.tokenId)).owner;

      const totalStaked = (await this.sweepstake.sweepstakes(this.tokenId)).totalStakedTokens;

      const initialBalance = await this.sweepstake.balanceOf(
        ownerAddress,
        (
          await this.sweepstake.sweepstakes(this.tokenId)
        ).erc20Token
      );

      const result = await (await this.sweepstake.draw(0)).wait();
      const drawEvent = result.events?.filter((x) => {
        return x.event === "SweepstakeDraw";
      });

      // console.log("Winner", drawEvent[0].args.winner);

      expect(await this.nft.ownerOf(this.tokenId)).to.eq(drawEvent[0].args.winner);

      expect(totalStaked).to.eq(initialBalance.add(totalStaked));

      await this.sweepstake
        .connect(this.owner)
        .withdraw((await this.sweepstake.sweepstakes(this.tokenId)).erc20Token);

      expect(
        await this.sweepstake.balanceOf(
          ownerAddress,
          (
            await this.sweepstake.sweepstakes(this.tokenId)
          ).erc20Token
        )
      ).to.eq("0");

      expect(await this.usd.balanceOf(ownerAddress)).to.eq(totalStaked);
    });

    it("Should winner can transfer NFT", async function () {
      const winnerAddress = (await this.sweepstake.sweepstakes(0)).winner;

      const winner = this.addrs.find((o) => o.address === winnerAddress);

      await this.nft.connect(winner).transferFrom(winnerAddress, this.addrs[9].address, 0);

      expect(await this.nft.ownerOf(0)).to.eq(this.addrs[9].address);
    });
  });

  describe("Second donation event, with burn token/destroy sweepstake", function () {
    it("Should mint ERC721 and automatically create a linked Sweepstake", async function () {
      const tx = await this.nft.connect(this.owner).mint("metadata_01.json", this.usd.address, 0);

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

    it("Should cancel de sweepstake burning the ERC721 token", async function () {
      await this.nft.connect(this.owner).burn(this.tokenId);
    });
  });

  describe("BaseURI", function () {
    it("Should baseURI is empty", async function () {
      expect(await this.nft.baseURI()).to.eq("");
    });

    it("Should set baseURI", async function () {
      await this.nft.connect(this.owner).setBaseURI("https://example.com/");
      expect(await this.nft.baseURI()).to.eq("https://example.com/");
    });

    it("Should NOT set baseURI - unauthorized", async function () {
      await expectRevert(
        this.nft.connect(this.addrs[1]).setBaseURI("https://example.com/"),
        "AccessControl: account " +
          this.addrs[1].address.toLowerCase() +
          " is missing role 0x0000000000000000000000000000000000000000000000000000000000000000"
      );
    });

    it("Should tokenURI from token 0 is https://example.com/metadata0.json", async function () {
      expect(await this.nft.tokenURI(0)).to.eq("https://example.com/metadata0.json");
    });

    it("Should NOT get tokenURI, NFT burned", async function () {
      await expectRevert(this.nft.tokenURI(1), "ERC721: owner query for nonexistent token");
    });

    it("Should mint new NFT and get tokenURI", async function () {
      const tx = await this.nft.connect(this.owner).mint("metadataX.json", this.usd.address, 0);
      this.tokenId = await getEventValue(tx, "tokenId", true);
      expect(await this.nft.tokenURI(this.tokenId)).to.eq("https://example.com/metadataX.json");
    });
  });

  describe("Pause/Unpause", function () {
    it("Should NOT pause - unauthorized", async function () {
      await expectRevert(
        this.nft.connect(this.addrs[1]).pause(),
        "AccessControl: account " +
          this.addrs[1].address.toLowerCase() +
          " is missing role 0x0000000000000000000000000000000000000000000000000000000000000000"
      );
    });
    it("Should pause", async function () {
      await this.nft.connect(this.owner).pause();
      expect(await this.nft.paused()).to.eq(true);
    });
    it("Should NOT mint when paused", async function () {
      await expectRevert(
        this.nft.connect(this.owner).mint("metadataPAUSED.json", this.usd.address, 0),
        "Pausable: paused"
      );
    });
    it("Should NOT transfer when paused", async function () {
      await expectRevert(
        this.nft
          .connect(this.addrs[9])
          .transferFrom(this.addrs[9].address, this.addrs[1].address, 0),
        "Pausable: paused"
      );
    });
    it("Should NOT unpause - unauthorized", async function () {
      await expectRevert(
        this.nft.connect(this.addrs[1]).unpause(),
        "AccessControl: account " +
          this.addrs[1].address.toLowerCase() +
          " is missing role 0x0000000000000000000000000000000000000000000000000000000000000000"
      );
    });
    it("Should unpause", async function () {
      await this.nft.connect(this.owner).unpause();
      expect(await this.nft.paused()).to.eq(false);
    });
  });

  describe("Views", function () {
    it("Should return the correct number of donors", async function () {
      expect(formatUnits(await this.sweepstake.getSweepstakeNumberOfDonors(1), "wei")).to.eq("3");
    });
    it("Should return the active sweepstake dataset", async function () {
      console.log(await this.sweepstake.getAllSweepstakes());
    });
    it("Should return the correct info of sweepstak's donors", async function () {
      console.log(await this.sweepstake.getSweepstakeDonorsInfo(0));
    });
    it("Should return the correct info of sweepstak's donors", async function () {
      console.log(await this.sweepstake.getSweepstakeWithDonors(0));
    });
  });
});
