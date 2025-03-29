use crate::{state::*, utils::IntoShares};
use anchor_lang::{prelude::*, solana_program::native_token::LAMPORTS_PER_SOL};

/// Accounts required for the buy instruction
#[derive(Accounts)]
pub struct Buy<'info> {
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

    /// A new account that will be initialized to track this user's vote
    /// This PDA is derived from the voter's pubkey and the market
    #[account(
        init,
        payer = signer,
        space = 0x08 + MarketVoter::INIT_SPACE,
        seeds = [
            b"market_voter",
            signer.key().as_ref(),
            market.key().as_ref()
        ],
        bump
    )]
    pub market_voter: Account<'info, MarketVoter>,

    /// The user who is voting and paying for the transaction
    #[account(mut)]
    pub signer: Signer<'info>,

    /// The system program, used for transferring SOL
    pub system_program: Program<'info, System>,
}

/// Buy instruction handler
///
/// This function allows a user to vote on a market by transferring SOL
/// and receiving shares in return. Each user can only vote once per market.
/// The PDA for the market_voter account ensures this constraint.
///
/// # Arguments
/// * `ctx` - The context of accounts
/// * `bet` - Boolean indicating vote direction (true = YES, false = NO)
/// * `amount` - Amount of SOL to transfer (in lamports)
///
/// # Returns
/// * `Result<()>` - Result indicating success or failure
///
/// # Errors
/// * `AmountConstraintViolated` - If the amount is zero or negative
/// * `MarketClosed` - If the market is not in the Open state
/// * Will also return an Anchor error if the user tries to vote twice (PDA already exists)
pub fn handler(ctx: Context<Buy>, bet: bool, amount: u64) -> Result<()> {
    // Ensure the amount is greater than zero
    require!(amount > 0, crate::YapdotfunError::AmountConstraintViolated);
    require!(
        ctx.accounts.market.status == crate::state::MarketStatus::Open,
        crate::YapdotfunError::MarketClosed
    );

    // Calculate shares based on the amount of SOL transferred
    let shares = amount.into_shares();
    dbg!("shares", shares);

    // Update market metadata based on the vote direction
    match bet {
        true => {
            let market_metadata_account = &mut ctx.accounts.market_metadata;
            market_metadata_account.total_yes_assets += amount;
            market_metadata_account.total_yes_shares += shares;
            market_metadata_account.total_rewards += amount;
        }
        false => {
            let market_metadata_account = &mut ctx.accounts.market_metadata;
            market_metadata_account.total_no_assets += amount;
            market_metadata_account.total_no_shares += shares;
            market_metadata_account.total_rewards += amount;
        }
    };

    // Record the user's vote in the market_voter account
    let market_voter_account = &mut ctx.accounts.market_voter;
    market_voter_account.amount = amount;
    market_voter_account.vote = bet;

    // Transfer SOL from the signer to the market account
    let from = ctx.accounts.signer.to_account_info();
    let to = ctx.accounts.market.to_account_info();
    let _ = crate::transfer_sol(ctx.accounts.system_program.to_owned(), from, to, amount);

    Ok(())
}
