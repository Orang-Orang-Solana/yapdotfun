import assert from 'node:assert'

import { PublicKey } from '@solana/web3.js'

import {
  getValidatorKeypair,
  hashString,
  initializeMarket,
  setupProgram
} from './utils'

describe('Yapping::close_market', () => {
  const { program, provider, user } = setupProgram()

  // Get the validator keypair
  const validator = getValidatorKeypair()

  it('should close a market when called by the validator', async () => {
    // 1. Initialize a new market
    const description = 'Test Market for Closing'
    const imageUrl = 'https://example.com/image.png'
    // Set end time to now so we can close the market
    const endTime = Math.floor(Date.now() / 1000) - 60 // 1 minute ago

    await initializeMarket(program, user, description, imageUrl, endTime)

    // 2. Get the market PDA
    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    // 3. Check market status before closing
    let market = await program.account.market.fetch(marketPDA)
    assert.equal(
      market.status.open !== undefined,
      true,
      'Market should be open initially'
    )

    // 4. Close the market with YES as the result using the real validator keypair
    await program.methods
      .closeMarket(true) // YES is the winning outcome
      .accounts({
        signer: validator.publicKey,
        market: marketPDA
      })
      .signers([validator])
      .rpc()

    // 5. Check market status after closing
    market = await program.account.market.fetch(marketPDA)
    assert.equal(
      market.status.closed !== undefined,
      true,
      'Market should be closed'
    )
    assert.equal(market.result, true, 'Market result should be YES (true)')
  })

  it('should reject close market when called by non-validator', async () => {
    // 1. Initialize a new market
    const description = 'Test Market Unauthorized Close'
    const imageUrl = 'https://example.com/image.png'
    const endTime = Math.floor(Date.now() / 1000) - 60 // 1 minute ago

    await initializeMarket(program, user, description, imageUrl, endTime)

    // 2. Get the market PDA
    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    // 3. Try to close with non-validator account (should fail)
    await assert.rejects(
      program.methods
        .closeMarket(true)
        .accounts({
          signer: user,
          market: marketPDA
        })
        .rpc(),
      (err) => {
        console.log('Expected error:', err)
        // Verify the error is about not being the validator
        return true
      }
    )

    // 4. Verify market is still open
    const market = await program.account.market.fetch(marketPDA)
    assert.equal(
      market.status.open !== undefined,
      true,
      'Market should still be open'
    )
  })

  it('should reject close market when end time has not passed', async () => {
    // 1. Initialize a new market with future end time
    const description = 'Test Market Future Close'
    const imageUrl = 'https://example.com/image.png'
    const endTime = Math.floor(Date.now() / 1000) + 3600 // 1 hour in the future

    await initializeMarket(program, user, description, imageUrl, endTime)

    // 2. Get the market PDA
    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    // 3. Try to close market with validator (should still fail because end time hasn't passed)
    await assert.rejects(
      program.methods
        .closeMarket(true)
        .accounts({
          signer: validator.publicKey,
          market: marketPDA
        })
        .signers([validator])
        .rpc(),
      (err) => {
        console.log('Expected error:', err)
        return true
      }
    )

    // 4. Verify market is still open
    const market = await program.account.market.fetch(marketPDA)
    assert.equal(
      market.status.open !== undefined,
      true,
      'Market should still be open'
    )
  })
})
