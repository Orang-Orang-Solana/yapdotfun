import { SendTransactionError } from '@solana/web3.js'

import {
  airdropSol,
  createMarket,
  findMarketMetadataPDA,
  findMarketPDA,
  getDefaultResolutionDate,
  setupProgram,
  uniqueMarketDescription
} from './utils'

describe('yapping initialize market tests', () => {
  // Setup program and get references
  const { program, provider, user } = setupProgram()
  const expectedResolutionDate = getDefaultResolutionDate()

  beforeEach(async () => {
    // Airdrop SOL to the wallet for tests
    await airdropSol(provider.connection, user)
  })

  it('should initialize a market with a valid description', async () => {
    const description = 'Will ETH reach $10k by end of 2024?'

    // Find PDAs
    const [marketPDA] = findMarketPDA(program.programId, description)
    const [marketMetadataPDA] = findMarketMetadataPDA(
      program.programId,
      marketPDA
    )

    // Initialize market using utility function
    await createMarket(program, description, user)

    // Fetch and validate market data
    const market = await program.account.market.fetch(marketPDA)
    expect(market.description).toEqual(description)
    expect(market.status.open !== undefined).toBeTruthy()
    expect(market.initializer.toString()).toEqual(user.toString())
    // Use approximate comparison for dates instead of exact equality
    const marketDate = market.expectedResolutionDate.toNumber()
    const expectedDate = expectedResolutionDate.toNumber()
    const toleranceMs = 2000 // 2 seconds tolerance
    expect(Math.abs(marketDate - expectedDate)).toBeLessThanOrEqual(toleranceMs)
    expect(market.resolvedAt).toBeNull()

    // Validate market metadata is initialized correctly
    const metadata =
      await program.account.marketMetadata.fetch(marketMetadataPDA)
    expect(metadata.totalYesAssets.toString()).toEqual('0')
    expect(metadata.totalNoAssets.toString()).toEqual('0')
    expect(metadata.totalYesShares.toString()).toEqual('0')
    expect(metadata.totalNoShares.toString()).toEqual('0')
    expect(metadata.totalRewards.toString()).toEqual('0')
  })

  it('should reject initialization with an empty description', async () => {
    const description = ''

    // Find PDA for market
    const [marketPDA] = findMarketPDA(program.programId, description)

    try {
      // Try to initialize with empty description (should fail)
      await program.methods
        .initializeMarket(
          description,
          'https://picsum.photos/200/300',
          expectedResolutionDate
        )
        .accounts({
          market: marketPDA,
          signer: user
        })
        .rpc()

      // Should not reach here
      fail('Expected to fail with empty description')
    } catch (error) {
      expect(error).toBeTruthy()
    }
  })

  it('should not allow reinitialization of an existing market', async () => {
    const description = 'Will BTC reach $100k by end of 2024?'

    // Initialize market first time
    await createMarket(program, description, user)

    try {
      // Try to initialize with same description (should fail)
      await createMarket(program, description, user)

      // Should not reach here
      fail('Expected to fail with SendTransactionError')
    } catch (error) {
      expect(error).toBeInstanceOf(SendTransactionError)
    }
  })

  it('should initialize multiple markets with different descriptions', async () => {
    const description1 = 'Will ETH reach $5k by end of 2024?'
    const description2 = 'Will SOL reach $200 by end of 2024?'

    // Find PDAs for markets
    const [marketPDA1] = findMarketPDA(program.programId, description1)
    const [marketPDA2] = findMarketPDA(program.programId, description2)

    // Initialize markets
    await createMarket(program, description1, user)
    await createMarket(program, description2, user)

    // Fetch and validate market 1 data
    const market1 = await program.account.market.fetch(marketPDA1)
    expect(market1.description).toEqual(description1)

    // Fetch and validate market 2 data
    const market2 = await program.account.market.fetch(marketPDA2)
    expect(market2.description).toEqual(description2)
  })

  it('should verify correct PDA derivation for market accounts', async () => {
    const description = uniqueMarketDescription('PDA verification test')

    // Find PDAs
    const [marketPDA] = findMarketPDA(program.programId, description)
    const [marketMetadataPDA] = findMarketMetadataPDA(
      program.programId,
      marketPDA
    )

    // Initialize market
    await createMarket(program, description, user)

    // Verify we can fetch both accounts
    const market = await program.account.market.fetch(marketPDA)
    const metadata =
      await program.account.marketMetadata.fetch(marketMetadataPDA)

    expect(market).toBeTruthy()
    expect(metadata).toBeTruthy()
  })
})
