// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "hardhat/console.sol";

/// @custom:security-contact security@prexis.io
contract EsolidarSweepstake is Ownable, ReentrancyGuard {
  using Counters for Counters.Counter;
  Counters.Counter private _sweepstakeIdCounter;

  constructor(address _ERC721contract) {
    transferOwnership(_ERC721contract);
  }

  event SweepstakeCreated(
    uint256 indexed tokenId,
    uint256 indexed sweepstakeId,
    address indexed owner
  );
  event Stake(uint256 sweepstakeId, address indexed staker, uint256 amount);

  struct Sweepstake {
    uint256 tokenId;
    address owner;
    address erc20Token;
    uint256 totalStakedTokens;
    bool active;
  }

  mapping(uint256 => Sweepstake) public sweepstakes;

  mapping(address => mapping(uint256 => uint256)) public erc20TokenPerDonor; // donor address[sweepstake id] = erc20 token amount
  mapping(uint256 => address[]) public addressesPerSweepstake;

  function create(
    uint256 _tokenId,
    address _owner,
    address _erc20Token
  ) public onlyOwner {
    uint256 sweepstakeId = _sweepstakeIdCounter.current();
    _sweepstakeIdCounter.increment();

    Sweepstake storage sweepstake = sweepstakes[sweepstakeId];
    sweepstake.tokenId = _tokenId;
    sweepstake.owner = _owner;
    sweepstake.erc20Token = _erc20Token;
    sweepstake.active = true;

    emit SweepstakeCreated(_tokenId, sweepstakeId, _owner);
  }

  // Stake
  function stake(uint256 _sweepstakeId, uint256 _amount) public nonReentrant {
    require(sweepstakes[_sweepstakeId].active, "SSESolidar: Not active");
    require(sweepstakes[_sweepstakeId].owner != msg.sender, "SSESolidar: Owner cannot stake");
    if (
      IERC20(sweepstakes[_sweepstakeId].erc20Token).allowance(msg.sender, address(this)) < _amount
    ) {
      revert("SSESolidar: token transfer not allowed");
    }

    IERC20(sweepstakes[_sweepstakeId].erc20Token).transferFrom(msg.sender, address(this), _amount);

    if (erc20TokenPerDonor[msg.sender][_sweepstakeId] == 0) {
      addressesPerSweepstake[_sweepstakeId].push(msg.sender);
    }

    erc20TokenPerDonor[msg.sender][_sweepstakeId] += _amount;
    sweepstakes[_sweepstakeId].totalStakedTokens += _amount;

    emit Stake(_sweepstakeId, msg.sender, _amount);
  }

  function sort(uint256 _sweepstakeId) public view returns (uint256 ticket, address winner) {
    ticket =
      uint256(
        keccak256(
          abi.encodePacked(
            _sweepstakeId,
            addressesPerSweepstake[_sweepstakeId].length,
            sweepstakes[_sweepstakeId].totalStakedTokens,
            msg.sender,
            block.difficulty,
            block.timestamp
          )
        )
      ) %
      sweepstakes[_sweepstakeId].totalStakedTokens;

    uint256 cumulative = 0;

    for (uint256 i = 0; i < addressesPerSweepstake[_sweepstakeId].length; i++) {
      cumulative += erc20TokenPerDonor[addressesPerSweepstake[_sweepstakeId][i]][_sweepstakeId];

      if (ticket > 0 && ticket <= cumulative) {
        winner = addressesPerSweepstake[_sweepstakeId][i];
        return (ticket, winner);
      }
    }
  }

  // Views

  struct Donors {
    address donor;
    uint256 totalStaked;
    uint256 cumulative;
  }

  function getSweepstakeNumberOfDonors(uint256 _sweepstakeId) public view returns (uint256 donors) {
    donors = addressesPerSweepstake[_sweepstakeId].length;
  }

  function getSweepstakeDonorsInfo(uint256 _sweepstakeId)
    public
    view
    returns (Donors[] memory donors)
  {
    donors = new Donors[](addressesPerSweepstake[_sweepstakeId].length);

    uint256 cumulative;

    for (uint256 i = 0; i < addressesPerSweepstake[_sweepstakeId].length; i++) {
      donors[i].donor = addressesPerSweepstake[_sweepstakeId][i];
      donors[i].totalStaked = erc20TokenPerDonor[addressesPerSweepstake[_sweepstakeId][i]][
        _sweepstakeId
      ];
      cumulative += donors[i].totalStaked;
      donors[i].cumulative += cumulative;
    }
  }
}
