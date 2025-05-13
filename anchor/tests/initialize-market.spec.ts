import * as anchor from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'

import { hashString, setupProgram } from './utils'

describe('Yapping::initialize_market', () => {
  const { program, provider, user } = setupProgram()

  // success cases
  it('should initialize a market', async () => {
    const description = 'Test Market'
    const imageUrl = 'https://example.com/image.png'
    const endTime = new Date().getTime() + 1000 * 60 * 60 * 24

    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    await program.methods
      .initializeMarket(description, imageUrl, new anchor.BN(endTime))
      .accounts({
        signer: user,
        market: marketPDA
      })
      .rpc()

    const market = await program.account.market.fetch(marketPDA)

    expect(market.description).toEqual(description)
    expect(market.imageUrl).toEqual(imageUrl)
    expect(market.endTime.toNumber()).toBeGreaterThanOrEqual(endTime)
  })

  it('sould able to initialize multiple markets with different description', async () => {
    const markets = [
      {
        description: 'Test Market 1',
        imageUrl: 'https://example.com/image.png',
        endTime: new Date().getTime() + 1000 * 60 * 60 * 24
      },
      {
        description: 'Test Market 2',
        imageUrl: 'https://example.com/image2.png',
        endTime: new Date().getTime() + 1000 * 60 * 60 * 24
      }
    ]

    const marketPDAs = markets.map((market) => {
      const [marketPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('market'), hashString(market.description)],
        program.programId
      )
      return marketPDA
    })

    await Promise.all(
      markets.map(async (market, index) => {
        const marketPDA = marketPDAs[index]
        await program.methods
          .initializeMarket(
            market.description,
            market.imageUrl,
            new anchor.BN(market.endTime)
          )
          .accounts({
            signer: user,
            market: marketPDA
          })
          .rpc()
      })
    )

    const marketAccounts = await program.account.market.all()

    for (const market of markets) {
      const [marketPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('market'), hashString(market.description)],
        program.programId
      )

      const marketAccount = await program.account.market.fetch(marketPDA)
      expect(marketAccount.description).toEqual(market.description)
      expect(marketAccount.imageUrl).toEqual(market.imageUrl)
      expect(marketAccount.endTime.toNumber()).toBeGreaterThanOrEqual(
        market.endTime
      )
    }
  })

  // error cases
  it('should fail to initialize a market with the same description', async () => {
    const description = 'Test Market'
    const imageUrl = 'https://example.com/image.png'
    const endTime = new Date().getTime() + 1000 * 60 * 60 * 24

    const [marketPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('market'), hashString(description)],
      program.programId
    )

    try {
      await program.methods
        .initializeMarket(description, imageUrl, new anchor.BN(endTime))
        .accounts({
          signer: user,
          market: marketPDA
        })
        .rpc()

      fail('Should have thrown an error')
    } catch (error) {
      const anchorError = error as anchor.AnchorError
      const errorLog = anchorError.logs.find((log) =>
        log.includes('already in use')
      )
      expect(errorLog).toBeDefined()
      expect(errorLog).not.toContain('ConstraintSeeds')
    }
  })
})
