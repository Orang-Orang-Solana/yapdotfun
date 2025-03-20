use anchor_lang::prelude::*;

declare_id!("4G6HJNp1zRyz9ZfFmxuRNqXVEy6EEmuwLHBhDsmPAXia");

#[program]
pub mod basic {
    use super::*;

    pub fn greet(_ctx: Context<Initialize>) -> Result<()> {
        msg!("GM!");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
