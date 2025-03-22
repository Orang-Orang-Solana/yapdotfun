import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'

import { Yapdotfun } from '../target/types/yapdotfun'

describe('yapdotfun program', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

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
})
