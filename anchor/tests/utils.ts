import * as crypto from 'node:crypto'

import type { Program } from '@coral-xyz/anchor'
import * as anchor from '@coral-xyz/anchor'
import {
  type Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey
} from '@solana/web3.js'

import type { Yapping } from '../target/types/yapping'

/**
 * Setup the Anchor provider and program
 */
export function setupProgram(): {
  program: Program<Yapping>
  provider: anchor.AnchorProvider
  user: PublicKey
} {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.Yapping as Program<Yapping>
  const user = provider.wallet.publicKey

  return { program, provider, user }
}

/**
 * Hash a string using sha256 (as done in the contract)
 */
export function hashString(str: string): Buffer {
  return crypto.createHash('sha256').update(str).digest()
}

/**
 * Create a validator keypair for testing
 */
export function getValidatorKeypair(): Keypair {
  return Keypair.fromSecretKey(
    new Uint8Array([
      96, 72, 59, 139, 230, 201, 113, 65, 242, 61, 1, 234, 235, 30, 210, 203,
      37, 139, 250, 139, 140, 216, 91, 79, 6, 150, 206, 239, 88, 242, 67, 135,
      95, 97, 47, 93, 235, 6, 127, 156, 200, 141, 180, 240, 247, 182, 16, 254,
      197, 90, 40, 167, 155, 4, 65, 157, 41, 117, 84, 73, 44, 57, 27, 224
    ])
  )
}

/**
 * Sleep for the specified time in milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Airdrop SOL to the specified wallet
 */
export async function airdropSol(
  connection: Connection,
  recipient: PublicKey,
  amount = 2
): Promise<void> {
  const tx = await connection.requestAirdrop(
    recipient,
    LAMPORTS_PER_SOL * amount
  )
  await connection.confirmTransaction(tx)
}

/**
 * Get expected resolution date (30 days from now)
 */
export function getDefaultResolutionDate(): anchor.BN {
  return new anchor.BN(new Date().getTime() + 1000 * 60 * 60 * 24 * 30)
}

/**
 * Find market PDA
 */
export function findMarketPDA(
  programId: PublicKey,
  description: string
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('market'), hashString(description)],
    programId
  )
}

/**
 * Find market metadata PDA
 */
export function findMarketMetadataPDA(
  programId: PublicKey,
  marketPDA: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('market_metadata'), marketPDA.toBuffer()],
    programId
  )
}

/**
 * Find market voter PDA
 */
export function findMarketVoterPDA(
  programId: PublicKey,
  userPubkey: PublicKey,
  marketPDA: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('market_voter'), userPubkey.toBuffer(), marketPDA.toBuffer()],
    programId
  )
}

/**
 * Create a market with a unique description
 */
export async function createMarket(
  program: Program<Yapping>,
  description: string,
  userPubkey: PublicKey,
  imageUrl = 'https://picsum.photos/200/300',
  resolutionDate = getDefaultResolutionDate()
): Promise<PublicKey> {
  const [marketPDA] = findMarketPDA(program.programId, description)

  await program.methods
    .initializeMarket(description, imageUrl, resolutionDate)
    .accounts({
      market: marketPDA,
      signer: userPubkey
    })
    .rpc()

  return marketPDA
}

/**
 * Generate a unique market description for testing
 */
export function uniqueMarketDescription(prefix: string): string {
  const uniqueId = Math.random().toString().slice(2, 10)
  return `${prefix} ${uniqueId}`
}

/**
 * Buy a position in a market
 */
export async function buyPosition(
  program: Program<Yapping>,
  marketPDA: PublicKey,
  userPubkey: PublicKey,
  isYes: boolean,
  amount: anchor.BN
): Promise<void> {
  await program.methods
    .buy(isYes, amount)
    .accounts({
      market: marketPDA,
      signer: userPubkey
    })
    .rpc()
}

/**
 * Sell a position in a market
 */
export async function sellPosition(
  program: Program<Yapping>,
  marketPDA: PublicKey,
  userPubkey: PublicKey,
  isYes: boolean,
  shares: anchor.BN
): Promise<void> {
  await program.methods
    .sell(isYes, shares)
    .accounts({
      market: marketPDA,
      signer: userPubkey
    })
    .rpc()
}

/**
 * Resolve a market
 */
export async function resolveMarket(
  program: Program<Yapping>,
  marketPDA: PublicKey,
  result: boolean,
  validator: Keypair
): Promise<void> {
  await program.methods
    .resolveMarket(result)
    .accounts({
      market: marketPDA
    })
    .signers([validator])
    .rpc()
}

/**
 * Withdraw rewards from a market
 */
export async function withdrawRewards(
  program: Program<Yapping>,
  marketPDA: PublicKey,
  userPubkey: PublicKey
): Promise<void> {
  await program.methods
    .withdrawRewards()
    .accounts({
      market: marketPDA,
      user: userPubkey
    })
    .rpc()
}

/**
 * Calculate expected shares from a bet amount
 *
 * Note: The actual calculation in the smart contract depends on current market state
 * and uses a more complex formula. This is a simplification for test purposes.
 */
export function calculateExpectedShares(betAmount: anchor.BN): anchor.BN {
  // The contract divides by 1_000_000 to get shares from lamports
  // Our tests should match this behavior
  return betAmount.div(new anchor.BN(1_000_000))
}

/**
 * Calculate price for position
 * This is a simplified version of the algorithm used in the contract
 */
export function calculatePositionPrice(
  yesAssets: anchor.BN,
  noAssets: anchor.BN,
  isYes: boolean
): anchor.BN {
  // Simplified pricing based on the contract's formula
  // Actual implementation would closely mirror contract logic
  return new anchor.BN(LAMPORTS_PER_SOL)
}
