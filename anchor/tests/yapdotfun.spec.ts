import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'

import { Yapdotfun } from '../target/types/yapdotfun'

describe('yapdotfun program', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  beforeEach(async () => {
    // airdrop 5 SOL to the wallet
    const tx = await provider.connection.requestAirdrop(
      provider.wallet.publicKey,
      LAMPORTS_PER_SOL * 5
    )
    await provider.connection.confirmTransaction({
      signature: tx,
      ...(await provider.connection.getLatestBlockhash())
    })
    console.log('Airdropped 5 SOL to the wallet')
  })

  const program = anchor.workspace.Yapdotfun as Program<Yapdotfun>

  it('should initialize a market with a description + default values', async () => {
    const description = 'test'
    const tx = await program.methods
      .initializeMarket(description)
      .accounts({
        signer: provider.wallet.publicKey
      })
      .rpc()

    const marketAccounts = await program.account.market.all()
    expect(marketAccounts.length).toBe(1)

    // Check market account
    const firstMarket = marketAccounts[0].account
    expect(firstMarket.description).toBe(description)
    expect(firstMarket.status).toStrictEqual({ open: {} })
    expect(firstMarket.answer).toBe(false)
    expect(firstMarket.initializer).toStrictEqual(provider.wallet.publicKey)
    expect(firstMarket.metadata.toBase58()).toHaveLength(44)

    // Check market metadata
    const marketMetadataAccounts = await program.account.marketMetadata.fetch(
      firstMarket.metadata
    )
    expect(marketMetadataAccounts.totalYesAssets.toString()).toBe(
      new anchor.BN(0).toString()
    )
    expect(marketMetadataAccounts.totalNoAssets.toString()).toBe(
      new anchor.BN(0).toString()
    )
    expect(marketMetadataAccounts.totalYesShares.toString()).toBe(
      new anchor.BN(0).toString()
    )
    expect(marketMetadataAccounts.totalNoShares.toString()).toBe(
      new anchor.BN(0).toString()
    )
    expect(marketMetadataAccounts.totalRewards.toString()).toBe(
      new anchor.BN(0).toString()
    )

    console.log('Your transaction signature', tx)
    console.log('Your Market account', firstMarket)
    console.log('Your Market metadata', marketMetadataAccounts)
  })

  it('should buy a market and vote successfully once', async () => {
    const amount = new anchor.BN(1)
    const SHARES = 1e3
    const expectedShares = amount
      .mul(new anchor.BN(LAMPORTS_PER_SOL))
      .div(new anchor.BN(SHARES))

    // Buy with true vote
    const txYes = await buyMarket(program, provider, true, amount)
    console.log('Your YES transaction signature', txYes)

    // Fetch updated market metadata after vote
    const marketAccountsAfterVote = await program.account.market.all()
    const marketMetadataAfterVote = await program.account.marketMetadata.fetch(
      marketAccountsAfterVote[0].account.metadata
    )

    // Verify the vote effects
    expect(marketMetadataAfterVote.totalYesAssets.toString()).toBe(
      expectedShares.toString()
    )
    expect(marketMetadataAfterVote.totalYesShares.toString()).toBe(
      expectedShares.toString()
    )
    expect(marketMetadataAfterVote.totalNoAssets.toString()).toBe('0')
    expect(marketMetadataAfterVote.totalNoShares.toString()).toBe('0')
    expect(marketMetadataAfterVote.totalRewards.toString()).toBe(
      expectedShares.toString()
    )

    console.log('Market metadata after vote:', marketMetadataAfterVote)
  })

  it('should fail when a user tries to vote twice', async () => {
    const amount = new anchor.BN(1)

    // First vote
    await buyMarket(program, provider, true, amount)

    // Wait a bit before the next operation to ensure transaction finality
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Try to vote again - should fail
    try {
      await buyMarket(program, provider, false, amount)
      // If we reach here, the second vote didn't fail as expected
      throw new Error('Expected second vote to fail, but it succeeded')
    } catch (error: any) {
      // Expect an error containing a specific message
      expect(error.toString()).toContain('User has already voted')
      console.log('Second vote correctly failed with error:', error.toString())
    }
  })
})

async function buyMarket(
  program: Program<Yapdotfun>,
  provider: anchor.AnchorProvider,
  isYes: boolean,
  amount: anchor.BN
): Promise<string> {
  const marketAccounts = await program.account.market.all()
  const marketMetadataAccounts = await program.account.marketMetadata.all()

  const tx = await program.methods
    .buy(isYes, amount)
    .accounts({
      market: marketAccounts[0].publicKey,
      marketMetadata: marketMetadataAccounts[0].publicKey,
      signer: provider.wallet.publicKey
    })
    .rpc()

  console.log(`Bought market with ${isYes ? 'YES' : 'NO'} vote`)

  return tx
}
