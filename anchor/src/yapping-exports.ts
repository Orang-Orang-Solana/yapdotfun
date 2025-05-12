// Here we export some useful types and functions for interacting with the Anchor program.
import { type AnchorProvider, Program } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'

import YappingIDL from '../target/idl/yapping.json'
import type { Yapping } from '../target/types/yapping'

// Re-export the generated IDL and type
export type { Yapping, YappingIDL }

// The programId is imported from the program IDL.
export const YAPPING_PROGRAM_ID = new PublicKey(YappingIDL.address)

// This is a helper function to get the Basic Anchor program.
export function getYappingProgram(provider: AnchorProvider) {
  return new Program<Yapping>(YappingIDL as Yapping, provider)
}
