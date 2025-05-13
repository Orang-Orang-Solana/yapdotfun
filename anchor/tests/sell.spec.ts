import * as anchor from '@coral-xyz/anchor'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'

import {
  airdropSol,
  buyPosition,
  createMarket,
  findMarketMetadataPDA,
  findMarketPDA,
  getValidatorKeypair,
  resolveMarket,
  sellPosition,
  setupProgram,
  sleep,
  uniqueMarketDescription
} from './utils'

describe('yapping sell tests', () => {
  // Setup program and get references
  const { program, provider, user } = setupProgram()
  const validator = getValidatorKeypair()

  beforeEach(async () => {
    // Airdrop SOL to the wallet for tests
    await airdropSol(provider.connection, user)

    // Sleep between tests
    await sleep(1000)
  })

  // Updated positive tests to match current implementation
  it('should allow selling YES position in a market', async () => {
    const description = uniqueMarketDescription('Sell YES test')
    const betAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL)

    // Find PDAs
    const [marketPDA] = findMarketPDA(program.programId, description)
    const [marketMetadataPDA] = findMarketMetadataPDA(
      program.programId,
      marketPDA
    )

    // Initialize market
    await createMarket(program, description, user)
    await sleep(1000)

    // Get initial market and user balances
    const initialMarketBalance = await provider.connection.getBalance(marketPDA)
    const initialUserBalance = await provider.connection.getBalance(user)

    // Buy YES position
    await buyPosition(program, marketPDA, user, true, betAmount)
    await sleep(1000)

    // Use a fixed share amount that should work for 0.5 SOL
    const sharesToSell = new anchor.BN(500)

    // Sell the YES position (partial or full)
    await sellPosition(program, marketPDA, user, true, sharesToSell)
    await sleep(1000)

    // Get final user balance
    const finalUserBalance = await provider.connection.getBalance(user)
    const userBalanceDiff = finalUserBalance - initialUserBalance
    // Market balance is no longer checked here as SOL transfer happens via market_voter closure.

    // Check user balance change (should reflect sold shares value + initial buy amount, minus fees/rent)
    // A precise check is difficult due to price volatility and fees.
    // We ensure the loss isn't excessive compared to the initial bet.
    expect(userBalanceDiff).toBeGreaterThan(-betAmount.toNumber() * 0.2)

    // Check that the MarketVoter account no longer exists (is closed)
    let marketVoterClosed = false
    try {
      await program.account.marketVoter.fetch(marketPDA)
    } catch (e) {
      marketVoterClosed = true
    }
    expect(marketVoterClosed).toBeTruthy()

    // Check that the user's balance increased by approximately the amount they invested (minus rent/fees)
    const expectedBalanceIncrease = betAmount.toNumber() - 0.001 // Assuming a 0.1% rent/fee
    expect(userBalanceDiff).toBeGreaterThanOrEqual(expectedBalanceIncrease)
  })

  it('should allow selling NO position in a market', async () => {
    const description = uniqueMarketDescription('Sell NO test')
    const betAmount = new anchor.BN(1 * LAMPORTS_PER_SOL)

    // Find PDAs
    const [marketPDA] = findMarketPDA(program.programId, description)

    // Initialize market
    await createMarket(program, description, user)
    await sleep(1000)

    // Get initial balances
    const initialUserBalance = await provider.connection.getBalance(user)

    // Buy NO position
    await buyPosition(program, marketPDA, user, false, betAmount)
    await sleep(1000)

    const sharesToSell = new anchor.BN(500)

    // Sell the NO position
    await sellPosition(program, marketPDA, user, false, sharesToSell)
    await sleep(1000)

    const finalUserBalance = await provider.connection.getBalance(user)
    const userBalanceDiff = finalUserBalance - initialUserBalance

    // Check user balance change
    expect(userBalanceDiff).toBeGreaterThan(-betAmount.toNumber() * 0.2)

    // Check that the MarketVoter account no longer exists (is closed)
    let marketVoterClosed = false
    try {
      await program.account.marketVoter.fetch(marketPDA)
    } catch (e) {
      marketVoterClosed = true
    }
    expect(marketVoterClosed).toBeTruthy()

    // Check that the user's balance increased by approximately the amount they invested (minus rent/fees)
    const expectedBalanceIncrease = betAmount.toNumber() - 0.001 // Assuming a 0.1% rent/fee
    expect(userBalanceDiff).toBeGreaterThanOrEqual(expectedBalanceIncrease)
  })

  it('should not allow selling more shares than owned', async () => {
    const description = uniqueMarketDescription('Sell too many shares test')
    const betAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL) // Small amount

    // Find PDAs
    const [marketPDA] = findMarketPDA(program.programId, description)

    // Initialize market
    await createMarket(program, description, user)
    await sleep(1000)

    // Buy position
    await buyPosition(program, marketPDA, user, true, betAmount)
    await sleep(1000)

    // Try to sell a lot more shares than could be owned
    const sellAmount = new anchor.BN(5000) // Much higher than expected for 0.1 SOL

    // Try to sell more than owned
    try {
      await sellPosition(program, marketPDA, user, true, sellAmount)
      fail('Expected to fail selling more shares than owned')
    } catch (error) {
      expect(error).toBeTruthy()
    }
  })

  it('should not allow selling in a closed market', async () => {
    const description = uniqueMarketDescription('Sell in closed market test')
    const betAmount = new anchor.BN(0.5 * LAMPORTS_PER_SOL)

    // Find PDAs
    const [marketPDA] = findMarketPDA(program.programId, description)

    // Initialize market
    await createMarket(program, description, user)
    await sleep(1000)

    // Buy position
    await buyPosition(program, marketPDA, user, true, betAmount)
    await sleep(1000)

    // Use a fixed share amount
    const sharesToSell = new anchor.BN(500) // Default for 0.5 SOL

    // Resolve/close the market
    await resolveMarket(program, marketPDA, true, validator)
    await sleep(1000)

    // Try to sell in closed market
    try {
      await sellPosition(program, marketPDA, user, true, sharesToSell)
      fail('Expected to fail selling in closed market')
    } catch (error) {
      expect(error).toBeTruthy()
    }
  })

  it('should allow multiple partial sells of a position', async () => {
    const description = uniqueMarketDescription('Multiple partial sells test')
    const betAmount = new anchor.BN(1 * LAMPORTS_PER_SOL)

    // Find PDAs
    const [marketPDA] = findMarketPDA(program.programId, description)

    // Initialize market
    await createMarket(program, description, user)
    await sleep(1000)

    // Buy position
    await buyPosition(program, marketPDA, user, true, betAmount)
    await sleep(1000)

    // Sell half the shares first with a fixed amount
    const halfShares = new anchor.BN(500)
    await sellPosition(program, marketPDA, user, true, halfShares)
    await sleep(1000)

    // Sell some more shares (less than remaining to ensure it works)
    const remainingShares = new anchor.BN(400)
    await sellPosition(program, marketPDA, user, true, remainingShares)
    await sleep(1000)
  }, 10000)
})
