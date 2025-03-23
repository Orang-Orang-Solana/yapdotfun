import * as crypto from 'crypto'

import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SendTransactionError
} from '@solana/web3.js'

import { Yapdotfun } from '../target/types/yapdotfun'

describe('yapdotfun program', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const user = provider.wallet.publicKey

  beforeEach(async () => {
    // airdrop 5 SOL to the wallet
    const tx = await provider.connection.requestAirdrop(
      provider.wallet.publicKey,
      LAMPORTS_PER_SOL * 5
    )
    await provider.connection.confirmTransaction(tx)
    console.log('Airdropped 5 SOL to the wallet')
  })

  const program = anchor.workspace.Yapdotfun as Program<Yapdotfun>

  // Helper to hash the description string as done in the contract
  const hashString = (str: string) => {
    return crypto.createHash('sha256').update(str).digest()
  }

  it('should initialize a market with a description', async () => {
    const description = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

    // Find PDA for market
    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    // Find PDA for market metadata
    const [marketMetadataPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market_metadata'), marketPDA.toBuffer()],
      program.programId
    )

    // Initialize market with all required accounts
    const tx = await program.methods
      .initializeMarket(description)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    console.log('Initialized market. signature:', tx)

    // Fetch and validate market data
    const market = await program.account.market.fetch(marketPDA)
    expect(market.description).toEqual(description)
    expect(market.status.open !== undefined).toBeTruthy()

    // Validate market metadata is initialized correctly
    const metadata =
      await program.account.marketMetadata.fetch(marketMetadataPDA)
    expect(metadata.totalYesAssets.toString()).toEqual('0')
    expect(metadata.totalNoAssets.toString()).toEqual('0')
    expect(metadata.totalYesShares.toString()).toEqual('0')
    expect(metadata.totalNoShares.toString()).toEqual('0')
    expect(metadata.totalRewards.toString()).toEqual('0')
  })

  it('should error when initializing same description (PDA already in use)', async () => {
    const description = 'will prabowo be... ??'

    // Find PDA for market
    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    // Find PDA for market metadata
    const [marketMetadataPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market_metadata'), marketPDA.toBuffer()],
      program.programId
    )

    // Initialize market first time
    await program.methods
      .initializeMarket(description)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    try {
      // Try to initialize with same description (should fail)
      await program.methods
        .initializeMarket(description)
        .accounts({
          market: marketPDA,
          signer: user
        })
        .rpc()

      // Should not reach here
      throw new Error('Expected to fail with SendTransactionError')
    } catch (error) {
      expect(error).toBeInstanceOf(SendTransactionError)
    }
  })

  it('should buy a market and vote successfully once', async () => {
    const description = 'sssss'
    const betAmount = new anchor.BN(1) // 1 SOL

    // Find PDA for market
    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    // Find PDA for market metadata
    const [marketMetadataPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market_metadata'), marketPDA.toBuffer()],
      program.programId
    )

    // Find PDA for market voter
    const [marketVoterPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market_voter'), user.toBuffer(), marketPDA.toBuffer()],
      program.programId
    )

    // Initialize market
    await program.methods
      .initializeMarket(description)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    // Get initial balances
    const initialMarketBalance = await provider.connection.getBalance(marketPDA)

    // Buy with YES and amount of 1 SOL
    await program.methods
      .buy(true, betAmount)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    // Verify market received the SOL
    const finalMarketBalance = await provider.connection.getBalance(marketPDA)
    expect(finalMarketBalance - initialMarketBalance).toEqual(
      betAmount.toNumber()
    )

    // Verify market metadata was updated correctly
    const marketMetadata =
      await program.account.marketMetadata.fetch(marketMetadataPDA)
    const expectedYesShares = betAmount
      .mul(new anchor.BN(LAMPORTS_PER_SOL))
      .div(new anchor.BN(1e3))

    expect(marketMetadata.totalYesShares.toString()).toEqual(
      expectedYesShares.toString()
    )
    expect(marketMetadata.totalYesAssets.toString()).toEqual(
      betAmount.toString()
    )
    expect(marketMetadata.totalRewards.toString()).toEqual(betAmount.toString())
    expect(marketMetadata.totalNoAssets.toString()).toEqual('0')
    expect(marketMetadata.totalNoShares.toString()).toEqual('0')

    // Verify voter account was created with correct data
    const marketVoter = await program.account.marketVoter.fetch(marketVoterPDA)
    expect(marketVoter.amount.toString()).toEqual(betAmount.toString())
    expect(marketVoter.vote).toEqual(true)
  })

  it('should fail when a user tries to vote twice (PDA already in use)', async () => {
    const description = 'sdaaaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'

    // Find PDA for market
    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    // Initialize market
    await program.methods
      .initializeMarket(description)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    // First vote should succeed
    await program.methods
      .buy(true, new anchor.BN(LAMPORTS_PER_SOL))
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    // Second vote should fail
    try {
      await program.methods
        .buy(false, new anchor.BN(LAMPORTS_PER_SOL))
        .accounts({
          market: marketPDA,
          signer: user
        })
        .rpc()

      fail('Should not reach here - expected transaction to fail')
    } catch (error) {
      expect(error).toBeInstanceOf(SendTransactionError)
    }
  })

  it('should fail when trying to buy with zero amount', async () => {
    const description = 'zero amount test'

    // Find PDAs
    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    // Initialize market
    await program.methods
      .initializeMarket(description)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    // Try to buy with zero amount
    try {
      await program.methods
        .buy(true, new anchor.BN(0))
        .accounts({
          market: marketPDA,
          signer: user
        })
        .rpc()

      fail('Should not reach here - expected transaction to fail')
    } catch (error) {
      expect(error).toBeInstanceOf(anchor.AnchorError)
    }
  })
})
