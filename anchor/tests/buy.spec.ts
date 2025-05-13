import { getMinimumBalanceForRentExemption } from 'gill'

import * as anchor from '@coral-xyz/anchor'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'

import {
  FACTOR,
  airdropSol,
  getBalance,
  hashString,
  initializeMarket,
  setupProgram
} from './utils'

describe('Yapping::buy', () => {
  const { program, provider, user } = setupProgram()

  // happy cases
  it('should buy, buy more, and market position is updated', async () => {
    try {
      const description = 'Test Market'
      const imageUrl = 'https://example.com/image.png'
      const endTime = new Date().getTime() + 1000 * 60 * 60 * 24

      await initializeMarket(program, user, description, imageUrl, endTime)

      const [marketPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('market'), hashString(description)],
        program.programId
      )

      const [vault] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), marketPDA.toBuffer(), user.toBuffer()],
        program.programId
      )

      const [marketPositionPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('market_position'), marketPDA.toBuffer(), user.toBuffer()],
        program.programId
      )

      // fund the vault for rent exemption
      const rentExemption = getMinimumBalanceForRentExemption(0)
      await airdropSol(provider.connection, vault, Number(rentExemption))

      const betAmount = new anchor.BN(1 * LAMPORTS_PER_SOL)

      await program.methods
        .buy(true, betAmount)
        .accounts({
          signer: user,
          market: marketPDA
        })
        .rpc()

      const marketPosition =
        await program.account.marketPosition.fetch(marketPositionPDA)
      expect(marketPosition.shares.toNumber()).toEqual(
        (1 * LAMPORTS_PER_SOL) / FACTOR
      )
      expect(marketPosition.amount.toNumber()).toEqual(1 * LAMPORTS_PER_SOL)
      expect(marketPosition.bet).toEqual(true)

      const vaultBalance = await getBalance(provider.connection, vault)
      console.log('vaultBalance', vaultBalance)
      expect(vaultBalance).not.toBe('0')

      await program.methods
        .buy(true, betAmount)
        .accounts({
          signer: user,
          market: marketPDA
        })
        .rpc()

      const marketPosition2 =
        await program.account.marketPosition.fetch(marketPositionPDA)
      expect(marketPosition2.shares.toNumber()).toEqual(
        (2 * LAMPORTS_PER_SOL) / FACTOR
      )
      expect(marketPosition2.amount.toNumber()).toEqual(2 * LAMPORTS_PER_SOL)
      expect(marketPosition2.bet).toEqual(true)
    } catch (e) {
      console.error(e)
    }
  })
})
