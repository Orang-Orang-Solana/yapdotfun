import * as crypto from 'node:crypto'

import type { Program } from '@coral-xyz/anchor'
import * as anchor from '@coral-xyz/anchor'
import {
  type Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  type PublicKey
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
