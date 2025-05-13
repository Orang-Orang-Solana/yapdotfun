//! # Yapping Program
//!
//! This program implements a decentralized prediction market on Solana.
//! Users can create markets, buy shares (YES or NO) representing their prediction,
//! and sell shares. Once a market is closed and the outcome is determined,
//! users can withdraw their rewards based on the shares they hold for the
//! correct outcome.

use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

declare_id!("k4aw18gNq8Z49MejeQoF6B8QnPqkSLehraenkVqC4be");

/// The main module for the Yapping program.
/// It contains all the instructions and account definitions.
#[program]
pub mod yapping {
    use super::*;

    /// Initializes a new prediction market.
    ///
    /// # Arguments
    ///
    /// * `ctx` - The context for this instruction.
    /// * `description` - A description of the market.
    /// * `image_url` - A URL for an image related to the market.
    /// * `end_time` - The Unix timestamp when the market ends and can be closed.
    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        description: String,
        image_url: String,
        end_time: u64,
    ) -> Result<()> {
        InitializeMarket::process(ctx, description, image_url, end_time)
    }

    /// Allows a user to buy shares in a market.
    ///
    /// # Arguments
    ///
    /// * `ctx` - The context for this instruction.
    /// * `bet` - A boolean indicating the user\'s prediction (true for YES, false for NO).
    /// * `lamports_amount` - The amount of lamports the user is spending to buy shares.
    pub fn buy(ctx: Context<Buy>, bet: bool, lamports_amount: u64) -> Result<()> {
        Buy::process(ctx, bet, lamports_amount)
    }

    /// Allows a user to sell their shares in a market.
    ///
    /// # Arguments
    ///
    /// * `ctx` - The context for this instruction.
    /// * `shares_amount` - The amount of shares the user wants to sell.
    pub fn sell(ctx: Context<Sell>, shares_amount: u64) -> Result<()> {
        Sell::process(ctx, shares_amount)
    }

    // TODO: Implement these instructions
    // pub fn close_market(ctx: Context<CloseMarket>) -> Result<()> {
    //     // CloseMarket::process(ctx)
    //     todo!()
    // }

    // pub fn withdraw_rewards(ctx: Context<WithdrawRewards>) -> Result<()> {
    //     // WithdrawRewards::process(ctx)
    //     todo!()
    // }
}

/// Accounts required for the `initialize_market` instruction.
#[derive(Accounts)]
#[instruction(description: String)]
pub struct InitializeMarket<'info> {
    /// The signer who is initializing the market. Pays for the account creation.
    #[account(mut)]
    pub signer: Signer<'info>,
    /// The market account to be initialized.
    /// Its address is derived from the "market" seed and the hash of the description.
    #[account(
        init,
        payer = signer,
        space = 0x008 + Market::INIT_SPACE,
        seeds = [
            b"market".as_ref(),
            &description.to_hashed_bytes()[..]
        ],
        bump,
    )]
    pub market: Account<'info, Market>,
    /// The Solana system program, required for account creation.
    pub system_program: Program<'info, System>,
}

impl<'info> InitializeMarket<'info> {
    /// Processes the `initialize_market` instruction.
    fn process(
        ctx: Context<Self>,
        description: String,
        image_url: String,
        end_time: u64,
    ) -> Result<()> {
        Market::init(ctx, description, image_url, end_time)
    }
}

/// Accounts required for the `buy` instruction.
#[derive(Accounts)]
pub struct Buy<'info> {
    /// The signer who is buying shares. Pays for the transaction and potential account creation.
    #[account(mut)]
    pub signer: Signer<'info>,
    /// The market account in which shares are being bought.
    #[account(mut)]
    pub market: Account<'info, Market>,
    /// The user\'s position account in the market.
    /// It is initialized if it\'s a new buy for this user in this market
    /// or updated if it\'s an existing position.
    /// Its address is derived from "market_position", market key, and signer key.
    #[account(
        init_if_needed,
        payer = signer,
        space = 0x008 + MarketPosition::INIT_SPACE,
        seeds = [
            b"market_position".as_ref(),
            market.key().as_ref(),
            signer.key().as_ref(),
        ],
        bump,
    )]
    pub market_position: Account<'info, MarketPosition>,
    /// The vault account associated with this market and user, holding the lamports.
    /// Its address is derived from "vault", market key, and signer key.
    #[account(
        mut,
        seeds = [
            b"vault".as_ref(),
            market.key().as_ref(),
            signer.key().as_ref(),
        ],
        bump,
    )]
    pub vault: SystemAccount<'info>,
    /// The Solana system program, required for account creation and transfers.
    pub system_program: Program<'info, System>,
}

