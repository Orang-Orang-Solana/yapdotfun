use crate::state::*;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;

pub trait StringExt {
    fn to_hashed_bytes(&self) -> Vec<u8>;
}

impl StringExt for String {
    fn to_hashed_bytes(&self) -> Vec<u8> {
        let hash_value = hash(self.as_bytes());
        let hash = hash_value.to_bytes().to_vec();
        assert_eq!(hash.len(), 32);
        hash
    }
}

/// Accounts required for initializing a new prediction market
#[derive(Accounts)]
#[instruction(description: String)]
pub struct InitializeMarket<'info> {
    /// The main market account that stores core market information
    /// PDA derived from "market", the market description, and the creator's public key
    #[account(
        init,
        payer = signer,
        space = 0x08 + Market::INIT_SPACE + &description.to_hashed_bytes()[..].len(),
        seeds = [
            b"market",
            &description.to_hashed_bytes()[..],
        ],
        bump,
    )]
    pub market: Account<'info, Market>,

    /// The market metadata account that stores financial information about the market
    /// PDA derived from "market_metadata" and the market account's public key
    #[account(
        init,
        payer = signer,
        space = 0x08 + MarketMetadata::INIT_SPACE,
        seeds = [
            b"market_metadata",
            market.key().as_ref(),
        ],
        bump
    )]
    pub market_metadata: Account<'info, MarketMetadata>,

    /// The account that is initializing the market and paying for account creation
    #[account(mut)]
    pub signer: Signer<'info>,

    /// The Solana System Program, required for creating new accounts
    pub system_program: Program<'info, System>,
}

/// Initializes a new prediction market with default values
///
/// This function creates a new market and its associated metadata account.
/// It sets up the market with the provided description and initializes all
/// financial metrics to zero.
///
/// # Arguments
/// * `ctx` - The context containing all the accounts needed for initialization
/// * `description` - A string describing what this prediction market is about
///
/// # Returns
/// * `Result<()>` - Result indicating success or failure
///
/// # Events
/// * `MarketInitializedEvent` - Emitted when a market is successfully initialized
pub fn handler(ctx: Context<InitializeMarket>, description: String) -> Result<()> {
    let market_account = &mut ctx.accounts.market;
    let default_market = Market::default();

    // Initialize market account with description and default values
    market_account.description = description;
    market_account.status = default_market.status;
    market_account.answer = default_market.answer;
    market_account.initializer = ctx.accounts.signer.key().to_owned();

    // Initialize market metadata account with default values (all zeros)
    let market_metadata_account = &mut ctx.accounts.market_metadata;
    let default_market_metadata = MarketMetadata::default();

    market_metadata_account.total_yes_assets = default_market_metadata.total_yes_assets;
    market_metadata_account.total_no_assets = default_market_metadata.total_no_assets;
    market_metadata_account.total_yes_shares = default_market_metadata.total_yes_shares;
    market_metadata_account.total_no_shares = default_market_metadata.total_no_shares;
    market_metadata_account.total_rewards = default_market_metadata.total_rewards;

    // Emit an event to notify listeners that a new market was created
    emit!(crate::MarketInitializedEvent {
        message: String::from("New market was initialized!"),
        market_id: market_account.key().to_string(),
        market_metadata_id: market_metadata_account.key().to_string(),
        initializer: ctx.accounts.signer.key().to_string()
    });

    Ok(())
}
