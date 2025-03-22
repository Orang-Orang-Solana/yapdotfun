use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(description: String)]
/// Account structure for initializing a new prediction market
pub struct InitializeMarket<'info> {
    /// The main market account that stores core market information
    /// PDA derived from "market", the market description, and the creator's public key
    #[account(
        init,
        payer = signer,
        space = 8 + Market::INIT_SPACE,
        seeds = [
            b"market",
            description.as_bytes(),
            signer.key().as_ref()
        ],
        bump,
    )]
    pub market: Account<'info, Market>,

    /// The market metadata account that stores financial information about the market
    /// PDA derived from "market-metadata", the market description, and the creator's public key
    #[account(
        init,
        payer = signer,
        space = 8 + MarketMetadata::INIT_SPACE,
        seeds = [
            b"market-metadata",
            description.as_bytes(),
            signer.key().as_ref()
        ],
        bump,
    )]
    pub market_metadata: Account<'info, MarketMetadata>,

    /// The account that is initializing the market and paying for account creation
    #[account(mut)]
    pub signer: Signer<'info>,

    /// The Solana System Program, required for creating new accounts
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitializeMarket>, description: String) -> Result<()> {
    let market_account = &mut ctx.accounts.market;
    let default_market = Market::default();

    market_account.description = description;
    market_account.status = default_market.status;
    market_account.answer = default_market.answer;
    market_account.initializer = ctx.accounts.signer.key().to_owned();
    market_account.metadata = ctx.accounts.market_metadata.key().to_owned();

    let market_metadata_account = &mut ctx.accounts.market_metadata;
    let default_market_metadata = MarketMetadata::default();

    market_metadata_account.total_yes_assets = default_market_metadata.total_yes_assets;
    market_metadata_account.total_no_assets = default_market_metadata.total_no_assets;
    market_metadata_account.total_yes_shares = default_market_metadata.total_yes_shares;
    market_metadata_account.total_no_shares = default_market_metadata.total_no_shares;
    market_metadata_account.total_rewards = default_market_metadata.total_rewards;

    Ok(())
}
