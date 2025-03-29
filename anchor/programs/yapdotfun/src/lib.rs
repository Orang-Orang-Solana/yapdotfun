mod errors;
mod events;
mod instructions;
mod state;
mod utils;

use anchor_lang::prelude::*;
use errors::*;
use events::*;
use instructions::*;
use utils::*;

declare_id!("4tsFN1tukaM3Jm4x9EPpAKCWQXibwaCzwmsvmuodGK5D");

#[program]
pub mod yapdotfun {
    use super::*;

    pub fn initialize_market(ctx: Context<InitializeMarket>, description: String) -> Result<()> {
        instructions::initialize_market::handler(ctx, description)
    }

    pub fn buy(ctx: Context<Buy>, bet: bool, amount: u64) -> Result<()> {
        instructions::buy::handler(ctx, bet, amount)
    }

    pub fn sell(ctx: Context<Sell>, bet: bool, amount: u64) -> Result<()> {
        instructions::sell::handler(ctx, bet, amount)
    }
}
