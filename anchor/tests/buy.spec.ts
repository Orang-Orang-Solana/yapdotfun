import * as crypto from 'node:crypto'

import type { Program } from '@coral-xyz/anchor'
import * as anchor from '@coral-xyz/anchor'
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SendTransactionError
} from '@solana/web3.js'

import type { Yapdotfun } from '../target/types/yapdotfun'

describe('yapdotfun buy tests', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const user = provider.wallet.publicKey
  const expectedResolutionDate = new anchor.BN(
    new Date().getTime() + 1000 * 60 * 60 * 24 * 30
  ) // 30 days from now

  const program = anchor.workspace.Yapdotfun as Program<Yapdotfun>

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

  it('should allow buying YES position in a market', async () => {
    const description = 'Buy YES test market'
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
      .initializeMarket(description, expectedResolutionDate)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    // Get initial balances
    const initialMarketBalance = await provider.connection.getBalance(marketPDA)
    const initialUserBalance = await provider.connection.getBalance(user)

    // Buy YES position
    await program.methods
      .buy(true, betAmount)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    // Get final balances
    const finalMarketBalance = await provider.connection.getBalance(marketPDA)
    const finalUserBalance = await provider.connection.getBalance(user)

    // Verify market received the SOL
    expect(finalMarketBalance - initialMarketBalance).toBeGreaterThanOrEqual(
      betAmount.toNumber() * 0.9
    )

    // Since we're running many tests in parallel, it's not reliable to check exact balance
    // changes due to all the transactions being sent in the same wallet
    // Instead, just verify that market metadata is updated correctly
    const marketMetadata =
      await program.account.marketMetadata.fetch(marketMetadataPDA)
    const expectedShares = betAmount.div(new anchor.BN(1000))

    expect(marketMetadata.totalYesShares.toString()).toEqual(
      expectedShares.toString()
    )
    expect(marketMetadata.totalYesAssets.toString()).toEqual(
      betAmount.toString()
    )
    expect(marketMetadata.totalRewards.toString()).toEqual(betAmount.toString())
    expect(marketMetadata.totalNoAssets.toString()).toEqual('0')
    expect(marketMetadata.totalNoShares.toString()).toEqual('0')

    // Verify voter account was created correctly
    const marketVoter = await program.account.marketVoter.fetch(marketVoterPDA)
    expect(marketVoter.amount.toString()).toEqual(betAmount.toString())
    expect(marketVoter.vote).toEqual(true)
  })

  it('should allow buying NO position in a market', async () => {
    const description = 'Buy NO test market'
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
      .initializeMarket(description, expectedResolutionDate)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    // Get initial market balance
    const initialMarketBalance = await provider.connection.getBalance(marketPDA)

    // Buy NO position
    await program.methods
      .buy(false, betAmount)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    // Get final market balance
    const finalMarketBalance = await provider.connection.getBalance(marketPDA)

    // Verify market received the SOL
    expect(finalMarketBalance - initialMarketBalance).toBeGreaterThanOrEqual(
      betAmount.toNumber() * 0.9
    )

    // Since we're running many tests in parallel, it's not reliable to check exact balance
    // changes due to all the transactions being sent in the same wallet
    // Instead, just verify that market metadata is updated correctly
    const marketMetadata =
      await program.account.marketMetadata.fetch(marketMetadataPDA)
    const expectedShares = betAmount.div(new anchor.BN(1000))

    expect(marketMetadata.totalNoShares.toString()).toEqual(
      expectedShares.toString()
    )
    expect(marketMetadata.totalNoAssets.toString()).toEqual(
      betAmount.toString()
    )
    expect(marketMetadata.totalRewards.toString()).toEqual(betAmount.toString())
    expect(marketMetadata.totalYesAssets.toString()).toEqual('0')
    expect(marketMetadata.totalYesShares.toString()).toEqual('0')

    // Verify voter account was created correctly
    const marketVoter = await program.account.marketVoter.fetch(marketVoterPDA)
    expect(marketVoter.amount.toString()).toEqual(betAmount.toString())
    expect(marketVoter.vote).toEqual(false)
  })

  it('should not allow buying with zero amount', async () => {
    const description = 'Zero amount test market'
    const betAmount = new anchor.BN(0)

    // Find PDAs
    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    // Initialize market
    await program.methods
      .initializeMarket(description, expectedResolutionDate)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    // Try to buy with zero amount
    try {
      await program.methods
        .buy(true, betAmount)
        .accounts({
          market: marketPDA,
          signer: user
        })
        .rpc()

      fail('Expected to fail with zero amount')
    } catch (error) {
      expect(error).toBeInstanceOf(anchor.AnchorError)
      const anchorError = error as anchor.AnchorError
      expect(anchorError.error.errorCode.code).toEqual(
        'AmountConstraintViolated'
      )
    }
  })

  it('should not allow buying twice in the same market', async () => {
    const description = 'Double buy test market'
    const betAmount = new anchor.BN(0.1 * LAMPORTS_PER_SOL)

    // Find PDAs
    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    // Initialize market
    await program.methods
      .initializeMarket(description, expectedResolutionDate)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    // First buy should succeed
    await program.methods
      .buy(true, betAmount)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    // Second buy should fail
    try {
      await program.methods
        .buy(false, betAmount)
        .accounts({
          market: marketPDA,
          signer: user
        })
        .rpc()

      fail('Expected to fail with PDA already in use')
    } catch (error) {
      expect(error).toBeInstanceOf(SendTransactionError)
    }
  })

  it('should not allow buying in a closed market', async () => {
    const description = 'Closed market buy test'
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

    // Initialize market
    await program.methods
      .initializeMarket(description, expectedResolutionDate)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

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
      await program.methods
        .buy(true, betAmount)
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

  it('should allow multiple users to buy in the same market', async () => {
    const description = 'Multiple users market'

    // Create a second user
    const user2 = Keypair.generate()

    // Airdrop SOL to user2
    const airdropTx = await provider.connection.requestAirdrop(
      user2.publicKey,
      LAMPORTS_PER_SOL * 1
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
      .initializeMarket(description, expectedResolutionDate)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    // User 1 buys YES
    const betAmount1 = new anchor.BN(0.3 * LAMPORTS_PER_SOL)
    await program.methods
      .buy(true, betAmount1)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    // User 2 buys NO
    const betAmount2 = new anchor.BN(0.2 * LAMPORTS_PER_SOL)
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

    const expectedYesShares = betAmount1.div(new anchor.BN(1000))
    const expectedNoShares = betAmount2.div(new anchor.BN(1000))
    const expectedTotalRewards = betAmount1.add(betAmount2)

    expect(marketMetadata.totalYesShares.toString()).toEqual(
      expectedYesShares.toString()
    )
    expect(marketMetadata.totalYesAssets.toString()).toEqual(
      betAmount1.toString()
    )
    expect(marketMetadata.totalNoShares.toString()).toEqual(
      expectedNoShares.toString()
    )
    expect(marketMetadata.totalNoAssets.toString()).toEqual(
      betAmount2.toString()
    )
    expect(marketMetadata.totalRewards.toString()).toEqual(
      expectedTotalRewards.toString()
    )

    // Verify voter 1 account
    const marketVoter1 =
      await program.account.marketVoter.fetch(marketVoterPDA1)
    expect(marketVoter1.amount.toString()).toEqual(betAmount1.toString())
    expect(marketVoter1.vote).toEqual(true)

    // Verify voter 2 account
    const marketVoter2 =
      await program.account.marketVoter.fetch(marketVoterPDA2)
    expect(marketVoter2.amount.toString()).toEqual(betAmount2.toString())
    expect(marketVoter2.vote).toEqual(false)
  })
})
