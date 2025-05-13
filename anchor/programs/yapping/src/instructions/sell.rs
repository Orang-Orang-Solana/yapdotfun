use crate::{errors::YappingError, state::*, utils::*};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::log::sol_log_compute_units;

/// Accounts required for the sell instruction
#[derive(Accounts)]
#[instruction(bet: bool, shares_to_sell: u64)]
pub struct Sell<'info> {
    /// The market account that will be updated - this should be a PDA
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
        close = signer,
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
/// This function allows users to sell all or part of their shares in a prediction market.
/// Users can specify any amount of shares to sell, as long as they own enough shares.
/// After selling, the user retains any remaining shares and can sell them later.
///
/// # Arguments
/// * `ctx` - The context for the instruction
/// * `bet` - Whether selling YES (true) or NO (false) shares
/// * `shares_to_sell` - Number of shares to sell
///
/// # Errors
/// * `MarketClosed` - If the market is already closed
/// * `NoSharesToSell` - If trying to sell 0 shares
/// * `NotEnoughShares` - If user doesn't have enough shares of the specified type
pub fn handler(ctx: Context<Sell>, bet: bool, shares_to_sell: u64) -> Result<()> {
    msg!(
        "Sell instruction started: bet={}, shares_to_sell={}",
        bet,
        shares_to_sell
    );
    sol_log_compute_units();

    // Ensure the market is open
    require!(
        ctx.accounts.market.status == MarketStatus::Open,
        YappingError::MarketClosed
    );
    msg!("Market status check passed");

    // Ensure the user has enough shares to sell
    require!(shares_to_sell > 0, YappingError::NoSharesToSell);
    msg!("Shares to sell check passed");

    // Get the market voter account
    let market_voter = &mut ctx.accounts.market_voter;
    msg!(
        "Market voter account: vote={}, amount={}",
        market_voter.vote,
        market_voter.amount
    );

    // Verify the user is selling the correct type of shares (YES/NO)
    require!(market_voter.vote == bet, YappingError::NotEnoughShares);
    msg!("Vote type check passed");

    // Calculate the total shares the user owns
    let user_total_shares = market_voter.amount.into_shares();
    msg!("User total shares: {}", user_total_shares);

    // Verify the user has enough shares to sell
    require!(
        user_total_shares >= shares_to_sell,
        YappingError::NotEnoughShares
    );
    msg!("User has enough shares check passed");

    // Calculate price per share using the pricing mechanism
    let market_metadata = &mut ctx.accounts.market_metadata;
    let price_per_share = market_metadata.calculate_price_sell(bet, shares_to_sell);
    msg!("Price per share: {}", price_per_share);

    // Calculate the total amount to return to the user
    let sol_amount_to_return =
        ((shares_to_sell as u128 * price_per_share as u128) / 1_000_000) as u64;
    msg!("SOL amount to return: {}", sol_amount_to_return);

    // Require that the amount is greater than zero
    require!(sol_amount_to_return > 0, YappingError::NoSharesToSell);
    msg!("SOL amount check passed");

    // The SOL transfer from the market is no longer needed as closing the market_voter
    // account will refund the lamports to the signer.
    /*
    let market = ctx.accounts.market.to_account_info();
    let user = ctx.accounts.signer.to_account_info();
    let _ = crate::transfer_sol(
        ctx.accounts.system_program.to_owned(),
        market,
        user,
        sol_amount_to_return,
        None,
        None,
    );
    */

    // Update market metadata
    match bet {
        true => {
            market_metadata.total_yes_assets =
                market_metadata.total_yes_assets - sol_amount_to_return;
            market_metadata.total_yes_shares = market_metadata.total_yes_shares - shares_to_sell;
        }
        false => {
            market_metadata.total_no_assets =
                market_metadata.total_no_assets - sol_amount_to_return;
            market_metadata.total_no_shares = market_metadata.total_no_shares - shares_to_sell;
        }
    };

    // The close = signer attribute will refund all lamports to the user
    msg!("Sell instruction completed successfully. MarketVoter account closed and lamports refunded.");
    sol_log_compute_units();

    Ok(())
}
