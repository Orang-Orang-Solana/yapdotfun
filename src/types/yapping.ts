import type { BN } from '@coral-xyz/anchor'
import type { PublicKey } from '@solana/web3.js'

export type Market = {
  description: string
  imageUrl: string
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  status: any
  answer: boolean
  initializer: PublicKey
  expectedResolutionDate: BN
  resolvedAt: BN | null
}

export type MarketAccount = {
  totalYesAssets: BN
  totalNoAssets: BN
  totalYesShares: BN
  totalNoShares: BN
  totalRewards: BN
  publicKey: PublicKey
  account: Market
}
