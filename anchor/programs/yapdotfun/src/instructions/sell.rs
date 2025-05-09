use crate::{errors::YapdotfunError, state::*, utils::*};
use anchor_lang::prelude::*;

/// Accounts required for the sell instruction
#[derive(Accounts)]
pub struct Sell<'info> {
    /// The market account that will be updated
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

    /// The market voter account that tracks the user's vote.
    /// PDA derived from ["market_voter", signer, market]
    #[account(
        mut,
        seeds = [
            b"market_voter",
            signer.key().as_ref(),
            market.key().as_ref()
        ],
        bump
    )]
    pub market_voter: Account<'info, MarketVoter>,

    /// The user who is selling their shares
    #[account(mut)]
    pub signer: Signer<'info>,

    /// The system program, used for transferring SOL
    pub system_program: Program<'info, System>,
}

/// Instruction handler for selling shares in a prediction market
///
/// # Arguments
/// * `ctx` - The context for the instruction
/// * `bet` - Whether selling YES (true) or NO (false) shares
/// * `shares` - Number of shares to sell
///
/// # Errors
/// * `MarketClosed` - If the market is already closed
/// * `NoSharesToSell` - If trying to sell 0 shares
/// * `NotEnoughShares` - If user doesn't have enough shares of the specified type
pub fn handler(ctx: Context<Sell>, bet: bool, shares: u64) -> Result<()> {
    // Ensure the market is open
    require!(
        ctx.accounts.market.status == MarketStatus::Open,
        YapdotfunError::MarketClosed
    );

    // Ensure the user has enough shares to sell
    require!(shares > 0, YapdotfunError::NoSharesToSell);

    // Get the market voter account
    let market_voter = &ctx.accounts.market_voter;

    // Verify the user is selling the correct type of shares (YES/NO)
    require!(market_voter.vote == bet, YapdotfunError::NotEnoughShares);

    // Calculate the total shares the user owns based on their amount
    let user_shares = market_voter.amount.into_shares();

    // Verify the user has enough shares to sell
    require!(user_shares >= shares, YapdotfunError::NotEnoughShares);

    // Calculate the SOL amount to return based on the original purchase price ratio
    // This is more fair than a fixed conversion rate
    let market_metadata = &ctx.accounts.market_metadata;
    let amount = if bet {
        // For YES shares, calculate based on total yes assets and shares
        if market_metadata.total_yes_shares == 0 {
            0
        } else {
            (market_metadata.total_yes_assets as u128)
                .checked_mul(shares as u128)
                .unwrap()
                .checked_div(market_metadata.total_yes_shares as u128)
                .unwrap() as u64
        }
    } else {
        // For NO shares, calculate based on total no assets and shares
        if market_metadata.total_no_shares == 0 {
            0
        } else {
            (market_metadata.total_no_assets as u128)
                .checked_mul(shares as u128)
                .unwrap()
                .checked_div(market_metadata.total_no_shares as u128)
                .unwrap() as u64
        }
    };

    // Require that the amount is greater than zero
    require!(amount > 0, YapdotfunError::NoSharesToSell);

    // Update market metadata based on the vote direction
    match bet {
        true => {
            let market_metadata_account = &mut ctx.accounts.market_metadata;
            market_metadata_account.total_yes_assets = market_metadata_account
                .total_yes_assets
                .saturating_sub(amount);
            market_metadata_account.total_yes_shares = market_metadata_account
                .total_yes_shares
                .saturating_sub(shares);

            // Don't reduce total rewards - those remain in the pool for winners
        }
        false => {
            let market_metadata_account = &mut ctx.accounts.market_metadata;
            market_metadata_account.total_no_assets = market_metadata_account
                .total_no_assets
                .saturating_sub(amount);
            market_metadata_account.total_no_shares = market_metadata_account
                .total_no_shares
                .saturating_sub(shares);

            // Don't reduce total rewards - those remain in the pool for winners
        }
    };

    // Transfer SOL from market to user
    let from = ctx.accounts.market.to_account_info();
    let to = ctx.accounts.signer.to_account_info();
    transfer_sol(ctx.accounts.system_program.to_owned(), from, to, amount)?;

    Ok(())
}
