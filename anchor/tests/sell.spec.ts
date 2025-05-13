import { getMinimumBalanceForRentExemption } from 'gill'

import * as anchor from '@coral-xyz/anchor'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'

import {
  FACTOR,
  airdropSol,
  getBalance,
  hashString,
  initializeMarket,
  setupProgram,
  sleep
} from './utils'

describe('Yapping::sell', () => {
  const { program, provider, user } = setupProgram()

  it('should buy then sell full shares', async () => {
    const description = 'Test Market Then Sell'
    const imageUrl = 'https://example.com/image.png'
    const endTime = new Date().getTime() + 1000 * 60 * 60 * 24

    await initializeMarket(program, user, description, imageUrl, endTime)

    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    const [marketPositionPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market_position'), marketPDA.toBuffer(), user.toBuffer()],
      program.programId
    )

    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), marketPDA.toBuffer(), user.toBuffer()],
      program.programId
    )

    const rentExemptionLamports = getMinimumBalanceForRentExemption(0)
    await airdropSol(
      provider.connection,
      vaultPDA,
      Number(rentExemptionLamports)
    )
    const vaultBalanceAfterRentAirdrop = await getBalance(
      provider.connection,
      vaultPDA
    )
    expect(Number(vaultBalanceAfterRentAirdrop)).toEqual(
      Number(rentExemptionLamports)
    )

    const betAmount = new anchor.BN(1 * LAMPORTS_PER_SOL) // 1_000_000_000 lamports

    await program.methods
      .buy(true, betAmount)
      .accounts({
        signer: user,
        market: marketPDA
      })
      .rpc()

    const sharesToSell = new anchor.BN((1 * LAMPORTS_PER_SOL) / FACTOR) // 1_000 shares

    const vaultBalanceBeforeSell = await getBalance(
      provider.connection,
      vaultPDA
    )

    await program.methods
      .sell(sharesToSell)
      .accounts({
        signer: user,
        market: marketPDA
      })
      .rpc()

    const vaultBalanceAfterSell = await getBalance(
      provider.connection,
      vaultPDA
    )
    expect(vaultBalanceAfterSell).toBeLessThanOrEqual(vaultBalanceBeforeSell)

    const marketPosition =
      await program.account.marketPosition.fetch(marketPositionPDA)
    expect(marketPosition.shares.toNumber()).toEqual(0)
    expect(marketPosition.amount.toNumber()).toEqual(0)
    expect(marketPosition.bet).toEqual(true)
  })

  it('should sell partial shares until 0 shares', async () => {
    const description = 'Test Market Then Sell 3'
    const imageUrl = 'https://example.com/image.png'
    const endTime = new Date().getTime() + 1000 * 60 * 60 * 24

    await initializeMarket(program, user, description, imageUrl, endTime)

    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    const [marketPositionPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market_position'), marketPDA.toBuffer(), user.toBuffer()],
      program.programId
    )

    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), marketPDA.toBuffer(), user.toBuffer()],
      program.programId
    )

    const rentExemptionLamports = getMinimumBalanceForRentExemption(0)
    await airdropSol(
      provider.connection,
      vaultPDA,
      Number(rentExemptionLamports)
    )

    const betAmount = new anchor.BN(2 * LAMPORTS_PER_SOL) // 2_000_000_000 lamports

    await program.methods
      .buy(true, betAmount)
      .accounts({
        signer: user,
        market: marketPDA
      })
      .rpc()

    const sharesToSell = new anchor.BN((1 * LAMPORTS_PER_SOL) / FACTOR) // 1_000 shares
    const lamportsToReturn = new anchor.BN(1 * LAMPORTS_PER_SOL) // 1_000_000_000 lamports

    // First sell
    const vaultBalanceBeforeFirstSell = await getBalance(
      provider.connection,
      vaultPDA
    )
    await program.methods
      .sell(sharesToSell)
      .accounts({
        signer: user,
        market: marketPDA
      })
      .rpc()

    await sleep(1000) // Keep sleep if it's relevant for blockchain state propagation

    const vaultBalanceAfterFirstSell = await getBalance(
      provider.connection,
      vaultPDA
    )
    expect(Number(vaultBalanceAfterFirstSell)).toBeLessThan(
      Number(vaultBalanceBeforeFirstSell)
    )

    const marketPosition =
      await program.account.marketPosition.fetch(marketPositionPDA)
    expect(marketPosition.shares.toNumber()).toEqual(sharesToSell.toNumber())
    expect(marketPosition.amount.toNumber()).toBeGreaterThan(0)

    // Second sell
    const vaultBalanceBeforeSecondSell = await getBalance(
      provider.connection,
      vaultPDA
    )
    await program.methods
      .sell(sharesToSell)
      .accounts({
        signer: user,
        market: marketPDA
      })
      .rpc()

    await sleep(1000) // Keep sleep

    const vaultBalanceAfterSecondSell = await getBalance(
      provider.connection,
      vaultPDA
    )
    expect(vaultBalanceAfterSecondSell).toBeLessThan(
      vaultBalanceBeforeSecondSell
    )
    expect(vaultBalanceAfterSecondSell).toBeGreaterThanOrEqual(0)

    const marketPosition2 =
      await program.account.marketPosition.fetch(marketPositionPDA)
    expect(marketPosition2.shares.toNumber()).toEqual(0)
    expect(marketPosition2.amount.toNumber()).toEqual(0)
  })

  it('should not sell shares if not enough shares', async () => {
    const description = 'Test Market Then Sell 2'
    const imageUrl = 'https://example.com/image.png'
    const endTime = new Date().getTime() + 1000 * 60 * 60 * 24

    await initializeMarket(program, user, description, imageUrl, endTime)

    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    const [vaultPDA] = PublicKey.findProgramAddressSync(
      // Define vaultPDA to check its balance
      [Buffer.from('vault'), marketPDA.toBuffer(), user.toBuffer()],
      program.programId
    )

    const vaultBalanceBeforeAttempt = await getBalance(
      provider.connection,
      vaultPDA
    ).catch(() => '0') // Vault likely won't exist or be 0

    const sharesToSell = new anchor.BN((1 * LAMPORTS_PER_SOL) / FACTOR) // 1_000 shares

    await expect(
      program.methods
        .sell(sharesToSell)
        .accounts({
          signer: user,
          market: marketPDA
        })
        .rpc()
    ).rejects.toThrow()

    const vaultBalanceAfterAttempt = await getBalance(
      provider.connection,
      vaultPDA
    ).catch(() => '0')
    expect(vaultBalanceAfterAttempt).toEqual(vaultBalanceBeforeAttempt)
  })
})
