# SimpleSwapVault (Foundry)

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)

## Setup

From this directory:

```bash
forge install foundry-rs/forge-std --no-commit
forge build
forge test
```

## Deploy to Arc Testnet

1. Export RPC and a funded deployer key (testnet USDC pays gas on Arc):

```bash
set ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
set PRIVATE_KEY=0xYOUR_KEY
```

2. Deploy:

```bash
forge script script/DeployArc.s.sol:DeployArc --rpc-url %ARC_TESTNET_RPC_URL% --broadcast
```

3. Copy the printed `SimpleSwapVault` address into:

- `../deployments/arc-testnet.json` (`contracts.SimpleSwapVault`)
- `../.env.local` as `NEXT_PUBLIC_SWAP_CONTRACT_ADDRESS`

4. Configure the vault (owner):

- `setPair(tokenIn, tokenOut, rateNum, rateDen, true)` for each direction you support.
- Deposit `tokenOut` liquidity into the vault with `deposit(token, amount)` (requires ERC-20 approval to the vault).

Example: USDC (6 decimals) → WETH (18). To pay `0.0003` WETH per `1` USDC:

- `1 USDC` = `1e6` units.
- `0.0003 WETH` = `3e14` wei.
- `rateNum = 300_000_000`, `rateDen = 1` gives `amountOut = amountIn * 300_000_000 / 1` (matches the unit test).
