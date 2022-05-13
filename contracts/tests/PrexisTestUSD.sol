// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PrexisTestUSD is ERC20, Ownable {
  constructor() ERC20("Prexis Test USD", "pUSD") {}

  function mint(address to, uint256 amount) public {
    _mint(to, amount);
  }
}
