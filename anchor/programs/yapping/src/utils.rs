use crate::state::MarketMetadata;
use anchor_lang::prelude::*;

/// Transfer SOL from one account to another, with support for PDAs
///
/// # Arguments
/// * `system_program` - The System Program account
/// * `from` - Account to transfer SOL from
/// * `to` - Account to transfer SOL to
/// * `amount` - Amount of SOL to transfer (in lamports)
/// * `seeds` - Optional seeds for PDA signing (only needed if `from` is a PDA)
/// * `bump` - Optional bump for PDA signing (only needed if `from` is a PDA)
pub(crate) fn transfer_sol<'info>(
    system_program: Program<'info, System>,
    from: AccountInfo<'info>,
    to: AccountInfo<'info>,
    amount: u64,
    seeds: Option<&[&[u8]]>,
    bump: Option<u8>,
) -> Result<()> {
    // Create the transfer instruction
    let ix =
        anchor_lang::solana_program::system_instruction::transfer(&from.key(), &to.key(), amount);

    // Determine if we need to use signed or unsigned invocation
    match seeds {
        Some(seed_slice) => {
            let bump_slice = &[bump.unwrap()];
            let signer_seeds = [seed_slice, &[bump_slice]].concat();

            anchor_lang::solana_program::program::invoke_signed(
                &ix,
                &[
                    from.to_account_info().clone(),
                    to.to_account_info().clone(),
                    system_program.to_account_info().clone(),
                ],
                &[&signer_seeds[..]],
            )?;
        }
        None => {
            anchor_lang::solana_program::program::invoke(
                &ix,
                &[
                    from.to_account_info().clone(),
                    to.to_account_info().clone(),
                    system_program.to_account_info().clone(),
                ],
            )?;
        }
    }

    Ok(())
}

pub type Shares = u64;
pub type Amount = u64;

/// Trait for converting between amounts and shares
pub trait IntoShares {
    fn into_shares(self) -> Shares;
}

/// Default implementation that uses a fixed conversion rate
impl IntoShares for Amount {
    fn into_shares(self) -> Shares {
        self / 1_000_000 // 1 SOL = 1,000,000 lamports = 1 share
    }
}

/// Trait for calculating share prices
pub trait SharePricing {
    /// Calculate the price when buying shares
    fn calculate_price_buy(&self, bet: bool, amount: u64) -> u64;

    /// Calculate the price when selling shares
    fn calculate_price_sell(&self, bet: bool, shares: u64) -> u64;
}

impl SharePricing for MarketMetadata {
    /// Calculate the price per share when buying
    ///
    /// # Arguments
    /// * `bet` - Whether buying YES (true) or NO (false) shares
    /// * `amount` - Amount of SOL to spend on shares (in lamports)
    ///
    /// # Returns
    /// * Price per share in lamports
    fn calculate_price_buy(&self, bet: bool, amount: u64) -> u64 {
        // Simplified version - can be expanded to use bonding curves or other formulas
        // For now, using a fixed price similar to the Solidity version
        if amount == 0 {
            return 0;
        }

        // Get market liquidity based on the bet direction
        let liquidity = if bet {
            self.total_yes_assets.saturating_add(amount)
        } else {
            self.total_no_assets.saturating_add(amount)
        };

        // Basic price formula: higher liquidity = higher price
        // 1_000_000 is the base price (similar to 1e6 in Solidity)
        // This can be adjusted to create different pricing curves
        1_000_000_u64.saturating_add(liquidity / 1_000_u64)
    }

    /// Calculate the price per share when selling
    ///
    /// # Arguments
    /// * `bet` - Whether selling YES (true) or NO (false) shares
    /// * `shares` - Number of shares to sell
    ///
    /// # Returns
    /// * Price per share in lamports
    fn calculate_price_sell(&self, bet: bool, shares: u64) -> u64 {
        if shares == 0 {
            return 0;
        }

        // Get current share supply and assets for the bet direction
        let (total_shares, total_assets) = if bet {
            (self.total_yes_shares, self.total_yes_assets)
        } else {
            (self.total_no_shares, self.total_no_assets)
        };

        // If no shares exist, return a default value
        if total_shares == 0 {
            return 1_000_000;
        }

        // Calculate price based on current ratio of assets to shares
        // This ensures that users get a fair price based on market conditions
        (total_assets as u128)
            .checked_mul(1_000_000) // Scale for precision
            .unwrap_or(0)
            .checked_div(total_shares as u128)
            .unwrap_or(0) as u64
    }
}
