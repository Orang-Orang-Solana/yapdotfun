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

    const market = (await program.account.market.all())[0]
    const marketData = await program.account.market.fetch(market.publicKey)
    expect(marketData.description).toEqual(description)
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

    // Initialize market
    const tx = await program.methods
      .initializeMarket(description)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    console.log('tx', tx)

    // Find PDA for market voter
    const [marketVoterPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market_voter'), user.toBuffer(), marketPDA.toBuffer()],
      program.programId
    )

    // Buy with YES and amount of 1 SOL
    await program.methods
      .buy(true, new anchor.BN(1))
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    const marketMetadata =
      await program.account.marketMetadata.fetch(marketMetadataPDA)
    const expectedYesShares = (1 * LAMPORTS_PER_SOL) / 1e3
    expect(marketMetadata.totalYesShares.toString()).toEqual(
      expectedYesShares.toString()
    )

    const marketVoter = await program.account.marketVoter.fetch(marketVoterPDA)
    expect(marketVoter.amount.toString()).toEqual(new anchor.BN(1).toString())
    expect(marketVoter.vote).toEqual(true)
  })

  it('should fail when a user tries to vote twice (PDA already in use)', async () => {
    const description = 'sdaaaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'

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

    // Initialize market
    const tx = await program.methods
      .initializeMarket(description)
      .accounts({
        market: marketPDA,
        signer: user
      })
      .rpc()

    console.log('tx', tx)

    // Try to vote again (should fail)
    try {
      // Buy with YES and amount of 1 SOL
      await program.methods
        .buy(true, new anchor.BN(1))
        .accounts({
          market: marketPDA,
          signer: user
        })
        .rpc()

      // Buy with YES and amount of 1 SOL
      await program.methods
        .buy(true, new anchor.BN(1))
        .accounts({
          market: marketPDA,
          signer: user
        })
        .rpc()

      console.info('should not reach here')
    } catch (error) {
      expect(error).toBeInstanceOf(SendTransactionError)
    }
  })
})
