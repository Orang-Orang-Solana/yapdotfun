use crate::errors::YappingError;
use crate::events::RewardsWithdrawnEvent;
use crate::state::{Market, MarketMetadata, MarketStatus, MarketVoter};
use crate::utils::{transfer_sol, IntoShares};
use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;

/// Extension trait for String to provide hashing functionality (copied from initialize_market.rs)
trait StringExt {
    /// Converts a string to a hashed byte array
    fn to_hashed_bytes(&self) -> Vec<u8>;
}

impl StringExt for String {
    /// Hashes the string using SHA-256 and returns the resulting bytes
    ///
    /// # Returns
    /// * `Vec<u8>` - 32-byte hash of the string
    fn to_hashed_bytes(&self) -> Vec<u8> {
        let hash_value = hash(self.as_bytes());
        let hash = hash_value.to_bytes().to_vec();
        assert_eq!(hash.len(), 32);
        hash
    }
}

/// Accounts required for withdrawing rewards from a resolved market
#[derive(Accounts)]
pub struct WithdrawRewards<'info> {
    /// The market account that contains outcome information
    #[account(
        constraint = market.status == MarketStatus::Closed @ YappingError::MarketNotClosed
    )]
    pub market: Account<'info, Market>,

    /// The market metadata account that tracks voting statistics
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

    /// The market voter account that tracks the user's vote
    /// PDA derived from ["market_voter", signer, market]
    #[account(
        mut,
        seeds = [
            b"market_voter",
            user.key().as_ref(),
            market.key().as_ref()
        ],
        bump,
        close = user
    )]
    pub market_voter: Account<'info, MarketVoter>,

    /// The user who is withdrawing rewards
    #[account(mut)]
    pub user: Signer<'info>,

    /// The system program, used for transferring SOL
    pub system_program: Program<'info, System>,
}

/// Withdraws rewards from a resolved prediction market
///
/// This function allows a user to withdraw rewards if they voted correctly.
/// The market must be closed before rewards can be withdrawn.
/// The user's shares will be cleared after withdrawal.
///
/// # Arguments
/// * `ctx` - The context containing all the accounts needed for withdrawal
///
/// # Returns
/// * `Result<()>` - Result indicating success or failure
///
/// # Errors
/// * `MarketNotClosed` - If the market is not closed
/// * `NoShares` - If the user has no shares or voted incorrectly
pub fn handler(ctx: Context<WithdrawRewards>) -> Result<()> {
    let market = &ctx.accounts.market;
    let market_metadata = &ctx.accounts.market_metadata;
    let market_voter = &ctx.accounts.market_voter;

    // Check if the user voted for the winning outcome
    // If not, they aren't eligible for rewards
    if market_voter.vote != market.answer {
        // Emit event showing zero rewards for tracking
        emit!(RewardsWithdrawnEvent {
            market_id: market.key().to_string(),
            user: ctx.accounts.user.key().to_string(),
            rewards: 0,
            bet: market_voter.vote,
        });

        // Return early without transferring any rewards
        return Ok(());
    }

    // Calculate shares and total shares based on the market outcome
    let shares = market_voter.amount.into_shares();

    // Require that the user has shares to withdraw
    require!(shares > 0, YappingError::NoShares);

    let total_shares = if market.answer {
        market_metadata.total_yes_shares
    } else {
        market_metadata.total_no_shares
    };

    // Require that there are total shares in the pool
    require!(total_shares > 0, YappingError::NoShares);

    // Calculate rewards based on share proportion
    let total_rewards = market_metadata.total_rewards;
    let rewards = (total_rewards as u128)
        .checked_mul(shares as u128)
        .unwrap()
        .checked_div(total_shares as u128)
        .unwrap() as u64;

    // Hash the description string the same way it was done during initialization
    let hashed_description = market.description.to_hashed_bytes();

    let market_seed1 = b"market".as_ref();
    let market_seed2 = hashed_description.as_slice();
    let market_seeds = &[market_seed1, market_seed2];

    // Calculate the bump from the market account's address
    let bump = Pubkey::find_program_address(&[market_seed1, market_seed2], ctx.program_id).1;

    // Transfer rewards to the user with PDA signing
    let from = market.to_account_info();
    let to = ctx.accounts.user.to_account_info();
    transfer_sol(
        ctx.accounts.system_program.to_owned(),
        from,
        to,
        rewards,
        Some(market_seeds),
        Some(bump),
    )?;

    // Emit event for tracking reward withdrawals
    emit!(RewardsWithdrawnEvent {
        market_id: market.key().to_string(),
        user: ctx.accounts.user.key().to_string(),
        rewards,
        bet: market_voter.vote,
    });

    Ok(())
}
