import * as crypto from 'node:crypto'

import type { Program } from '@coral-xyz/anchor'
import * as anchor from '@coral-xyz/anchor'
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'

import type { Yapping } from '../target/types/yapping'

describe('yapping sell tests', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const user = provider.wallet.publicKey
  const expectedResolutionDate = new anchor.BN(
    new Date().getTime() + 1000 * 60 * 60 * 24 * 30
  ) // 30 days from now

  const program = anchor.workspace.Yapping as Program<Yapping>

  // Helper to hash the description string as done in the contract
  function hashString(str: string) {
    return crypto.createHash('sha256').update(str).digest()
  }

  // Helper sleep function
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms))

  beforeEach(async () => {
    // airdrop SOL to the wallet for tests
    const tx = await provider.connection.requestAirdrop(
      provider.wallet.publicKey,
      LAMPORTS_PER_SOL * 2
    )
    await provider.connection.confirmTransaction(tx)

    // Sleep between tests
    await sleep(1000)
  })

  // Updated positive tests to match current implementation
  it('should allow selling YES position in a market', async () => {
    const uniqueId = Math.random().toString().slice(2, 10)
    const description = `Sell YES test ${uniqueId}`
    const betAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL)

    // Calculate expected shares based on 1_000_000 conversion rate
    const expectedShares = betAmount.div(new anchor.BN(1_000_000))

    // Find PDAs
    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    const [marketMetadataPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market_metadata'), marketPDA.toBuffer()],
      program.programId
    )

    const [marketVoterPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market_voter'), user.toBuffer(), marketPDA.toBuffer()],
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

    await sleep(1000)

    // Get initial balances
    const initialUserBalance = await provider.connection.getBalance(user)
    const initialMarketBalance = await provider.connection.getBalance(marketPDA)

    // Buy YES position
    await program.methods
      .buy(true, betAmount)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    await sleep(1000)

    // Verify shares were created correctly
    const metadataAfterBuy =
      await program.account.marketMetadata.fetch(marketMetadataPDA)
    expect(metadataAfterBuy.totalYesShares.toString()).toEqual(
      expectedShares.toString()
    )

    // Sell the YES position
    await program.methods
      .sell(true, expectedShares)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    await sleep(1000)

    // Verify market state after selling
    const metadataAfterSell =
      await program.account.marketMetadata.fetch(marketMetadataPDA)

    // After selling all shares, the yes shares should be 0
    expect(metadataAfterSell.totalYesShares.toString()).toEqual('0')

    // Verify user got their SOL back (roughly - we can't be exact due to fees and price calculations)
    const finalUserBalance = await provider.connection.getBalance(user)
    const userBalanceDiff = finalUserBalance - initialUserBalance

    // User should have gotten back most of their SOL
    // We use a lower threshold due to transaction fees and possible price changes
    expect(userBalanceDiff).toBeGreaterThan(-betAmount.toNumber() * 0.2)
  })

  it('should allow selling NO position in a market', async () => {
    const uniqueId = Math.random().toString().slice(2, 10)
    const description = `Sell NO test ${uniqueId}`
    const betAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL)

    // Calculate expected shares based on 1_000_000 conversion rate
    const expectedShares = betAmount.div(new anchor.BN(1_000_000))

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

    await sleep(1000)

    // Get initial balances
    const initialUserBalance = await provider.connection.getBalance(user)

    // Buy NO position
    await program.methods
      .buy(false, betAmount)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    await sleep(1000)

    // Verify shares were created correctly
    const metadataAfterBuy =
      await program.account.marketMetadata.fetch(marketMetadataPDA)
    expect(metadataAfterBuy.totalNoShares.toString()).toEqual(
      expectedShares.toString()
    )

    // Sell the NO position
    await program.methods
      .sell(false, expectedShares)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    await sleep(1000)

    // Verify market state after selling
    const metadataAfterSell =
      await program.account.marketMetadata.fetch(marketMetadataPDA)

    // After selling all shares, the no shares should be 0
    expect(metadataAfterSell.totalNoShares.toString()).toEqual('0')

    // Verify user got their SOL back (roughly - we can't be exact due to fees and price calculations)
    const finalUserBalance = await provider.connection.getBalance(user)
    const userBalanceDiff = finalUserBalance - initialUserBalance

    // User should have gotten back most of their SOL
    // We use a lower threshold due to transaction fees and possible price changes
    expect(userBalanceDiff).toBeGreaterThan(-betAmount.toNumber() * 0.2)
  })

  it('should allow selling partial shares', async () => {
    const uniqueId = Math.random().toString().slice(2, 10)
    const description = `Partial shares test ${uniqueId}`
    const betAmount = new anchor.BN(1 * LAMPORTS_PER_SOL)

    // Calculate expected shares based on 1_000_000 conversion rate
    const totalExpectedShares = betAmount.div(new anchor.BN(1_000_000))
    const partialShares = totalExpectedShares.div(new anchor.BN(2)) // Sell half the shares

    // Find PDAs
    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    const [marketMetadataPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market_metadata'), marketPDA.toBuffer()],
      program.programId
    )

    const [marketVoterPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market_voter'), user.toBuffer(), marketPDA.toBuffer()],
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

    await sleep(1000)

    // Buy YES position
    await program.methods
      .buy(true, betAmount)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    await sleep(1000)

    // Verify initial shares
    const metadataAfterBuy =
      await program.account.marketMetadata.fetch(marketMetadataPDA)
    expect(metadataAfterBuy.totalYesShares.toString()).toEqual(
      totalExpectedShares.toString()
    )

    // Verify voter's initial amount
    const voterBeforeSell =
      await program.account.marketVoter.fetch(marketVoterPDA)
    expect(voterBeforeSell.amount.toString()).toEqual(betAmount.toString())

    // Sell half the shares
    await program.methods
      .sell(true, partialShares)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    await sleep(1000)

    // Verify market state after selling partial shares
    const metadataAfterSell =
      await program.account.marketMetadata.fetch(marketMetadataPDA)

    // After selling half shares, should have half left
    const remainingShares = totalExpectedShares.sub(partialShares)
    expect(metadataAfterSell.totalYesShares.toString()).toEqual(
      remainingShares.toString()
    )

    // Verify voter still has shares remaining
    const voterAfterSell =
      await program.account.marketVoter.fetch(marketVoterPDA)

    // Voter's amount should be reduced roughly by half
    // We allow some wiggle room due to rounding and proportion calculation
    const halfAmount = betAmount.div(new anchor.BN(2))
    const lowerBound = halfAmount.sub(new anchor.BN(0.05 * LAMPORTS_PER_SOL))
    const upperBound = halfAmount.add(new anchor.BN(0.05 * LAMPORTS_PER_SOL))

    expect(Number(voterAfterSell.amount.toString())).toBeGreaterThanOrEqual(
      Number(lowerBound.toString())
    )
    expect(Number(voterAfterSell.amount.toString())).toBeLessThanOrEqual(
      Number(upperBound.toString())
    )

    // Verify voter's vote direction is still correct
    expect(voterAfterSell.vote).toEqual(true)
  })

  it('should not allow selling more shares than owned', async () => {
    const uniqueId = Math.random().toString().slice(2, 10)
    const description = `Too many shares test ${uniqueId}`
    const betAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL)

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

    await sleep(1000)

    // Buy YES position
    await program.methods
      .buy(true, betAmount)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    await sleep(1000)

    // Get shares from metadata
    const metadata =
      await program.account.marketMetadata.fetch(marketMetadataPDA)
    const tooManyShares = metadata.totalYesShares.add(new anchor.BN(10))

    // Try to sell more shares than owned
    try {
      await program.methods
        .sell(true, tooManyShares)
        .accounts({
          market: marketPDA,
          signer: user
        })
        .rpc()

      fail('Expected to fail with NotEnoughShares')
    } catch (error) {
      expect(error).toBeInstanceOf(anchor.AnchorError)
      const anchorError = error as anchor.AnchorError
      expect(anchorError.error.errorCode.code).toEqual('NotEnoughShares')
    }
  })

  it('should not allow selling 0 shares', async () => {
    const uniqueId = Math.random().toString().slice(2, 10)
    const description = `Zero shares test ${uniqueId}`
    const betAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL)

    // Find PDAs
    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
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

    await sleep(1000)

    // Buy YES position
    await program.methods
      .buy(true, betAmount)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    await sleep(1000)

    // Try to sell 0 shares
    try {
      await program.methods
        .sell(true, new anchor.BN(0))
        .accounts({
          market: marketPDA,
          signer: user
        })
        .rpc()

      fail('Expected to fail with NoSharesToSell')
    } catch (error) {
      expect(error).toBeInstanceOf(anchor.AnchorError)
      const anchorError = error as anchor.AnchorError
      expect(anchorError.error.errorCode.code).toEqual('NoSharesToSell')
    }
  })

  it('should not allow selling in a closed market', async () => {
    const uniqueId = Math.random().toString().slice(2, 10)
    const description = `Closed market test ${uniqueId}`
    const betAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL)

    // Create validator account for closing the market
    const validator = Keypair.fromSecretKey(
      new Uint8Array([
        96, 72, 59, 139, 230, 201, 113, 65, 242, 61, 1, 234, 235, 30, 210, 203,
        37, 139, 250, 139, 140, 216, 91, 79, 6, 150, 206, 239, 88, 242, 67, 135,
        95, 97, 47, 93, 235, 6, 127, 156, 200, 141, 180, 240, 247, 182, 16, 254,
        197, 90, 40, 167, 155, 4, 65, 157, 41, 117, 84, 73, 44, 57, 27, 224
      ])
    )

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

    await sleep(1000)

    // Buy YES position
    await program.methods
      .buy(true, betAmount)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    await sleep(1000)

    // Get shares from metadata
    const metadata =
      await program.account.marketMetadata.fetch(marketMetadataPDA)
    const shares = metadata.totalYesShares

    // Close the market
    await program.methods
      .resolveMarket(true)
      .accounts({
        market: marketPDA
      })
      .signers([validator])
      .rpc()

    await sleep(1000)

    // Try to sell in closed market
    try {
      await program.methods
        .sell(true, shares)
        .accounts({
          market: marketPDA,
          signer: user
        })
        .rpc()

      fail('Expected to fail with MarketClosed')
    } catch (error) {
      expect(error).toBeInstanceOf(anchor.AnchorError)
      const anchorError = error as anchor.AnchorError
      expect(anchorError.error.errorCode.code).toEqual('MarketClosed')
    }
  })
})
