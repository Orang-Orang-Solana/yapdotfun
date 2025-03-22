use anchor_lang::prelude::*;

declare_id!("Byfe7meApVtusnaZ84r3G1ss1m7pDHUNndCD6yexyNcE");

#[program]
pub mod basic {
    use super::*;

    pub fn greet(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