impl<'info> Buy<'info> {
    /// Processes the `buy` instruction.
    fn process(ctx: Context<Self>, bet: bool, lamports_amount: u64) -> Result<()> {
        MarketPosition::buy(ctx, bet, lamports_amount)
    }
}

/// Accounts required for the `sell` instruction.
#[derive(Accounts)]
pub struct Sell<'info> {
    /// The signer who is selling shares.
    #[account(mut)]
    pub signer: Signer<'info>,
    /// The market account from which shares are being sold.
    #[account(mut)]
    pub market: Account<'info, Market>,
    /// The user\'s position account in the market, holding the shares to be sold.
    /// Its address is derived from "market_position", market key, and signer key.
    #[account(
        mut,
        seeds = [
            b"market_position".as_ref(),
            market.key().as_ref(),
            signer.key().as_ref(),
        ],
        bump,
    )]
    pub market_position: Account<'info, MarketPosition>,
    /// The vault account associated with this market and user, from which lamports are returned.
    /// Its address is derived from "vault", market key, and signer key.
    #[account(
        mut,
        seeds = [
            b"vault".as_ref(),
            market.key().as_ref(),
            signer.key().as_ref(),
        ],
        bump,
    )]
    pub vault: SystemAccount<'info>,
    /// The Solana system program, required for transfers.
    pub system_program: Program<'info, System>,
}

impl<'info> Sell<'info> {
    /// Processes the `sell` instruction.
    fn process(ctx: Context<Self>, shares_amount: u64) -> Result<()> {
        MarketPosition::sell(ctx, shares_amount)
    }
}

/// Represents a prediction market.
#[account]
#[derive(InitSpace)]
pub struct Market {
    /// The public key of the account that initialized the market.
    pub initializer: Pubkey,
    /// A description of the market (max 128 characters).
    #[max_len(0x80)]
    pub description: String,
    /// A URL for an image related to the market (max 256 characters).
    #[max_len(0x100)]
    pub image_url: String,
    /// The result of the market (true for YES, false for NO).
    pub result: bool,
    /// Status of the market (Open or Closed).
    pub status: MarketStatus,
    /// The Unix timestamp when the market ends.
    pub end_time: u64,
    /// Metadata about the market, including total assets and shares.
    pub metadata: MarketMetadata,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum MarketStatus {
    Open,
    Closed,
}

/// Metadata associated with a `Market`.
#[derive(InitSpace, Clone, AnchorSerialize, AnchorDeserialize, Default)]
pub struct MarketMetadata {
    /// Total lamports committed to the YES outcome.
    pub total_yes_assets: u64,
    /// Total lamports committed to the NO outcome.
    pub total_no_assets: u64,
    /// Total shares issued for the YES outcome.
    pub total_yes_shares: u64,
    /// Total shares issued for the NO outcome.
    pub total_no_shares: u64,
}

impl Market {
    /// Initializes the fields of a `Market` account.
    pub fn init(
        ctx: Context<InitializeMarket>,
        description: String,
        image_url: String,
        end_time: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;

        market.initializer = ctx.accounts.signer.key();
        market.description = description;
        market.image_url = image_url;
        market.end_time = end_time;
        market.status = MarketStatus::Open;
        market.metadata = MarketMetadata::default();

        emit!(MarketInitialized {
            market_id: market.key(),
            description: market.description.clone(),
            image_url: market.image_url.clone(),
            end_time: market.end_time,
        });

        Ok(())
    }
}

/// Represents a user\'s position in a specific market.
#[account]
#[derive(InitSpace)]
pub struct MarketPosition {
    /// The public key of the market this position belongs to.
    pub market_id: Pubkey,
    /// The public key of the user (signer) who owns this position.
    pub position_id: Pubkey,
    /// The total amount of lamports the user has committed to this position.
    pub amount: u64,
    /// The number of shares the user holds for this position.
    pub shares: u64,
    /// The user\'s bet (true for YES, false for NO).
    pub bet: bool,
}

impl Default for MarketPosition {
    /// Provides default values for `MarketPosition`.
    fn default() -> Self {
        Self {
            market_id: Pubkey::default(),
            position_id: Pubkey::default(),
            amount: 0,
            shares: 0,
            bet: false,
        }
    }
}

impl MarketPosition {
    /// Processes the logic for a user buying shares in a market.
    /// Updates the user\'s position and the market\'s metadata.
    /// Transfers lamports from the user to the vault.
    ///
    /// # Arguments
    ///
    /// * `ctx` - The context for this instruction.
    /// * `bet` - A boolean indicating the user's prediction (true for YES, false for NO).
    /// * `lamports_amount` - The amount of lamports the user is spending to buy shares.
    ///
    /// # Returns
    ///
    /// * `Result<()>` - The result of the operation.
    ///
    /// # Errors
    ///
    /// Returns an error if:
    /// * The market is closed (end time has passed)
    /// * The lamports amount is zero
    /// * The calculated shares amount is zero
    /// * The user tries to buy a different outcome than their existing position
    pub fn buy(ctx: Context<Buy>, bet: bool, lamports_amount: u64) -> Result<()> {
        let market_position = &mut ctx.accounts.market_position;
        let market = &mut ctx.accounts.market;

        require!(
            market.status == MarketStatus::Open,
            YappingError::MarketStatusClosed
        );
        msg!("MarketStatusClosed::checks > passed");

        require!(lamports_amount > 0, YappingError::NotEnoughShares);
        msg!("NotEnoughShares::checks > passed");

        let shares_bought = calculate_buy_price(market, bet, lamports_amount);

        require!(shares_bought > 0, YappingError::NotEnoughShares);
        msg!("NotEnoughShares::checks > passed");

        if market_position.amount == 0 {
            // Assuming new position if amount is 0
            market_position.market_id = market.key();
            market_position.position_id = ctx.accounts.signer.key();
            market_position.bet = bet;
        } else {
            require!(market_position.bet == bet, YappingError::BetMismatch);
            msg!("BetMismatch::checks > passed");
        }

        market_position.amount = market_position.amount.saturating_add(lamports_amount);
        market_position.shares = market_position.shares.saturating_add(shares_bought);

        if bet {
            market.metadata.total_yes_assets = market
                .metadata
                .total_yes_assets
                .saturating_add(lamports_amount);
            market.metadata.total_yes_shares = market
                .metadata
                .total_yes_shares
                .saturating_add(shares_bought);
            msg!("total_yes_assets::checks > passed");
        } else {
            market.metadata.total_no_assets = market
                .metadata
                .total_no_assets
                .saturating_add(lamports_amount);
            market.metadata.total_no_shares = market
                .metadata
                .total_no_shares
                .saturating_add(shares_bought);
        }

        emit!(MarketPositionCreated {
            market_id: market.key(),
            position_id: market_position.position_id,
            amount: lamports_amount,
            bet: market_position.bet,
            shares: shares_bought,
        });

        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.signer.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            lamports_amount,
        )?;

