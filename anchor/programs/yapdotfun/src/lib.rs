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

/// Validator address for the program - able to close market
pub const VALIDATOR_ADDRESS: Pubkey =
    Pubkey::from_str_const("7RKgZys14jFn3MzjnzcCeTifTiG6D5FNkSMED7bXBX35");

declare_id!("Ci7oP5iPr7C3EStsLMo1U6twvaquLH9EkfCKYedeishi");

/// Program for creating and interacting with prediction markets
#[program]
pub mod yapdotfun {
    use super::*;

    /// Initialize a new prediction market with a description
    ///
    /// # Arguments
    /// * `ctx` - The context for the instruction
    /// * `description` - Description of what this market is predicting
    /// * `expected_resolution_date` - Unix timestamp when the market is expected to resolve
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
    /// * `amount` - Amount of SOL to spend on shares (in lamports)
    pub fn buy(ctx: Context<Buy>, bet: bool, amount: u64) -> Result<()> {
        instructions::buy::handler(ctx, bet, amount)
    }

    /// Sell shares in a prediction market
    ///
    /// # Arguments
    /// * `ctx` - The context for the instruction
    /// * `bet` - Whether selling YES (true) or NO (false) shares
    /// * `shares` - Number of shares to sell
    pub fn sell(ctx: Context<Sell>, bet: bool, shares: u64) -> Result<()> {
        instructions::sell::handler(ctx, bet, shares)
    }

    /// Resolve a prediction market with the final outcome
    ///
    /// # Arguments
    /// * `ctx` - The context for the instruction
    /// * `answer` - The final outcome of the market (true = YES, false = NO)
    pub fn resolve_market(ctx: Context<ResolveMarket>, answer: bool) -> Result<()> {
        instructions::resolve_market::handler(ctx, answer)
    }
}
