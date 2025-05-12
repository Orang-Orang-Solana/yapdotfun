import * as crypto from 'node:crypto'

import type { Program } from '@coral-xyz/anchor'
import * as anchor from '@coral-xyz/anchor'
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'

import type { Yapping } from '../target/types/yapping'

describe('yapping withdraw rewards tests', () => {
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
      LAMPORTS_PER_SOL * 5
    )
    await provider.connection.confirmTransaction(tx)
  })

  it('should allow a user to withdraw rewards for a winning YES bet', async () => {
    const description = `withdraw rewards YES test ${Math.random()}`
    const betAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL)

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

    // Buy with YES
    await program.methods
      .buy(true, betAmount)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    // Sleep briefly to let transactions process
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Resolve market with YES (true) outcome
    await program.methods
      .resolveMarket(true)
      .accounts({
        market: marketPDA
      })
      .signers([validator])
      .rpc()

    // Sleep briefly to let transactions process
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Get balances before withdrawal
    const initialUserBalance = await provider.connection.getBalance(user)
    const initialMarketBalance = await provider.connection.getBalance(marketPDA)

    // Withdraw rewards
    await program.methods
      .withdrawRewards()
      .accounts({
        market: marketPDA,
        user: user
      })
      .rpc()

    // Get final balances
    const finalUserBalance = await provider.connection.getBalance(user)
    const finalMarketBalance = await provider.connection.getBalance(marketPDA)

    // Market balance should decrease
    const marketBalanceDecrease = initialMarketBalance - finalMarketBalance
    expect(marketBalanceDecrease).toBeGreaterThan(0)

    // Total SOL transferred should be reasonably close to the bet amount
    // Market might keep a small amount for rent, etc.
    expect(marketBalanceDecrease).toBeGreaterThan(betAmount.toNumber() * 0.8)

    // Verify the market voter account is closed
    try {
      await program.account.marketVoter.fetch(marketVoterPDA)
      fail('Expected market voter account to be closed')
    } catch (error) {
      // This is expected - account not found
      expect(error).toBeTruthy()
    }
  })

  it('should allow a user to withdraw rewards for a winning NO bet', async () => {
    const description = `withdraw rewards NO test ${Math.random()}`
    const betAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL)

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

    // Buy with NO
    await program.methods
      .buy(false, betAmount)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    // Sleep briefly to let transactions process
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Resolve market with NO (false) outcome
    await program.methods
      .resolveMarket(false)
      .accounts({
        market: marketPDA
      })
      .signers([validator])
      .rpc()

    // Sleep briefly to let transactions process
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Get balances before withdrawal
    const initialUserBalance = await provider.connection.getBalance(user)
    const initialMarketBalance = await provider.connection.getBalance(marketPDA)

    // Withdraw rewards
    await program.methods
      .withdrawRewards()
      .accounts({
        market: marketPDA,
        user: user
      })
      .rpc()

    // Get final balances
    const finalUserBalance = await provider.connection.getBalance(user)
    const finalMarketBalance = await provider.connection.getBalance(marketPDA)

    // Market balance should decrease
    const marketBalanceDecrease = initialMarketBalance - finalMarketBalance
    expect(marketBalanceDecrease).toBeGreaterThan(0)

    // Total SOL transferred should be reasonably close to the bet amount
    // Market might keep a small amount for rent, etc.
    expect(marketBalanceDecrease).toBeGreaterThan(betAmount.toNumber() * 0.8)

    // Verify the market voter account is closed
    try {
      await program.account.marketVoter.fetch(marketVoterPDA)
      fail('Expected market voter account to be closed')
    } catch (error) {
      // This is expected - account not found
      expect(error).toBeTruthy()
    }
  })

  it('should not give rewards for losing bets', async () => {
    const description = 'withdraw rewards losing bet test'
    const betAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL)

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

    // Buy with YES
    await program.methods
      .buy(true, betAmount)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    // Resolve market with NO (false) outcome, making the user's YES bet lose
    await program.methods
      .resolveMarket(false)
      .accounts({
        market: marketPDA
      })
      .signers([validator])
      .rpc()

    // Get balances before withdrawal
    const initialUserBalance = await provider.connection.getBalance(user)
    const initialMarketBalance = await provider.connection.getBalance(marketPDA)

    // Withdraw rewards (should succeed but not transfer rewards)
    await program.methods
      .withdrawRewards()
      .accounts({
        market: marketPDA,
        user: user
      })
      .rpc()

    // Get final balances
    const finalUserBalance = await provider.connection.getBalance(user)
    const finalMarketBalance = await provider.connection.getBalance(marketPDA)

    // User should receive only rent from closed voter account, no rewards
    const balanceIncrease = finalUserBalance - initialUserBalance

    // The user's balance might decrease due to transaction fees being more than
    // any returned rent from the closed account
    // Allow for negative balance change because of transaction fees
    expect(balanceIncrease).toBeLessThan(betAmount.toNumber() * 0.5)

    // Market balance may decrease slightly due to rent being returned
    const marketBalanceDecrease = initialMarketBalance - finalMarketBalance
    expect(marketBalanceDecrease).toBeLessThan(betAmount.toNumber() * 0.5)
  })

  it('should fail to withdraw rewards from an open market', async () => {
    const description = 'withdraw from open market test'
    const betAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL)

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

    // Buy with YES
    await program.methods
      .buy(true, betAmount)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    // Try to withdraw rewards (should fail because market is still open)
    try {
      await program.methods
        .withdrawRewards()
        .accounts({
          market: marketPDA,
          user: user
        })
        .rpc()

      fail('Should not reach here - expected transaction to fail')
    } catch (error) {
      expect(error).toBeInstanceOf(anchor.AnchorError)
      const anchorError = error as anchor.AnchorError
      expect(anchorError.error.errorCode.code).toEqual('MarketNotClosed')
    }
  })

  it('should correctly distribute rewards among multiple winners', async () => {
    const description = `multiple winners test ${Math.random()}`

    // Create a second user
    const user2 = Keypair.generate()

    // Airdrop SOL to user2
    const airdropTx = await provider.connection.requestAirdrop(
      user2.publicKey,
      LAMPORTS_PER_SOL * 2
    )
    await provider.connection.confirmTransaction(airdropTx)

    // Find PDAs
    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    const [marketMetadataPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market_metadata'), marketPDA.toBuffer()],
      program.programId
    )

    // Find PDAs for market voters
    const [marketVoterPDA1] = PublicKey.findProgramAddressSync(
      [Buffer.from('market_voter'), user.toBuffer(), marketPDA.toBuffer()],
      program.programId
    )

    const [marketVoterPDA2] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('market_voter'),
        user2.publicKey.toBuffer(),
        marketPDA.toBuffer()
      ],
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

    // Sleep briefly between transactions
    await new Promise((resolve) => setTimeout(resolve, 500))

    // User 1 buys YES with 0.5 SOL
    const betAmount1 = new anchor.BN(0.5 * LAMPORTS_PER_SOL)
    // Calculate expected shares based on 1_000_000 conversion rate
    const expectedShares1 = betAmount1.div(new anchor.BN(1_000_000))

    await program.methods
      .buy(true, betAmount1)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    // Sleep briefly between transactions
    await new Promise((resolve) => setTimeout(resolve, 500))

    // User 2 buys YES with 1 SOL
    const betAmount2 = new anchor.BN(1 * LAMPORTS_PER_SOL)
    // Calculate expected shares based on 1_000_000 conversion rate
    const expectedShares2 = betAmount2.div(new anchor.BN(1_000_000))

    await program.methods
      .buy(true, betAmount2)
      .accounts({
        market: marketPDA,
        signer: user2.publicKey
      })
      .signers([user2])
      .rpc()

    // Sleep briefly between transactions
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Verify the shares were correctly calculated
    const metadataBeforeResolve =
      await program.account.marketMetadata.fetch(marketMetadataPDA)
    const totalShares = expectedShares1.add(expectedShares2)
    expect(metadataBeforeResolve.totalYesShares.toString()).toEqual(
      totalShares.toString()
    )

    // Total rewards should be sum of all bets
    const totalRewards = betAmount1.add(betAmount2)
    expect(metadataBeforeResolve.totalRewards.toString()).toEqual(
      totalRewards.toString()
    )

    // Resolve market with YES (true) outcome
    await program.methods
      .resolveMarket(true)
      .accounts({
        market: marketPDA
      })
      .signers([validator])
      .rpc()

    // Sleep briefly between transactions
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Get initial balances
    const initialMarketBalance = await provider.connection.getBalance(marketPDA)
    const initialUserBalance = await provider.connection.getBalance(user)
    const initialUser2Balance = await provider.connection.getBalance(
      user2.publicKey
    )

    // User 1 withdraws rewards - should get 1/3 of the pool based on shares (0.5 vs 1.0 SOL invested)
    await program.methods
      .withdrawRewards()
      .accounts({
        market: marketPDA,
        user: user
      })
      .rpc()

    // Sleep briefly between transactions
    await new Promise((resolve) => setTimeout(resolve, 500))

    // User 2 withdraws rewards - should get 2/3 of the pool based on shares (1.0 vs 0.5 SOL invested)
    await program.methods
      .withdrawRewards()
      .accounts({
        market: marketPDA,
        user: user2.publicKey
      })
      .signers([user2])
      .rpc()

    // Get final balances
    const finalMarketBalance = await provider.connection.getBalance(marketPDA)
    const finalUserBalance = await provider.connection.getBalance(user)
    const finalUser2Balance = await provider.connection.getBalance(
      user2.publicKey
    )

    // Calculate rewards received (accounting for transaction fees)
    const user1Increase = finalUserBalance - initialUserBalance
    const user2Increase = finalUser2Balance - initialUser2Balance

    // Market balance should decrease by the sum of rewards paid out plus rent
    const marketBalanceDecrease = initialMarketBalance - finalMarketBalance

    // The expected proportion for reward distribution
    // User 1 had 1/3 of the shares, User 2 had 2/3 of the shares
    const totalSpentOnBets = betAmount1.add(betAmount2).toNumber()

    // User 1 should get approximately 1/3 of the reward pool
    // Allow for some variance due to gas fees and rounding
    expect(user1Increase).toBeGreaterThan(totalSpentOnBets * 0.3 * 0.9) // At least 90% of expected 1/3
    expect(user1Increase).toBeLessThan(totalSpentOnBets * 0.4) // No more than 40% of total

    // User 2 should get approximately 2/3 of the reward pool
    // Allow for some variance due to gas fees and rounding
    expect(user2Increase).toBeGreaterThan(totalSpentOnBets * 0.6 * 0.9) // At least 90% of expected 2/3
    expect(user2Increase).toBeLessThan(totalSpentOnBets * 0.7) // No more than 70% of total

    // Verify that both users together got most of the pool
    expect(user1Increase + user2Increase).toBeGreaterThan(
      totalSpentOnBets * 0.9
    )

    // Verify that the market account was reduced by approximately the total rewards
    expect(marketBalanceDecrease).toBeGreaterThanOrEqual(totalSpentOnBets * 0.9)
  })
})
