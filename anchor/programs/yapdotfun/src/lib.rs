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

/// Program for creating and interacting with prediction markets
#[program]
pub mod yapdotfun {
    use super::*;

    /// Initialize a new prediction market with a description
    ///
    /// # Arguments
    /// * `ctx` - The context for the instruction
    /// * `description` - Description of what this market is predicting
    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        description: String,
        expected_resolution_date: u64,
    ) -> Result<()> {
        instructions::initialize_market::handler(ctx, description, expected_resolution_date)
    }

    /// Buy shares in a prediction market
    ///
    /// # Arguments
    /// * `ctx` - The context for the instruction
    /// * `bet` - Whether buying YES (true) or NO (false) shares
    /// * `amount` - Amount of SOL to spend on shares
    pub fn buy(ctx: Context<Buy>, bet: bool, amount: u64) -> Result<()> {
        instructions::buy::handler(ctx, bet, amount)
    }

    /// Sell shares in a prediction market
    ///
    /// # Arguments
    /// * `ctx` - The context for the instruction
    /// * `bet` - Whether selling YES (true) or NO (false) shares
    /// * `amount` - Number of shares to sell
    pub fn sell(ctx: Context<Sell>, bet: bool, amount: u64) -> Result<()> {
        instructions::sell::handler(ctx, bet, amount)
    }
}
