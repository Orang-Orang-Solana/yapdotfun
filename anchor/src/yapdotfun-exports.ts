// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'

import YapdotfunIDL from '../target/idl/yapdotfun.json'
import type { Yapdotfun } from '../target/types/yapdotfun'

// Re-export the generated IDL and type
export { Yapdotfun, YapdotfunIDL }

// The programId is imported from the program IDL.
export const YAPDOTFUN_PROGRAM_ID = new PublicKey(YapdotfunIDL.address)

// This is a helper function to get the Basic Anchor program.
export function getYapdotfunProgram(provider: AnchorProvider) {
  return new Program<Yapdotfun>(YapdotfunIDL as Yapdotfun, provider)
}
