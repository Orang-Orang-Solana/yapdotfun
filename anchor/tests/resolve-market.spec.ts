import * as crypto from 'node:crypto'

import type { Program } from '@coral-xyz/anchor'
import * as anchor from '@coral-xyz/anchor'
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'

import type { Yapping } from '../target/types/yapping'

describe('yapping resolve market tests', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const user = provider.wallet.publicKey
  const expectedResolutionDate = new anchor.BN(
    new Date().getTime() + 1000 * 60 * 60 * 24 * 30
  ) // 30 days from now

  // Create validator account with required private key
  const validator = Keypair.fromSecretKey(
    new Uint8Array([
      96, 72, 59, 139, 230, 201, 113, 65, 242, 61, 1, 234, 235, 30, 210, 203,
      37, 139, 250, 139, 140, 216, 91, 79, 6, 150, 206, 239, 88, 242, 67, 135,
      95, 97, 47, 93, 235, 6, 127, 156, 200, 141, 180, 240, 247, 182, 16, 254,
      197, 90, 40, 167, 155, 4, 65, 157, 41, 117, 84, 73, 44, 57, 27, 224
    ])
  )

  const program = anchor.workspace.Yapping as Program<Yapping>

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

  it('should allow resolver to resolve a market as YES', async () => {
    const description = 'Resolve as YES test market'

    // Find PDAs
    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    const [marketMetadataPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market_metadata'), marketPDA.toBuffer()],
      program.programId
    )

    // Initialize market
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

    // Resolve market as YES (true)
    await program.methods
      .resolveMarket(true)
      .accounts({
        market: marketPDA
      })
      .signers([validator])
      .rpc()

    // Fetch and verify market data after resolution
    const market = await program.account.market.fetch(marketPDA)

    expect(market.status.closed !== undefined).toBeTruthy()
    expect(market.answer).toEqual(true)
    expect(market.resolvedAt).not.toBeNull()
  })

  it('should allow resolver to resolve a market as NO', async () => {
    const description = 'Resolve as NO test market'

    // Find PDAs
    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    const [marketMetadataPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market_metadata'), marketPDA.toBuffer()],
      program.programId
    )

    // Initialize market
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

    // Resolve market as NO (false)
    await program.methods
      .resolveMarket(false)
      .accounts({
        market: marketPDA
      })
      .signers([validator])
      .rpc()

    // Fetch and verify market data after resolution
    const market = await program.account.market.fetch(marketPDA)

    expect(market.status.closed !== undefined).toBeTruthy()
    expect(market.answer).toEqual(false)
    expect(market.resolvedAt).not.toBeNull()
  })

  it('should not allow non-validator to resolve a market', async () => {
    const description = 'Non-validator resolve test market'

    // Create a random non-validator account
    const nonValidator = Keypair.generate()

    // Find PDAs
    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    const [marketMetadataPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market_metadata'), marketPDA.toBuffer()],
      program.programId
    )

    // Initialize market
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

    // Try to resolve market with non-validator (should fail)
    try {
      await program.methods
        .resolveMarket(true)
        .accounts({
          market: marketPDA
        })
        .signers([nonValidator])
        .rpc()

      fail('Expected to fail with non-validator signer')
    } catch (error) {
      expect(error).toBeTruthy()
    }
  })

  it('should not allow resolving a market that is already closed', async () => {
    const description = 'Already closed market test'

    // Find PDAs
    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    const [marketMetadataPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market_metadata'), marketPDA.toBuffer()],
      program.programId
    )

    // Initialize market
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

    // Resolve market first time (should succeed)
    await program.methods
      .resolveMarket(true)
      .accounts({
        market: marketPDA
      })
      .signers([validator])
      .rpc()

    // Try to resolve market second time (should fail)
    try {
      await program.methods
        .resolveMarket(false)
        .accounts({
          market: marketPDA
        })
        .signers([validator])
        .rpc()

      fail('Expected to fail with MarketClosed')
    } catch (error) {
      expect(error).toBeInstanceOf(anchor.AnchorError)
      const anchorError = error as anchor.AnchorError
      expect(anchorError.error.errorCode.code).toEqual('MarketClosed')
    }
  })

  it('should set the resolved_at timestamp correctly', async () => {
    const description = 'Timestamp check market'

    // Find PDAs
    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    const [marketMetadataPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market_metadata'), marketPDA.toBuffer()],
      program.programId
    )

    // Initialize market
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

    // Get current timestamp before resolving
    const beforeResolveTimestamp = Math.floor(Date.now() / 1000)

    // Resolve market
    await program.methods
      .resolveMarket(true)
      .accounts({
        market: marketPDA
      })
      .signers([validator])
      .rpc()

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
