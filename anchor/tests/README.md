# Yapping Test Suite

This directory contains tests for the Yapping prediction market smart contract. The tests are organized to provide comprehensive coverage of all contract functionalities.

## Test Structure

The test files follow a modular approach to reduce redundancy and improve maintainability:

- `utils.ts` - Contains utility functions used across tests
- Test files for each contract function:
  - `initialize-market.spec.ts` - Tests for market initialization
  - `buy.spec.ts` - Tests for buying positions
  - `sell.spec.ts` - Tests for selling positions
  - `resolve-market.spec.ts` - Tests for resolving markets
  - `withdraw-rewards.spec.ts` - Tests for withdrawing rewards

## Utility Functions

The `utils.ts` file provides helper functions to:

1. Set up the program and provider
2. Create and find PDAs
3. Perform common operations like creating markets, buying/selling positions
4. Manage test accounts and balances

### Key Utility Functions

- `setupProgram()` - Sets up the Anchor provider and program
- `airdropSol()` - Airdrops SOL to a wallet
- `findMarketPDA()`, `findMarketMetadataPDA()`, `findMarketVoterPDA()` - Find program-derived addresses
- `createMarket()` - Creates a new market
- `buyPosition()` - Buys a YES/NO position
- `sellPosition()` - Sells a YES/NO position
- `resolveMarket()` - Resolves a market with a result
- `withdrawRewards()` - Withdraws rewards from a market
- `uniqueMarketDescription()` - Generates unique market descriptions for tests
- `sleep()` - Adds delay between operations

## Example Usage

```typescript
import {
  airdropSol,
  buyPosition,
  createMarket,
  setupProgram,
  uniqueMarketDescription
} from './utils'

describe('my test', () => {
  // Setup program and get references
  const { program, provider, user } = setupProgram()

  beforeEach(async () => {
    // Airdrop SOL for tests
    await airdropSol(provider.connection, user)
  })

  it('should test something', async () => {
    // Create a market with unique description
    const description = uniqueMarketDescription('My test')
    const marketPDA = await createMarket(program, description, user)

    // Buy a position in the market
    const betAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL)
    await buyPosition(program, marketPDA, user, true, betAmount)

    // Test assertions...
  })
})
```

## Running Tests

To run all tests:

```bash
cd anchor
anchor test
```

To run a specific test:

```bash
cd anchor
anchor test -- -t "should initialize a market with a valid description"
```

## Contributing

When adding new tests:

1. Use the utility functions in `utils.ts` whenever possible
2. Follow the existing patterns for test organization
3. Use meaningful descriptions for test cases
4. Create unique market descriptions to avoid conflicts between tests
