// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "../EsolidarSweepstake.sol";

/// @custom:security-contact security@prexis.io
contract ERC721EsolidarSweepstake is
  ERC721,
  ERC721Enumerable,
  ERC721URIStorage,
  Pausable,
  AccessControl,
  ERC721Burnable
{
  using Counters for Counters.Counter;

  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
  Counters.Counter private _tokenIdCounter;

  EsolidarSweepstake public sweepstakeContract;

  string public baseURI;

  constructor() ERC721("esolidar", "ESOL721") {
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(MINTER_ROLE, msg.sender);
  }

  function setSweepstakeAddress(address _sweepstakeContract) public onlyRole(DEFAULT_ADMIN_ROLE) {
    sweepstakeContract = EsolidarSweepstake(_sweepstakeContract);
  }

  function mint(
    string memory uri,
    address erc20Token,
    uint256 duration
  ) public onlyRole(MINTER_ROLE) whenNotPaused returns (uint256 tokenId) {
    tokenId = _tokenIdCounter.current();
    _tokenIdCounter.increment();
    _safeMint(msg.sender, tokenId);
    _setTokenURI(tokenId, uri);

    _approve(address(sweepstakeContract), tokenId);
    sweepstakeContract.create(tokenId, uri, msg.sender, erc20Token, duration);
  }

  function setBaseURI(string memory uri) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _setBaseURI(uri);
  }

  function _setBaseURI(string memory uri) internal {
    baseURI = uri;
  }

  function _baseURI() internal view virtual override(ERC721) returns (string memory) {
    return baseURI;
  }

  function pause() public onlyRole(DEFAULT_ADMIN_ROLE) {
    _pause();
  }

  function unpause() public onlyRole(DEFAULT_ADMIN_ROLE) {
    _unpause();
  }

  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 tokenId
  ) internal override(ERC721, ERC721Enumerable) whenNotPaused {
    
    // Reverts if sweepstake is active
    (,,,,,,,,bool active,) = sweepstakeContract.sweepstakes(tokenId);

    if (active) {
      revert("ERC721S: Sweepstake is active");
    }

    super._beforeTokenTransfer(from, to, tokenId);
  }

  // The following functions are overrides required by Solidity.

  function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
    sweepstakeContract.destroy(tokenId);
    super._burn(tokenId);
  }

  function tokenURI(uint256 tokenId)
    public
    view
    override(ERC721, ERC721URIStorage)
    returns (string memory)
  {
    return super.tokenURI(tokenId);
  }

  function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC721, ERC721Enumerable, AccessControl)
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }
}
