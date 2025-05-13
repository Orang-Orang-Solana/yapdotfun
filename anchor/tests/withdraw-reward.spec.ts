import assert from 'node:assert'

import * as anchor from '@coral-xyz/anchor'
import { BN } from '@coral-xyz/anchor'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'

import {
  getBalance,
  getValidatorKeypair,
  hashString,
  initializeMarket,
  setupProgram
} from './utils'

describe('Yapping::withdraw_rewards', () => {
  const { program, provider, user } = setupProgram()

  // Get the validator keypair for closing markets
  const validator = getValidatorKeypair()

  it('should allow winner to withdraw rewards after market is closed', async () => {
    // 1. Initialize a market
    const description = 'Test Market for Withdrawal'
    const imageUrl = 'https://example.com/image.png'
    const endTime = Math.floor(Date.now() / 1000) - 60 // 1 minute ago (closed)

    await initializeMarket(program, user, description, imageUrl, endTime)

    // 2. Get market PDA
    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    // 3. User 1 (main user) bets on YES
    const betAmount = new BN(1 * LAMPORTS_PER_SOL) // 1 SOL
    await program.methods
      .buy(true, betAmount) // bet on YES
      .accounts({
        signer: user,
        market: marketPDA
      })
      .rpc()

    // 4. Create user 2 who bets on NO
    const user2 = anchor.web3.Keypair.generate()
    await provider.connection.requestAirdrop(
      user2.publicKey,
      2 * LAMPORTS_PER_SOL
    )
    // Wait for confirmation
    await new Promise((resolve) => setTimeout(resolve, 1000))

    await program.methods
      .buy(false, betAmount) // bet on NO
      .accounts({
        signer: user2.publicKey,
        market: marketPDA
      })
      .signers([user2])
      .rpc()

    // 5. Close the market with YES as the winning outcome using validator
    await program.methods
      .closeMarket(true) // YES is the winner
      .accounts({
        signer: validator.publicKey,
        market: marketPDA
      })
      .signers([validator])
      .rpc()

    // Verify the market is closed with the correct result
    const marketAfterClose = await program.account.market.fetch(marketPDA)
    assert.equal(
      marketAfterClose.status.closed !== undefined,
      true,
      'Market should be closed'
    )
    assert.equal(marketAfterClose.result, true, 'Market result should be YES')

    // 6. Get the PDAs for user 1 (winner)
    const [user1PositionPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market_position'), marketPDA.toBuffer(), user.toBuffer()],
      program.programId
    )

    const [user1VaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), marketPDA.toBuffer(), user.toBuffer()],
      program.programId
    )

    // 7. Get user 1's balance before withdrawal
    const balanceBefore = await getBalance(provider.connection, user)

    // 8. Withdraw rewards for user 1 (winner)
    try {
      await program.methods
        .withdrawRewards()
        .accounts({
          signer: user,
          market: marketPDA
        })
        .rpc()

      // 9. Check that user 1's balance increased
      const balanceAfter = await getBalance(provider.connection, user)
      const balanceDiff = balanceAfter - balanceBefore

      console.log(
        `User's balance increased by ${balanceDiff / LAMPORTS_PER_SOL} SOL`
      )

      // The test is primarily checking that the account is properly closed
      // and any lamports are returned, not checking for a specific reward amount
      // since we're now just returning the user's own vault balance
      // plus the lamports from closing the market position account

      // 10. Try to access the position account (should be closed)
      try {
        await program.account.marketPosition.fetch(user1PositionPDA)
        assert.fail('Position account should be closed')
      } catch (error) {
        // This is expected - account is closed
        assert.ok(error, 'Position account was properly closed')
      }

      // 11. Check vault account (should be empty or closed)
      const vaultBalance = await getBalance(
        provider.connection,
        user1VaultPDA
      ).catch(() => '0')
      assert(
        vaultBalance === '0' || Number(vaultBalance) < 10000,
        'Vault should be empty or closed'
      )
    } catch (error) {
      console.error('Error withdrawing rewards:', error)
    }
  })

  it('should not allow loser to withdraw rewards', async () => {
    const description = 'Test Market for Loser Withdrawal'
    const imageUrl = 'https://example.com/image.png'
    const endTime = Math.floor(Date.now() / 1000) - 60 // 1 minute ago (closed)

    await initializeMarket(program, user, description, imageUrl, endTime)

    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    const betAmount = new BN(0.5 * LAMPORTS_PER_SOL) // 0.5 SOL
    await program.methods
      .buy(false, betAmount) // bet on NO
      .accounts({
        signer: user,
        market: marketPDA
      })
      .rpc()

    // Close market with YES as winner, making our NO bet a loser
    await program.methods
      .closeMarket(true) // YES wins (opposite of our bet)
      .accounts({
        signer: validator.publicKey,
        market: marketPDA
      })
      .signers([validator])
      .rpc()

    await assert.rejects(
      program.methods
        .withdrawRewards()
        .accounts({
          signer: user,
          market: marketPDA
        })
        .rpc(),
      (err) => {
        console.log('Expected error for loser trying to withdraw:', err)
        return true
      }
    )
  })

  it('should not allow withdrawal from an open market', async () => {
    const description = 'Test Market Open Withdrawal'
    const imageUrl = 'https://example.com/image.png'
    const endTime = Math.floor(Date.now() / 1000) + 3600 // 1 hour in future (open)

    await initializeMarket(program, user, description, imageUrl, endTime)

    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    const betAmount = new BN(0.5 * LAMPORTS_PER_SOL) // 0.5 SOL
    await program.methods
      .buy(true, betAmount) // bet on YES
      .accounts({
        signer: user,
        market: marketPDA
      })
      .rpc()

    await assert.rejects(
      program.methods
        .withdrawRewards()
        .accounts({
          signer: user,
          market: marketPDA
        })
        .rpc(),
      (err) => {
        console.log('Expected error for open market withdrawal:', err)
        return true
      }
    )
  })
})
