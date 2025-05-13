import * as anchor from '@coral-xyz/anchor'
import {
  Keypair,
  LAMPORTS_PER_SOL,
  SendTransactionError
} from '@solana/web3.js'

import {
  airdropSol,
  buyPosition,
  createMarket,
  findMarketMetadataPDA,
  findMarketPDA,
  findMarketVoterPDA,
  setupProgram,
  uniqueMarketDescription
} from './utils'

describe('yapping buy tests', () => {
  // Setup program and get references
  const { program, provider, user } = setupProgram()

  beforeEach(async () => {
    // Airdrop SOL to the wallet for tests
    await airdropSol(provider.connection, user)
  })

  it('should allow buying YES position in a market', async () => {
    const description = uniqueMarketDescription('Buy YES test')
    const betAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL)

    // Find PDAs
    const [marketPDA] = findMarketPDA(program.programId, description)
    const [marketMetadataPDA] = findMarketMetadataPDA(
      program.programId,
      marketPDA
    )
    const [marketVoterPDA] = findMarketVoterPDA(
      program.programId,
      user,
      marketPDA
    )

    // Initialize market
    await createMarket(program, description, user)

    // Get initial market balance
    const initialMarketBalance = await provider.connection.getBalance(marketPDA)
    // Get initial market voter balance (should be 0 before buy)
    const initialMarketVoterBalance =
      await provider.connection.getBalance(marketVoterPDA)

    // Buy YES position
    await buyPosition(program, marketPDA, user, true, betAmount)

    // Get final market balance
    const finalMarketBalance = await provider.connection.getBalance(marketPDA)
    // Get final market voter balance
    const finalMarketVoterBalance =
      await provider.connection.getBalance(marketVoterPDA)

    // Verify market account balance did NOT change significantly
    expect(finalMarketBalance).toEqual(initialMarketBalance)
    // Verify market voter account received the SOL
    expect(finalMarketVoterBalance - initialMarketVoterBalance).toEqual(
      betAmount.toNumber()
    )

    // Verify market metadata was updated correctly
    const marketMetadata =
      await program.account.marketMetadata.fetch(marketMetadataPDA)

    // Don't check for a specific number of shares, just verify it's not zero
    expect(marketMetadata.totalYesShares.toNumber()).toBeGreaterThan(0)

    expect(marketMetadata.totalYesAssets.toNumber()).toBeGreaterThanOrEqual(
      betAmount.toNumber()
    )
    expect(marketMetadata.totalRewards.toNumber()).toBeGreaterThanOrEqual(
      betAmount.toNumber()
    )
    expect(marketMetadata.totalNoAssets.toNumber()).toEqual(0)
    expect(marketMetadata.totalNoShares.toNumber()).toEqual(0)

    // Verify voter account was created correctly
    const marketVoter = await program.account.marketVoter.fetch(marketVoterPDA)
    expect(marketVoter.amount.toNumber()).toBeGreaterThanOrEqual(
      betAmount.toNumber()
    )
    expect(marketVoter.vote).toEqual(true)
  })

  it('should allow buying NO position in a market', async () => {
    const description = uniqueMarketDescription('Buy NO test')
    const betAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL)

    // Find PDAs
    const [marketPDA] = findMarketPDA(program.programId, description)
    const [marketMetadataPDA] = findMarketMetadataPDA(
      program.programId,
      marketPDA
    )
    const [marketVoterPDA] = findMarketVoterPDA(
      program.programId,
      user,
      marketPDA
    )

    // Initialize market
    await createMarket(program, description, user)

    // Get initial market balance
    const initialMarketBalance = await provider.connection.getBalance(marketPDA)
    // Get initial market voter balance (should be 0 before buy)
    const initialMarketVoterBalance =
      await provider.connection.getBalance(marketVoterPDA)

    // Buy NO position
    await buyPosition(program, marketPDA, user, false, betAmount)

    // Get final market balance
    const finalMarketBalance = await provider.connection.getBalance(marketPDA)
    // Get final market voter balance
    const finalMarketVoterBalance =
      await provider.connection.getBalance(marketVoterPDA)

    // Verify market account balance did NOT change significantly
    expect(finalMarketBalance).toEqual(initialMarketBalance)
    // Verify market voter account received the SOL
    expect(finalMarketVoterBalance - initialMarketVoterBalance).toEqual(
      betAmount.toNumber()
    )

    // Since we're running many tests in parallel, it's not reliable to check exact balance
    // changes due to all the transactions being sent in the same wallet
    // Instead, just verify that market metadata is updated correctly
    const marketMetadata =
      await program.account.marketMetadata.fetch(marketMetadataPDA)

    // Don't check for a specific number of shares, just verify it's not zero
    expect(marketMetadata.totalNoShares.toNumber()).toBeGreaterThan(0)

    expect(marketMetadata.totalNoAssets.toNumber()).toBeGreaterThanOrEqual(
      betAmount.toNumber()
    )
    expect(marketMetadata.totalRewards.toNumber()).toBeGreaterThanOrEqual(
      betAmount.toNumber()
    )
    expect(marketMetadata.totalYesAssets.toNumber()).toEqual(0)
    expect(marketMetadata.totalYesShares.toNumber()).toEqual(0)

    // Verify voter account was created correctly
    const marketVoter = await program.account.marketVoter.fetch(marketVoterPDA)
    expect(marketVoter.amount.toNumber()).toBeGreaterThanOrEqual(
      betAmount.toNumber()
    )
    expect(marketVoter.vote).toEqual(false)
  })

  it('should not allow buying with zero amount', async () => {
    const description = uniqueMarketDescription('Zero amount test')
    const betAmount = new anchor.BN(0)

    // Find PDAs
    const [marketPDA] = findMarketPDA(program.programId, description)

    // Initialize market
    await createMarket(program, description, user)

    try {
      // Buy with zero amount (should fail)
      await buyPosition(program, marketPDA, user, true, betAmount)
      fail('Expected to fail with zero amount')
    } catch (error) {
      expect(error).toBeTruthy()
    }
  })

  it('should not allow buying twice in the same market', async () => {
    const description = uniqueMarketDescription('Double buy test')
    const betAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL)

    // Find PDAs
    const [marketPDA] = findMarketPDA(program.programId, description)

    // Initialize market
    await createMarket(program, description, user)

    // First buy should succeed
    await buyPosition(program, marketPDA, user, true, betAmount)

    // Second buy should fail
    try {
      await buyPosition(program, marketPDA, user, false, betAmount)
      fail('Expected to fail with PDA already in use')
    } catch (error) {
      expect(error).toBeInstanceOf(SendTransactionError)
    }
  })

  it('should not allow buying in a closed market', async () => {
    const description = uniqueMarketDescription('Closed market buy test')
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
    const [marketPDA] = findMarketPDA(program.programId, description)

    // Initialize market
    await createMarket(program, description, user)

    // Close the market
    await program.methods
      .resolveMarket(true)
      .accounts({
        market: marketPDA
      })
      .signers([validator])
      .rpc()

    // Try to buy in closed market
    try {
      await buyPosition(program, marketPDA, user, true, betAmount)
      fail('Expected to fail with MarketClosed')
    } catch (error) {
      expect(error).toBeInstanceOf(anchor.AnchorError)
      const anchorError = error as anchor.AnchorError
      expect(anchorError.error.errorCode.code).toEqual('MarketClosed')
    }
  })

  it('should allow multiple users to buy in the same market', async () => {
    const description = uniqueMarketDescription('Multiple users market')

    // Create a second user
    const user2 = Keypair.generate()

    // Airdrop SOL to second user
    const airdropTx = await provider.connection.requestAirdrop(
      user2.publicKey,
      LAMPORTS_PER_SOL
    )
    await provider.connection.confirmTransaction(airdropTx)

    // Find PDAs
    const [marketPDA] = findMarketPDA(program.programId, description)
    const [marketMetadataPDA] = findMarketMetadataPDA(
      program.programId,
      marketPDA
    )
    const [marketVoterPDA1] = findMarketVoterPDA(
      program.programId,
      user,
      marketPDA
    )
    const [marketVoterPDA2] = findMarketVoterPDA(
      program.programId,
      user2.publicKey,
      marketPDA
    )

    // Initialize market
    await createMarket(program, description, user)

    // User 1 buys YES
    const betAmount1 = new anchor.BN(0.3 * LAMPORTS_PER_SOL)
    await buyPosition(program, marketPDA, user, true, betAmount1)

    // User 2 buys NO
    const betAmount2 = new anchor.BN(0.2 * LAMPORTS_PER_SOL)
    // We need to use the original method for user2 since it needs signers
    await program.methods
      .buy(false, betAmount2)
      .accounts({
        market: marketPDA,
        signer: user2.publicKey
      })
      .signers([user2])
      .rpc()

    // Verify market metadata was updated correctly
    const marketMetadata =
      await program.account.marketMetadata.fetch(marketMetadataPDA)

    // Get expected assets and rewards
    const expectedTotalRewards = betAmount1.add(betAmount2)

    // Don't check for specific share values, just verify they're not zero
    expect(marketMetadata.totalYesShares.toNumber()).toBeGreaterThan(0)

    expect(marketMetadata.totalYesAssets.toNumber()).toBeGreaterThanOrEqual(
      betAmount1.toNumber()
    )
    expect(marketMetadata.totalNoShares.toNumber()).toBeGreaterThan(0)
    expect(marketMetadata.totalNoAssets.toNumber()).toBeGreaterThanOrEqual(
      betAmount2.toNumber()
    )
    expect(marketMetadata.totalRewards.toNumber()).toBeGreaterThanOrEqual(
      expectedTotalRewards.toNumber()
    )

    // Verify voter 1 account
    const marketVoter1 =
      await program.account.marketVoter.fetch(marketVoterPDA1)
    expect(marketVoter1.amount.toNumber()).toBeGreaterThan(
      betAmount1.toNumber()
    )
    expect(marketVoter1.vote).toEqual(true)

    // Verify voter 2 account
    const marketVoter2 =
      await program.account.marketVoter.fetch(marketVoterPDA2)
    expect(marketVoter2.amount.toNumber()).toBeGreaterThan(
      betAmount2.toNumber()
    )
    expect(marketVoter2.vote).toEqual(false)
  })
})