        Ok(())
    }

    /// Processes the logic for a user selling shares in a market.
    /// Updates the user\'s position and the market\'s metadata.
    /// Transfers lamports from the vault back to the user.
    ///
    /// # Arguments
    ///
    /// * `ctx` - The context for this instruction.
    /// * `shares_to_sell_amount` - The amount of shares the user wants to sell.
    ///
    /// # Returns
    ///
    /// * `Result<()>` - The result of the operation.
    ///
    /// # Errors
    ///
    /// Returns an error if:
    /// * The market is closed (end time has passed)
    /// * The user doesn't have enough shares
    /// * The shares amount is zero
    /// * The calculated lamports return amount is zero or too low
    pub fn sell(ctx: Context<Sell>, shares_to_sell_amount: u64) -> Result<()> {
        let market_position = &mut ctx.accounts.market_position;
        let market = &mut ctx.accounts.market;

        require!(
            market.status == MarketStatus::Open,
            YappingError::MarketStatusClosed
        );

        require!(
            market_position.shares >= shares_to_sell_amount,
            YappingError::NotEnoughShares
        );

        require!(shares_to_sell_amount > 0, YappingError::NotEnoughShares);

        let lamports_to_return =
            calculate_sell_price(market, market_position.bet, shares_to_sell_amount);

        require!(lamports_to_return > 0, YappingError::PriceTooLow);

        market_position.shares = market_position.shares.saturating_sub(shares_to_sell_amount);
        market_position.amount = market_position.amount.saturating_sub(lamports_to_return);

        if market_position.bet {
            market.metadata.total_yes_shares = market
                .metadata
                .total_yes_shares
                .saturating_sub(shares_to_sell_amount);
            market.metadata.total_yes_assets = market
                .metadata
                .total_yes_assets
                .saturating_sub(lamports_to_return);
        } else {
            market.metadata.total_no_shares = market
                .metadata
                .total_no_shares
                .saturating_sub(shares_to_sell_amount);
            market.metadata.total_no_assets = market
                .metadata
                .total_no_assets
                .saturating_sub(lamports_to_return);
        }

        let market_key_val = market.key();
        let market_key_bytes = market_key_val.as_ref();
        let signer_key_val = ctx.accounts.signer.key();
        let signer_key_bytes = signer_key_val.as_ref();
        let bump_slice = &[ctx.bumps.vault];

        let vault_seeds: &[&[u8]] = &[b"vault", market_key_bytes, signer_key_bytes, bump_slice];

        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.signer.to_account_info(),
                },
                &[vault_seeds],
            ),
            lamports_to_return,
        )?;

        emit!(MarketPositionSold {
            market_id: market.key(),
            position_id: market_position.position_id,
            shares_amount: shares_to_sell_amount,
            lamports_returned: lamports_to_return,
        });

        Ok(())
    }
}

