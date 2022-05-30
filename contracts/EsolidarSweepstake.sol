// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./ERC721/ERC721EsolidarSweepstake.sol";

import "hardhat/console.sol";

/// @custom:security-contact security@prexis.io
contract EsolidarSweepstake is Ownable, ReentrancyGuard {
  using Counters for Counters.Counter;
  Counters.Counter private _sweepstakeIdCounter;

  ERC721EsolidarSweepstake public ERC721contract;

  event SweepstakeCreated(
    uint256 tokenId,
    uint256 indexed sweepstakeId,
    address indexed owner,
    address indexed erc20Token,
    string uri,
    uint256 duration
  );
  event SweepstakeDestroyed(uint256 indexed sweepstakeId);
  event SweepstakeDraw(
    uint256 indexed sweepstakeId,
    uint256 indexed tokenId,
    address indexed winner,
    uint256 amount
  );

  event Stake(uint256 indexed sweepstakeId, address indexed staker, uint256 amount);

  event BalanceUpdated(address indexed account, address indexed erc20token, uint256 amount);

  event Withdraw(address indexed account, uint256 amount);

  struct Sweepstake {
    uint256 tokenId;
    string uri;
    address owner;
    address erc20Token;
    uint256 duration;
    uint256 totalStakedTokens;
    address winner;
    uint256 drawTimestamp;
    Donors[] donors;
    bool active;
    bool destroyed;
  }

  struct Donors {
    address donor;
    uint256 totalStaked;
    uint256 cumulative;
  }

  // mapping(uint256 => uint256) public tokenIdToSweepstakeId;
  mapping(uint256 => Sweepstake) public sweepstakes;

  mapping(address => mapping(address => uint256)) public balances;

  mapping(address => mapping(uint256 => uint256)) public erc20TokenPerDonor; // donor address[sweepstake id] = erc20 token amount
  mapping(uint256 => address[]) public addressesPerSweepstake;

  constructor(address _ERC721contract) {
    transferOwnership(_ERC721contract); // TO-DO, work with roles (CREATE_ROLE?)
    ERC721contract = ERC721EsolidarSweepstake(_ERC721contract);
  }

  // Create and Destroy

  function create(
    uint256 _tokenId,
    string memory _uri,
    address _owner,
    address _erc20Token,
    uint256 _duration // TO-DO
  ) public onlyOwner {
    uint256 sweepstakeId = _sweepstakeIdCounter.current();
    _sweepstakeIdCounter.increment();

    Sweepstake storage sweepstake = sweepstakes[sweepstakeId];
    sweepstake.tokenId = _tokenId;
    sweepstake.uri = _uri;
    sweepstake.owner = _owner;
    sweepstake.erc20Token = _erc20Token;
    sweepstake.duration = uint64(block.timestamp) + uint64(_duration);
    sweepstake.active = true;
    sweepstake.destroyed = false;

    emit SweepstakeCreated(_tokenId, sweepstakeId, _owner, _erc20Token, _uri, _duration);
  }

  function destroy(uint256 _sweepstakeId) external onlyOwner nonReentrant {
    require(sweepstakes[_sweepstakeId].active, "SSESolidar: Not active");
    require(!sweepstakes[_sweepstakeId].destroyed, "SSESolidar: Already destroyed");

    sweepstakes[_sweepstakeId].duration = 0;
    sweepstakes[_sweepstakeId].active = false;
    sweepstakes[_sweepstakeId].destroyed = true;

    uint256 refund;

    for (uint256 i = 0; i < addressesPerSweepstake[_sweepstakeId].length; i++) {
      refund = erc20TokenPerDonor[addressesPerSweepstake[_sweepstakeId][i]][_sweepstakeId];

      erc20TokenPerDonor[addressesPerSweepstake[_sweepstakeId][i]][_sweepstakeId] = 0;

      assert(sweepstakes[_sweepstakeId].totalStakedTokens > 0);

      sweepstakes[_sweepstakeId].totalStakedTokens -= refund;
      _addBalance(
        addressesPerSweepstake[_sweepstakeId][i],
        sweepstakes[_sweepstakeId].erc20Token,
        refund
      );
    }

    emit SweepstakeDestroyed(_sweepstakeId);
  }

  // Stake
  function stake(uint256 _sweepstakeId, uint256 _amount) public nonReentrant {
    require(_amount > 0, "SSESolidar: Stake amount must be greater than 0");
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

  // Sort
  function draw(uint256 _sweepstakeId)
    external
    nonReentrant
    returns (uint256 ticket, address winner)
  {
    require(sweepstakes[_sweepstakeId].active, "SSESolidar: Not active");
    require(!sweepstakes[_sweepstakeId].destroyed, "SSESolidar: Already destroyed");
    require(sweepstakes[_sweepstakeId].totalStakedTokens > 0, "SSESolidar: No one has staked");
    require(block.timestamp > sweepstakes[_sweepstakeId].duration, "SSESolidar: Not ready to draw");
    // TO-DO: only sweepstake owner can draw
    // TO-DO: check if minimum stake is reached
    // TO-DO: check if minimum value stake is reached
    // TO-DO: check there are enough stakers to draw

    ticket = _getPseudoRandomNumber(_sweepstakeId);

    uint256 cumulative = 0;

    for (uint256 i = 0; i < addressesPerSweepstake[_sweepstakeId].length; i++) {
      cumulative += erc20TokenPerDonor[addressesPerSweepstake[_sweepstakeId][i]][_sweepstakeId];

      if (ticket > 0 && ticket <= cumulative) {
        winner = addressesPerSweepstake[_sweepstakeId][i];

        uint256 totalStaked = sweepstakes[_sweepstakeId].totalStakedTokens;
        // sweepstakes[_sweepstakeId].totalStakedTokens = 0; // Preserve this data

        _addBalance(
          sweepstakes[_sweepstakeId].owner,
          sweepstakes[_sweepstakeId].erc20Token,
          totalStaked
        );

        ERC721contract.transferFrom(
          sweepstakes[_sweepstakeId].owner,
          winner,
          sweepstakes[_sweepstakeId].tokenId
        );

        sweepstakes[_sweepstakeId].active = false;
        sweepstakes[_sweepstakeId].winner = winner;
        sweepstakes[_sweepstakeId].drawTimestamp = block.timestamp;

        emit SweepstakeDraw(_sweepstakeId, sweepstakes[_sweepstakeId].tokenId, winner, totalStaked);

        return (ticket, winner);
      }
    }
  }

  function _addBalance(
    address _account,
    address _erc20token,
    uint256 _amount
  ) internal {
    balances[_account][_erc20token] += _amount;
    emit BalanceUpdated(_account, _erc20token, balances[_account][_erc20token]);
  }

  function _subBalance(
    address _account,
    address _erc20token,
    uint256 _amount
  ) internal {
    balances[_account][_erc20token] -= _amount;
    emit BalanceUpdated(_account, _erc20token, balances[_account][_erc20token]);
  }

  function withdraw(address erc20Token) external nonReentrant {
    require(balances[msg.sender][erc20Token] > 0, "SSESolidar: No balance");

    uint256 balance = balances[msg.sender][erc20Token];
    balances[msg.sender][erc20Token] = 0;

    SafeERC20.safeTransfer(IERC20(erc20Token), msg.sender, balance);
  }

  function _getPseudoRandomNumber(uint256 _sweepstakeId)
    internal
    view
    returns (uint256 pseudoRandomNumber)
  {
    pseudoRandomNumber =
      uint256(
        keccak256(
          abi.encodePacked(
            _sweepstakeId,
            addressesPerSweepstake[_sweepstakeId].length,
            sweepstakes[_sweepstakeId].totalStakedTokens,
            msg.sender,
            // block.difficulty,
            block.timestamp
          )
        )
      ) %
      sweepstakes[_sweepstakeId].totalStakedTokens;

    return pseudoRandomNumber;
  }

  // Views

  function balanceOf(address _account, address _erc20Token) public view returns (uint256 balance) {
    return balances[_account][_erc20Token];
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

  function getSweepstakeWithDonors(uint256 _sweepstakeId)
    external
    view
    returns (Sweepstake memory sweepstakesWithDonor)
  {
    sweepstakesWithDonor = sweepstakes[_sweepstakeId];
    sweepstakesWithDonor.donors = getSweepstakeDonorsInfo(_sweepstakeId);
  }

  function getAllSweepstakes() external view returns (Sweepstake[] memory activeSweepstakes) {
    activeSweepstakes = new Sweepstake[](_sweepstakeIdCounter.current());

    for (uint256 i = 0; i < _sweepstakeIdCounter.current(); i++) {
      activeSweepstakes[i] = sweepstakes[i];
      activeSweepstakes[i].donors = getSweepstakeDonorsInfo(i);
    }
  }
}
