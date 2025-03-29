use anchor_lang::{prelude::*, solana_program::native_token::LAMPORTS_PER_SOL};

pub(crate) fn transfer_sol<'info>(
    system_program: Program<'info, System>,
    from: AccountInfo<'info>,
    to: AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    let ix =
        anchor_lang::solana_program::system_instruction::transfer(&from.key(), &to.key(), amount);

    anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &[
            from.to_account_info().clone(),
            to.to_account_info().clone(),
            system_program.to_account_info().clone(),
        ],
        &[],
    )?;

    Ok(())
}

pub type Shares = u64;
pub type Amount = u64;

/// Constant used for share calculation
/// Represents the number of shares per SOL
pub const SHARES: u64 = 1000;

pub trait IntoShares {
    fn into_shares(self) -> Shares;
}

impl IntoShares for Amount {
    fn into_shares(self) -> Shares {
        self / SHARES
    }
}

pub trait IntoAmount {
    fn into_amount(self) -> Amount;
}

impl IntoAmount for Shares {
    fn into_amount(self) -> Amount {
        self * SHARES
    }
}
