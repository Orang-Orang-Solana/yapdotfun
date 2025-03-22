use anchor_lang::prelude::*;

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
