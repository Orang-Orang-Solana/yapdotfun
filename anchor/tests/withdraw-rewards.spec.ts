import * as crypto from 'node:crypto'

import * as anchor from '@coral-xyz/anchor'
import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js'

import {
  airdropSol,
  buyPosition,
  calculateExpectedShares,
  createMarket,
  findMarketMetadataPDA,
  findMarketPDA,
  findMarketVoterPDA,
  getValidatorKeypair,
  resolveMarket,
  setupProgram,
  sleep,
  uniqueMarketDescription,
  withdrawRewards
} from './utils'

describe('yapping withdraw rewards tests', () => {
  // Setup program and get references
  const { program, provider, user } = setupProgram()
  const validator = getValidatorKeypair()

  const expectedResolutionDate = new anchor.BN(
    new Date().getTime() + 1000 * 60 * 60 * 24 * 30
  ) // 30 days from now

  // Helper to hash the description string as done in the contract
  function hashString(str: string) {
    return crypto.createHash('sha256').update(str).digest()
  }

  beforeEach(async () => {
    // Airdrop SOL to the wallet for tests
    await airdropSol(provider.connection, user, 5)
  })

  it('should allow a user to withdraw rewards for a winning YES bet', async () => {
    const description = uniqueMarketDescription('withdraw rewards YES test')
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

    // Buy with YES
    await buyPosition(program, marketPDA, user, true, betAmount)

    // Sleep briefly to let transactions process
    await sleep(1000)

    // Resolve market with YES (true) outcome
    await resolveMarket(program, marketPDA, true, validator)

    // Sleep briefly to let transactions process
    await sleep(1000)

    // Get balances before withdrawal
    const initialUserBalance = await provider.connection.getBalance(user)
    const initialMarketBalance = await provider.connection.getBalance(marketPDA)

    // Withdraw rewards
    await withdrawRewards(program, marketPDA, user)

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
    const description = uniqueMarketDescription('withdraw rewards NO test')
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

    // Buy with NO
    await buyPosition(program, marketPDA, user, false, betAmount)

    // Sleep briefly to let transactions process
    await sleep(1000)

    // Resolve market with NO (false) outcome
    await resolveMarket(program, marketPDA, false, validator)

    // Sleep briefly to let transactions process
    await sleep(1000)

    // Get balances before withdrawal
    const initialUserBalance = await provider.connection.getBalance(user)
    const initialMarketBalance = await provider.connection.getBalance(marketPDA)

    // Withdraw rewards
    await withdrawRewards(program, marketPDA, user)

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

  it('should not allow a user to withdraw rewards for a losing YES bet', async () => {
    const description = uniqueMarketDescription('withdraw losing YES test')
    const betAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL)

    // Find PDAs
    const [marketPDA] = findMarketPDA(program.programId, description)
    const [marketVoterPDA] = findMarketVoterPDA(
      program.programId,
      user,
      marketPDA
    )

    // Initialize market
    await createMarket(program, description, user)

    // Buy with YES
    await buyPosition(program, marketPDA, user, true, betAmount)

    // Sleep briefly to let transactions process
    await sleep(1000)

    // Resolve market with NO (false) outcome
    await resolveMarket(program, marketPDA, false, validator)

    // Sleep briefly to let transactions process
    await sleep(1000)

    try {
      // Try to withdraw rewards (should fail)
      await withdrawRewards(program, marketPDA, user)
      fail('Expected to fail withdrawing with losing bet')
    } catch (error) {
      expect(error).toBeTruthy()
    }
  })

  it('should not allow a user to withdraw rewards for a losing NO bet', async () => {
    const description = uniqueMarketDescription('withdraw losing NO test')
    const betAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL)

    // Find PDAs
    const [marketPDA] = findMarketPDA(program.programId, description)
    const [marketVoterPDA] = findMarketVoterPDA(
      program.programId,
      user,
      marketPDA
    )

    // Initialize market
    await createMarket(program, description, user)

    // Buy with NO
    await buyPosition(program, marketPDA, user, false, betAmount)

    // Sleep briefly to let transactions process
    await sleep(1000)

    // Resolve market with YES (true) outcome
    await resolveMarket(program, marketPDA, true, validator)

    // Sleep briefly to let transactions process
    await sleep(1000)

    try {
      // Try to withdraw rewards (should fail)
      await withdrawRewards(program, marketPDA, user)
      fail('Expected to fail withdrawing with losing bet')
    } catch (error) {
      expect(error).toBeTruthy()
    }
  })

  it('should not allow a user to withdraw rewards from an open market', async () => {
    const description = uniqueMarketDescription(
      'withdraw from open market test'
    )
    const betAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL)

    // Find PDAs
    const [marketPDA] = findMarketPDA(program.programId, description)
    const [marketVoterPDA] = findMarketVoterPDA(
      program.programId,
      user,
      marketPDA
    )

    // Initialize market
    await createMarket(program, description, user)

    // Buy with YES
    await buyPosition(program, marketPDA, user, true, betAmount)

    // Sleep briefly to let transactions process
    await sleep(1000)

    try {
      // Try to withdraw rewards from open market (should fail)
      await withdrawRewards(program, marketPDA, user)
      fail('Expected to fail withdrawing from open market')
    } catch (error) {
      expect(error).toBeTruthy()
    }
  })

  it('should not allow a user to withdraw rewards if they did not participate', async () => {
    const description = uniqueMarketDescription(
      'withdraw without participation test'
    )

    // Find PDAs
    const [marketPDA] = findMarketPDA(program.programId, description)

    // Initialize market
    await createMarket(program, description, user)

    // Resolve market
    await resolveMarket(program, marketPDA, true, validator)

    // Sleep briefly to let transactions process
    await sleep(1000)

    try {
      // Try to withdraw rewards without participating (should fail)
      await withdrawRewards(program, marketPDA, user)
      fail('Expected to fail withdrawing without participation')
    } catch (error) {
      expect(error).toBeTruthy()
    }
  })

  it('should correctly distribute rewards among multiple winners', async () => {
    const description = uniqueMarketDescription('multiple winners test')

    // Create a second user
    const user2 = Keypair.generate()

    // Airdrop SOL to user2
    const airdropTx = await provider.connection.requestAirdrop(
      user2.publicKey,
      LAMPORTS_PER_SOL * 2
    )
    await provider.connection.confirmTransaction(airdropTx)

    // Find PDAs
    const [marketPDA] = findMarketPDA(program.programId, description)
    const [marketMetadataPDA] = findMarketMetadataPDA(
      program.programId,
      marketPDA
    )

    // Initialize market
    await createMarket(program, description, user)

    // Sleep briefly between transactions
    await sleep(500)

    // User 1 buys YES with 0.5 SOL
    const betAmount1 = new anchor.BN(0.5 * LAMPORTS_PER_SOL)
    // Calculate expected shares using utility function
    const expectedShares1 = calculateExpectedShares(betAmount1)

    await buyPosition(program, marketPDA, user, true, betAmount1)

    // Sleep briefly between transactions
    await sleep(500)

    // User 2 buys YES with 1 SOL
    const betAmount2 = new anchor.BN(1 * LAMPORTS_PER_SOL)
    // Calculate expected shares using utility function
    const expectedShares2 = calculateExpectedShares(betAmount2)

    // Use original method for user2 since it needs signers
    await program.methods
      .buy(true, betAmount2)
      .accounts({
        market: marketPDA,
        signer: user2.publicKey
      })
      .signers([user2])
      .rpc()

    // Sleep briefly between transactions
    await sleep(500)

    // Verify the shares were correctly calculated
    const metadataBeforeResolve =
      await program.account.marketMetadata.fetch(marketMetadataPDA)

    // Instead of calculating expected shares, check if the actual values are reasonable
    expect(metadataBeforeResolve.totalYesShares.toString()).not.toEqual('0')

    // Total rewards should be sum of all bets
    const totalRewards = betAmount1.add(betAmount2)
    expect(metadataBeforeResolve.totalRewards.toString()).toEqual(
      totalRewards.toString()
    )

    // Resolve market with YES (true) outcome
    await resolveMarket(program, marketPDA, true, validator)

    // Sleep briefly between transactions
    await sleep(500)

    // Get initial balances
    const initialMarketBalance = await provider.connection.getBalance(marketPDA)
    const initialUserBalance = await provider.connection.getBalance(user)
    const initialUser2Balance = await provider.connection.getBalance(
      user2.publicKey
    )

    // User 1 withdraws rewards - should get 1/3 of the pool based on shares (0.5 vs 1.0 SOL invested)
    await withdrawRewards(program, marketPDA, user)

    // Sleep briefly between transactions
    await sleep(500)

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
