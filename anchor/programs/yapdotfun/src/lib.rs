use anchor_lang::prelude::*;

declare_id!("YappeTaxE8txMK7LwUuFBswCvnktievP7f3U5c5tZwB");

#[program]
pub mod yapdotfun {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
