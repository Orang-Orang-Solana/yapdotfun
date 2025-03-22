import macro from 'styled-jsx/macro'

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

  const userWallet = provider.wallet
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

  it('should initialize a market with a description', async () => {
    const description = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    const tx = await program.methods.initializeMarket(description).rpc()
    console.log('Initialized market. signature:', tx)

    const market = (await program.account.market.all())[0]
    const marketData = await program.account.market.fetch(market.publicKey)
    expect(marketData.description).toEqual(description)
  })

  it('should error when initializing same description', async () => {
    try {
      const description = 'will prabowo be... ??'
      await program.methods.initializeMarket(description).rpc()
      await program.methods.initializeMarket(description).rpc()
    } catch (error) {
      expect(error).toBeInstanceOf(SendTransactionError)
    }
  })

  it('should buy a market and vote successfully once', async () => {
    const description = 'sssss'
    const tx = await program.methods.initializeMarket(description).rpc()
    console.log('tx', tx)

    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), Buffer.from(description)],
      program.programId
    )

    // const markets = await program.account.market.all()
    // const marketPDA = markets.find(
    //   (market) => market.account.description === description
    // )?.publicKey

    console.log('marketPDA', marketPDA)

    if (!marketPDA) {
      throw new Error('Market not found')
    }

    await program.methods
      .buy(true, new anchor.BN(1))
      .accounts({
        market: marketPDA
      })
      .rpc()

    const [marketMetadataPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market_metadata'), marketPDA.toBuffer()],
      program.programId
    )

    const marketMetadata =
      await program.account.marketMetadata.fetch(marketMetadataPDA)
    const expectedYesShares = (1 * LAMPORTS_PER_SOL) / 1e3
    expect(marketMetadata.totalYesShares.toString()).toEqual(
      expectedYesShares.toString()
    )
  })
  // it('should fail when a user tries to vote twice', async () => {})
})
