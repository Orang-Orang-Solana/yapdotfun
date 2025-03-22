use crate::state::*;
use anchor_lang::{prelude::*, solana_program::native_token::LAMPORTS_PER_SOL};

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(mut, address = market.metadata)]
    pub market_metadata: Account<'info, MarketMetadata>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[allow(dead_code)]
const SHARES: f32 = 1e3;

pub fn handler(ctx: Context<Buy>, bet: bool, amount: u64) -> Result<()> {
    require!(amount > 0, crate::YapdotfunError::AmountConstraintViolated);

    let from = ctx.accounts.signer.to_account_info();
    let to = ctx.accounts.market.to_account_info();
    let _ = crate::transfer_sol(ctx.accounts.system_program.to_owned(), from, to, amount);

    let shares = (amount as f32 * LAMPORTS_PER_SOL as f32 / SHARES) as u64;

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

    Ok(())
}
