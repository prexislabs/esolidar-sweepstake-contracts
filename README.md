# esolidar Sweepstake Contracts

## Deploy

Clone the repository and install dependencies.

Important: use npm version 16!

```bash
npm install
```

Create the `.env` file based on `.env.example` file.

```bash
cp .env.example .env
```
Edit the `.env` file. It's necessary to get the wallet's private key. The wallet must have CELO to deploy the contracts.

```
# CELO
ALFAJORES_ADDRESS_PK=
CELO_ADDRESS_PK=
```

### Testnet (Alfajores)

First, deploy the contracts.
```bash
npx hardhat --network alfajores deploy
```
And verify them in blockchain explorer.
```bash
npx hardhat --network alfajores sourcify
```

### Mainnet (CELO)

First, deploy the contracts.
```bash
npx hardhat --network celo deploy
```
And verify them in blockchain explorer.
```bash
npx hardhat --network celo sourcify
```

### Contract configurations
It's necessary, after deployment, to set on the ERC721 contract the Sweepstake contract address.

Edit the `scripts/configure-contract.js` to check if the `tokenURI` suffix, default is `ipfs://` (line 17).

```bash
npx hardhat --network (alfajores|celo) run script/configure-contracts.js
```
## Contract ABIs
Web3 uses the ABI file to interact with the contract. First, compile the contracts on the local network.

```bash
npx hardhat compile
```
It's necessary to use only two ABI files: `artifacts/contracts/EsolidarSweepstake.sol/EsolidarSweepstake.json` and `artifacts/contracts/ERC721EsolidarSweepstake.sol/ERC721EsolidarSweepstake.json`. Edit these two files and copy only the ABI object:
```json
  "abi": [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    etc...
  ]
```
Paste on the Next.js ABI file inside `src/ABI` folder.

## Tests
To run the test script:

```bash
npx hardhat test test/esolidar-sweepstake.test.js
```

## License
[MIT](https://choosealicense.com/licenses/mit/)