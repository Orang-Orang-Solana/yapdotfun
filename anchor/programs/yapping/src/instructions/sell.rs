use crate::{errors::YappingError, state::*, utils::*};
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
    // Ensure the market is open
    require!(
        ctx.accounts.market.status == MarketStatus::Open,
        YappingError::MarketClosed
    );

    // Ensure the user has enough shares to sell
    require!(shares_to_sell > 0, YappingError::NoSharesToSell);

    // Get the market voter account
    let market_voter = &mut ctx.accounts.market_voter;

    // Verify the user is selling the correct type of shares (YES/NO)
    require!(market_voter.vote == bet, YappingError::NotEnoughShares);

    // Calculate the total shares the user owns
    let user_total_shares = market_voter.amount.into_shares();

    // Verify the user has enough shares to sell
    require!(
        user_total_shares >= shares_to_sell,
        YappingError::NotEnoughShares
    );

    // Calculate price per share using the pricing mechanism
    let market_metadata = &ctx.accounts.market_metadata;
    let price_per_share = market_metadata.calculate_price_sell(bet, shares_to_sell);

    // Calculate the total amount to return to the user
    let sol_amount_to_return = (shares_to_sell as u128)
        .checked_mul(price_per_share as u128)
        .unwrap()
        .checked_div(1_000_000) // Scale factor to match the buy calculation
        .unwrap() as u64;

    // Require that the amount is greater than zero
    require!(sol_amount_to_return > 0, YappingError::NoSharesToSell);

    // Calculate the portion of the user's original investment to reduce
    // This ensures that partial selling is properly accounted for
    // Example: If user has 0.5 SOL invested (0.5 shares) and sells 0.1 shares (20%),
    //          we reduce their investment by 20% = 0.1 SOL, leaving 0.4 SOL invested
    let proportion_sold = (shares_to_sell as u128)
        .checked_mul(u128::MAX)
        .unwrap()
        .checked_div(user_total_shares as u128)
        .unwrap();

    let sol_investment_to_reduce = (market_voter.amount as u128)
        .checked_mul(proportion_sold)
        .unwrap()
        .checked_div(u128::MAX)
        .unwrap() as u64;

    // Update market voter account to reflect the reduced position
    // Only reduce the amount, don't change the vote direction
    // This allows users to sell part of their shares and keep the rest
    market_voter.amount = market_voter.amount.saturating_sub(sol_investment_to_reduce);

    // Update market metadata based on the vote direction
    match bet {
        true => {
            let market_metadata_account = &mut ctx.accounts.market_metadata;
            market_metadata_account.total_yes_assets = market_metadata_account
                .total_yes_assets
                .saturating_sub(sol_amount_to_return);
            market_metadata_account.total_yes_shares = market_metadata_account
                .total_yes_shares
                .saturating_sub(shares_to_sell);

            // Don't reduce total rewards - those remain in the pool for winners
        }
        false => {
            let market_metadata_account = &mut ctx.accounts.market_metadata;
            market_metadata_account.total_no_assets = market_metadata_account
                .total_no_assets
                .saturating_sub(sol_amount_to_return);
            market_metadata_account.total_no_shares = market_metadata_account
                .total_no_shares
                .saturating_sub(shares_to_sell);

            // Don't reduce total rewards - those remain in the pool for winners
        }
    };

    // Hash the description string the same way it was done during initialization
    let hashed_description = ctx.accounts.market.description.to_hashed_bytes();

    // Prepare seeds for PDA signing
    let market_seed1 = b"market";
    let market_seed2 = hashed_description.as_slice();
    let seeds = &[market_seed1 as &[u8], market_seed2 as &[u8]];

    // Calculate the bump for the market PDA
    let (_, bump) = Pubkey::find_program_address(&[market_seed1, market_seed2], ctx.program_id);

    // Transfer SOL from market to user using PDA signing
    let from = ctx.accounts.market.to_account_info();
    let to = ctx.accounts.signer.to_account_info();

    transfer_sol(
        ctx.accounts.system_program.to_owned(),
        from,
        to,
        sol_amount_to_return,
        Some(seeds),
        Some(bump),
    )?;

    Ok(())
}
