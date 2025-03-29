use anchor_lang::{prelude::*, solana_program::native_token::LAMPORTS_PER_SOL};

use crate::{errors::YapdotfunError, state::*};

pub fn handler(ctx: Context<Sell>, bet: bool, shares: u64) -> Result<()> {
    // Ensure the market is not closed
    require!(
        ctx.accounts.market.status == MarketStatus::Closed,
        YapdotfunError::MarketClosed
    );

    // Ensure the user has enough shares to sell
    require!(shares > 0, YapdotfunError::NoSharesToSell);

    // Get the market voter account
    let market_voter = &ctx.accounts.market_voter;

    // Verify the user is selling the correct type of shares (YES/NO)
    require!(market_voter.vote == bet, YapdotfunError::NotEnoughShares);

    // Calculate the SOL amount to return based on shares
    let amount = shares * 1_000 / LAMPORTS_PER_SOL;

    // Update market metadata based on the vote direction
    match bet {
        true => {
            let market_metadata_account = &mut ctx.accounts.market_metadata;
            market_metadata_account.total_yes_assets -= amount;
            market_metadata_account.total_yes_shares -= shares;
            market_metadata_account.total_rewards -= amount;
        }
        false => {
            let market_metadata_account = &mut ctx.accounts.market_metadata;
            market_metadata_account.total_no_assets -= amount;
            market_metadata_account.total_no_shares -= shares;
            market_metadata_account.total_rewards -= amount;
        }
    };

    // Transfer SOL from market to user
    let from = ctx.accounts.market.to_account_info();
    let to = ctx.accounts.signer.to_account_info();
    let _ = crate::transfer_sol(ctx.accounts.system_program.to_owned(), from, to, amount);

    Ok(())
}

#[derive(Accounts)]
pub struct Sell<'info> {
    /// The market account that will be updated
    #[account(mut)]
    pub market: Account<'info, Market>,

    /// The market metadata account that tracks voting statistics
    /// This PDA is derived from the market account
    #[account(
        mut,
        seeds = [
            b"market_metadata",
            market.key().as_ref()
        ],
        bump
    )]
    pub market_metadata: Account<'info, MarketMetadata>,

    /// The market voter account that tracks the user's vote
    /// This PDA is derived from the voter's pubkey and the market
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
