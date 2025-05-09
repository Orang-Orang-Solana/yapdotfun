use crate::errors::YapdotfunError;
use crate::events::MarketClosedEvent;
use crate::state::{Market, MarketMetadata, MarketStatus};
use crate::VALIDATOR_ADDRESS;

use anchor_lang::prelude::*;

/// Accounts required for resolving a prediction market
#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    /// The market account that will be updated with the resolution
    #[account(mut)]
    pub market: Account<'info, Market>,

    /// The market metadata account that tracks voting statistics.
    /// PDA derived from ["market_metadata", market]
    #[account(
        mut,
        seeds = [
            b"market_metadata",
            market.key().as_ref()
        ],
        bump
    )]
    pub market_metadata: Account<'info, MarketMetadata>,

    /// The validator account that is resolving the market
    /// Must be a signer to authorize the resolution
    #[account(mut, address = VALIDATOR_ADDRESS)]
    pub validator: Signer<'info>,

    /// The system program, required for system operations
    pub system_program: Program<'info, System>,
}

/// Resolves a prediction market with the final answer
///
/// This function marks a market as closed and sets the final answer (YES/NO).
/// Once resolved, the market cannot be modified further.
///
/// # Arguments
/// * `ctx` - The context containing all the accounts needed for resolution
/// * `answer` - Boolean indicating the final outcome (true = YES, false = NO)
///
/// # Returns
/// * `Result<()>` - Result indicating success or failure
///
/// # Events
/// * `MarketClosedEvent` - Emitted when a market is successfully resolved,
///   containing the market ID, metadata ID, initializer address, and resolution message
///
/// # Errors
/// * `MarketClosed` - If the market is already closed
pub fn handler(ctx: Context<ResolveMarket>, answer: bool) -> Result<()> {
    // Ensure the market is not already closed
    require!(
        ctx.accounts.market.status != MarketStatus::Closed,
        YapdotfunError::MarketClosed
    );

    // Update market status and resolution details
    let market = &mut ctx.accounts.market;
    market.answer = answer;
    market.status = MarketStatus::Closed;
    market.resolved_at = Some(Clock::get()?.unix_timestamp as u64);

    // Emit an event to notify listeners that the market was resolved
    emit!(MarketClosedEvent {
        market_id: market.key().to_string(),
        market_metadata_id: ctx.accounts.market_metadata.key().to_string(),
        initializer: market.initializer.to_string(),
        message: format!("Market resolved with answer: {}", answer),
    });

    Ok(())
}