/// Precision factor used for price calculations.
/// This constant defines the ratio between lamports and shares in the prediction market.
/// A higher factor means shares are more expensive in terms of lamports.
pub const FACTOR: u64 = 1_000_000;

/// Calculates the number of shares to issue when buying with a given amount of lamports.
/// Uses a simple linear pricing model where shares = lamports / FACTOR.
/// This function determines how many shares a user receives for their investment.
///
/// # Arguments
///
/// * `_market` - The market account (currently unused but reserved for future advanced pricing models).
/// * `_bet` - The bet direction (YES/NO) (currently unused but reserved for future differential pricing).
/// * `lamports_amount` - The amount of lamports the user is investing.
///
/// # Returns
///
/// * `u64` - The number of shares to issue to the user.
pub fn calculate_buy_price(_market: &Market, _bet: bool, lamports_amount: u64) -> u64 {
    lamports_amount.saturating_div(FACTOR)
}

/// Calculates the amount of lamports to return when selling a given number of shares.
/// Uses a simple linear pricing model where lamports = shares * FACTOR.
/// This function determines how many lamports a user receives when selling their shares.
///
/// # Arguments
///
/// * `_market` - The market account (currently unused but reserved for future advanced pricing models).
/// * `_bet` - The bet direction (YES/NO) (currently unused but reserved for future differential pricing).
/// * `shares_amount` - The number of shares the user is selling.
///
/// # Returns
///
/// * `u64` - The amount of lamports to return to the user.
pub fn calculate_sell_price(_market: &Market, _bet: bool, shares_amount: u64) -> u64 {
    shares_amount.saturating_mul(FACTOR)
}

/// Event emitted when a market is initialized.
#[event]
pub struct MarketInitialized {
    /// The public key of the initialized market.
    pub market_id: Pubkey,
    /// The description of the market.
    pub description: String,
    /// The image URL for the market.
    pub image_url: String,
    /// The end time of the market (Unix timestamp).
    pub end_time: u64,
}

/// Event emitted when a user creates or adds to a market position (buys shares).
#[event]
pub struct MarketPositionCreated {
    /// The public key of the market.
    pub market_id: Pubkey,
    /// The public key of the user (position owner).
    pub position_id: Pubkey,
    /// The amount of lamports spent in this transaction.
    pub amount: u64,
    /// The user\'s bet (true for YES, false for NO).
    pub bet: bool,
    /// The number of shares acquired in this transaction.
    pub shares: u64,
}

/// Event emitted when a user sells shares from a market position.
#[event]
pub struct MarketPositionSold {
    /// The public key of the market.
    pub market_id: Pubkey,
    /// The public key of the user (position owner).
    pub position_id: Pubkey,
    /// The amount of shares sold.
    pub shares_amount: u64,
    /// The amount of lamports returned to the user.
    pub lamports_returned: u64,
}

/// Event emitted when a market is closed (outcome determined).
#[event]
pub struct MarketClosed {
    /// The public key of the market.
    pub market_id: Pubkey,
    /// The result of the market (true for YES, false for NO).
    pub result: bool,
}

/// Custom errors for the Yapping program.
#[error_code]
pub enum YappingError {
    #[msg("Market already exists.")]
    MarketAlreadyExists,
    #[msg("Market status is closed.")]
    MarketStatusClosed,
    #[msg("Market not closed yet.")]
    MarketNotClosed,
    #[msg("Not enough shares or lamports for the operation.")]
    NotEnoughShares,
    #[msg("Signer is not the designated validator/oracle for this market.")]
    NotValidator,
    #[msg("No shares to claim for this outcome.")]
    NoShares,
    #[msg("Vault lamports overflow or underflow during transfer.")]
    VaultLamportsOverflow,
    #[msg("The provided bet outcome does not match the existing position.")]
    BetMismatch,
    #[msg("Calculated price or return amount is too low or zero.")]
    PriceTooLow,
}

/// A trait for types that can be hashed into a 32-byte array.
/// Used for deriving PDA seeds from dynamic data like descriptions.
pub trait Hashable {
    /// Converts a string to a hashed byte array
    fn to_hashed_bytes(&self) -> Vec<u8>;
}

impl Hashable for String {
    /// Hashes the string using SHA-256 and returns the resulting bytes
    ///
    /// # Returns
    /// * `Vec<u8>` - 32-byte hash of the string
    fn to_hashed_bytes(&self) -> Vec<u8> {
        let hash_value = anchor_lang::solana_program::hash::hash(self.as_bytes());
        let hash = hash_value.to_bytes().to_vec();
        assert_eq!(hash.len(), 32);
        hash
    }
}
