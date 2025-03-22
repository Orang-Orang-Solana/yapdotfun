# YapDotFun

This is a prediction market program where users can bet on the outcome of binary events.

## Core Data Structure

### Market

Each market represents a yes/no question and contains:

- `description`: Text description of the event
- `status`: Can be NOT_CREATED, OPEN, or CLOSED
- `answer`: Final outcome (true/false) set by oracle
- `totalYesAssets` & `totalNoAssets`: Total USDC invested in each position
- `totalYesShares` & `totalNoShares`: Total shares issued for each position
- `totalRewards`: Total USDC rewards pool

### Storage

- Markets are stored in a mapping with a `bytes32` ID (hash of the description) as key
- User balances are tracked in two mappings (`yesBalances` and `noBalances`) that record shares owned by each address for each market

## Key Functionality

1. **Market Creation**: Anyone can create a market with a description
2. **Buying Shares**: Users deposit USDC to buy YES or NO shares
3. **Selling Shares**: Users can sell shares to recover USDC
4. **Market Resolution**: An oracle closes markets by providing the answer
5. **Reward Withdrawal**: Winners can claim proportional rewards based on shares held

The pricing functions (`_calculatePriceBuy` and `_calculatePriceSell`) are currently placeholder implementations returning a fixed value of 1 USDC per share.
