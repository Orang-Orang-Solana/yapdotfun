import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'

import { Yapdotfun } from '../target/types/yapdotfun'

describe('yapdotfun', () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env())

  const program = anchor.workspace.Yapdotfun as Program<Yapdotfun>

  it('should run the program', async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc()
    console.log('Your transaction signature', tx)
  })
})
