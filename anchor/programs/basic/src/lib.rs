use anchor_lang::prelude::*;

declare_id!("DL3maGWRfpBWRrgesM1AxYwfpkgRtoskW3Fxw3MbhApi");

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
