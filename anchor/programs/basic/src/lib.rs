use anchor_lang::prelude::*;

declare_id!("7k5GyUbXZGaACsrShG97xtmYrfkh582utpnWJ1NH2VPz");

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
