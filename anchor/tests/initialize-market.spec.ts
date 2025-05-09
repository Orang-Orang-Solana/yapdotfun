import * as crypto from 'node:crypto'

import type { Program } from '@coral-xyz/anchor'
import * as anchor from '@coral-xyz/anchor'
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SendTransactionError
} from '@solana/web3.js'

import type { Yapdotfun } from '../target/types/yapdotfun'

describe('yapdotfun initialize market tests', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const user = provider.wallet.publicKey
  const expectedResolutionDate = new anchor.BN(
    new Date().getTime() + 1000 * 60 * 60 * 24 * 30
  ) // 30 days from now

  const program = anchor.workspace.Yapdotfun as Program<Yapdotfun>

  // Helper to hash the description string as done in the contract
  function hashString(str: string) {
    return crypto.createHash('sha256').update(str).digest()
  }

  beforeEach(async () => {
    // airdrop SOL to the wallet for tests
    const tx = await provider.connection.requestAirdrop(
      provider.wallet.publicKey,
      LAMPORTS_PER_SOL * 2
    )
    await provider.connection.confirmTransaction(tx)
  })

  it('should initialize a market with a valid description', async () => {
    const description = 'Will ETH reach $10k by end of 2024?'

    // Find PDA for market
    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    // Find PDA for market metadata
    const [marketMetadataPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market_metadata'), marketPDA.toBuffer()],
      program.programId
    )

    // Initialize market
    await program.methods
      .initializeMarket(description, expectedResolutionDate)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    // Fetch and validate market data
    const market = await program.account.market.fetch(marketPDA)
    expect(market.description).toEqual(description)
    expect(market.status.open !== undefined).toBeTruthy()
    expect(market.initializer.toString()).toEqual(user.toString())
    expect(market.expectedResolutionDate.toString()).toEqual(
      expectedResolutionDate.toString()
    )
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
    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    try {
      // Try to initialize with empty description (should fail)
      await program.methods
        .initializeMarket(description, expectedResolutionDate)
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

    // Find PDA for market
    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    // Initialize market first time
    await program.methods
      .initializeMarket(description, expectedResolutionDate)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    try {
      // Try to initialize with same description (should fail)
      await program.methods
        .initializeMarket(description, expectedResolutionDate)
        .accounts({
          market: marketPDA,
          signer: user
        })
        .rpc()

      // Should not reach here
      fail('Expected to fail with SendTransactionError')
    } catch (error) {
      expect(error).toBeInstanceOf(SendTransactionError)
    }
  })

  it('should initialize multiple markets with different descriptions', async () => {
    const description1 = 'Will ETH reach $5k by end of 2024?'
    const description2 = 'Will SOL reach $200 by end of 2024?'

    // Find PDAs for market 1
    const [marketPDA1] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description1)],
      program.programId
    )

    // Find PDAs for market 2
    const [marketPDA2] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description2)],
      program.programId
    )

    // Initialize market 1
    await program.methods
      .initializeMarket(description1, expectedResolutionDate)
      .accounts({
        market: marketPDA1,
        signer: user
      })
      .rpc()

    // Initialize market 2
    await program.methods
      .initializeMarket(description2, expectedResolutionDate)
      .accounts({
        market: marketPDA2,
        signer: user
      })
      .rpc()

    // Fetch and validate market 1 data
    const market1 = await program.account.market.fetch(marketPDA1)
    expect(market1.description).toEqual(description1)

    // Fetch and validate market 2 data
    const market2 = await program.account.market.fetch(marketPDA2)
    expect(market2.description).toEqual(description2)
  })

  it('should verify correct PDA derivation for market accounts', async () => {
    const description = 'Will DOT reach $20 by end of 2024?'

    // Find PDAs
    const [marketPDA, marketBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    const [marketMetadataPDA, metadataBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('market_metadata'), marketPDA.toBuffer()],
      program.programId
    )

    // Initialize market
    await program.methods
      .initializeMarket(description, expectedResolutionDate)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    // Verify we can fetch both accounts
    const market = await program.account.market.fetch(marketPDA)
    const metadata =
      await program.account.marketMetadata.fetch(marketMetadataPDA)

    expect(market).toBeTruthy()
    expect(metadata).toBeTruthy()
  })
})
