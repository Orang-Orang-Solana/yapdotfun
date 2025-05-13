import { Keypair } from '@solana/web3.js'

import {
  airdropSol,
  createMarket,
  findMarketMetadataPDA,
  findMarketPDA,
  getValidatorKeypair,
  resolveMarket,
  setupProgram,
  uniqueMarketDescription
} from './utils'

describe('yapping resolve market tests', () => {
  // Setup program and get references
  const { program, provider, user } = setupProgram()
  const validator = getValidatorKeypair()

  beforeEach(async () => {
    // Airdrop SOL to the wallet for tests
    await airdropSol(provider.connection, user)
  })

  it('should allow resolver to resolve a market as YES', async () => {
    const description = uniqueMarketDescription('Resolve as YES test')

    // Find PDAs
    const [marketPDA] = findMarketPDA(program.programId, description)

    // Initialize market
    await createMarket(program, description, user)

    // Resolve market as YES (true)
    await resolveMarket(program, marketPDA, true, validator)

    // Fetch and verify market data after resolution
    const market = await program.account.market.fetch(marketPDA)

    expect(market.status.closed !== undefined).toBeTruthy()
    expect(market.answer).toEqual(true)
    expect(market.resolvedAt).not.toBeNull()
  })

  it('should allow resolver to resolve a market as NO', async () => {
    const description = uniqueMarketDescription('Resolve as NO test')

    // Find PDAs
    const [marketPDA] = findMarketPDA(program.programId, description)

    // Initialize market
    await createMarket(program, description, user)

    // Resolve market as NO (false)
    await resolveMarket(program, marketPDA, false, validator)

    // Fetch and verify market data after resolution
    const market = await program.account.market.fetch(marketPDA)

    expect(market.status.closed !== undefined).toBeTruthy()
    expect(market.answer).toEqual(false)
    expect(market.resolvedAt).not.toBeNull()
  })

  it('should not allow non-validator to resolve a market', async () => {
    const description = uniqueMarketDescription('Non-validator resolve test')

    // Create a random non-validator account
    const nonValidator = Keypair.generate()

    // Find PDAs
    const [marketPDA] = findMarketPDA(program.programId, description)

    // Initialize market
    await createMarket(program, description, user)

    // Try to resolve market with non-validator (should fail)
    try {
      await resolveMarket(program, marketPDA, true, nonValidator)
      fail('Expected to fail with non-validator signer')
    } catch (error) {
      expect(error).toBeTruthy()
    }
  })

  it('should not allow resolving a market that is already closed', async () => {
    const description = uniqueMarketDescription('Already closed market test')

    // Find PDAs
    const [marketPDA] = findMarketPDA(program.programId, description)

    // Initialize market
    await createMarket(program, description, user)

    // Resolve market first time
    await resolveMarket(program, marketPDA, true, validator)

    // Try to resolve market again (should fail)
    try {
      await resolveMarket(program, marketPDA, false, validator)
      fail('Expected to fail with already closed market')
    } catch (error) {
      expect(error).toBeTruthy()
    }
  })

  it('should set the resolved_at timestamp correctly', async () => {
    const description = uniqueMarketDescription('Timestamp check market')

    // Find PDAs
    const [marketPDA] = findMarketPDA(program.programId, description)
    const [marketMetadataPDA] = findMarketMetadataPDA(
      program.programId,
      marketPDA
    )

    // Initialize market
    await createMarket(program, description, user)

    // Get current timestamp before resolving
    const beforeResolveTimestamp = Math.floor(Date.now() / 1000)

    // Resolve market
    await resolveMarket(program, marketPDA, true, validator)

    // Get timestamp after resolving
    const afterResolveTimestamp = Math.floor(Date.now() / 1000)

    // Fetch market data
    const market = await program.account.market.fetch(marketPDA)

    // ResolvedAt time should be between our before and after timestamps
    // We convert to number because resolved_at comes back as BN
    const resolvedAtTime = market.resolvedAt?.toNumber() ?? 0

    // Add a tolerance window to account for clock differences between client and blockchain
    expect(resolvedAtTime).toBeGreaterThanOrEqual(beforeResolveTimestamp - 2)
    expect(resolvedAtTime).toBeLessThanOrEqual(afterResolveTimestamp + 5) // Allow small buffer
  })
})
