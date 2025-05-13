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
        space = 0x008 + Market::INIT_SPACE + &description.to_hashed_bytes()[..].len(),
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
        init,
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

const PRECISION_FACTOR: u64 = 1_000_000;

/// Represents a quantity of shares in a market.
/// Shares are used to determine a user\'s stake and potential payout.
#[derive(InitSpace, Clone, AnchorSerialize, AnchorDeserialize, Default)]
pub struct Shares(u64);

impl Shares {
    /// Creates a new `Shares` instance.
    pub fn new(amount: u64) -> Self {
        Self(amount)
    }

    /// Returns the underlying `u64` value of the shares.
    pub fn value(&self) -> u64 {
        self.0
    }

    /// Converts shares back to lamports based on a given price.
    /// Uses `PRECISION_FACTOR` for calculation.
    pub fn to_lamports(&self, price: u64) -> u64 {
        let shares_value = self.0;
        if shares_value == 0 {
            0
        } else {
            // Calculate lamports based on shares and price
            shares_value
                .saturating_mul(price)
                .saturating_div(PRECISION_FACTOR)
        }
    }
}

/// A trait for converting a value (e.g., lamports) into `Shares`.
trait IntoShares {
    /// Converts the implementing type to `Shares` based on a given price.
    fn to_shares(&self, price: u64) -> Shares;
}

impl IntoShares for u64 {
    /// Converts `u64` (lamports) to `Shares`.
    /// Uses `PRECISION_FACTOR` for calculation.
    fn to_shares(&self, price: u64) -> Shares {
        let amount = *self;
        if price == 0 {
            Shares(0) // Avoid division by zero
        } else {
            // Calculate shares with precision factor to avoid rounding errors
            Shares(
                amount
                    .saturating_mul(PRECISION_FACTOR)
                    .saturating_div(price),
            )
        }
    }
}

/// Calculates the price for buying shares.
/// This is a placeholder and should be replaced with actual market-based pricing logic.
fn calculate_price_buy(_market: &Market, _bet: bool, _amount: u64) -> u64 {
    // Simple fixed price implementation similar to Solidity example
    // This can be expanded to implement proper pricing logic based on market conditions
    1_000_000 // Fixed price (e.g., 1 SOL in lamports if 1 SOL = 1_000_000_000 lamports and price is per share)
}

/// Calculates the price for selling shares.
/// This is a placeholder and should be replaced with actual market-based pricing logic.
fn calculate_price_sell(_market: &Market, _bet: bool, _shares: &Shares) -> u64 {
    // Simple fixed price implementation similar to Solidity example
    // This can be expanded to implement proper pricing logic based on market conditions
    1_000_000 // Fixed price
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
    /// The Unix timestamp when the market ends.
    pub end_time: u64,
    /// Metadata about the market, including total assets and shares.
    pub metadata: MarketMetadata,
}

/// Metadata associated with a `Market`.
#[derive(InitSpace, Clone, AnchorSerialize, AnchorDeserialize, Default)]
pub struct MarketMetadata {
    /// Total lamports committed to the YES outcome.
    pub total_yes_assets: u64,
    /// Total lamports committed to the NO outcome.
    pub total_no_assets: u64,
    /// Total shares issued for the YES outcome.
    pub total_yes_shares: Shares,
    /// Total shares issued for the NO outcome.
    pub total_no_shares: Shares,
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
    pub shares: Shares,
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
            shares: Shares::default(),
            bet: false,
        }
    }
}

impl MarketPosition {
    /// Processes the logic for a user buying shares in a market.
    /// Updates the user\'s position and the market\'s metadata.
    /// Transfers lamports from the user to the vault.
    pub fn buy(ctx: Context<Buy>, bet: bool, lamports_amount: u64) -> Result<()> {
        let market_position = &mut ctx.accounts.market_position;
        let market = &mut ctx.accounts.market;

        require!(
            market.end_time > Clock::get()?.unix_timestamp as u64,
            YappingError::MarketStatusClosed
        );
        msg!("Market is already closed.");

        require!(lamports_amount > 0, YappingError::NotEnoughShares);
        msg!("Lamport amount must be greater than zero.");

        // Calculate shares based on lamports amount
        let price = calculate_price_buy(market, bet, lamports_amount);
        let shares_bought = lamports_amount.to_shares(price);

        require!(shares_bought.value() > 0, YappingError::NotEnoughShares);
        msg!("Calculated shares must be greater than zero.");

        // Initialize market position if it\'s a new buy for this user in this market
        // or update if it\'s an existing position.
        // For simplicity, this implementation assumes a new position is created with `init`
        // in the `Buy` accounts struct. If allowing multiple buys into the same outcome,
        // this logic would need to check `market_position.amount` or `market_position.shares`.

        if market_position.amount == 0 {
            // Assuming new position if amount is 0
            market_position.market_id = market.key();
            market_position.position_id = ctx.accounts.signer.key();
            market_position.bet = bet;
        } else {
            // If position already exists, ensure the new bet is for the same outcome
            require!(market_position.bet == bet, YappingError::BetMismatch);
            msg!("Cannot buy for a different outcome in an existing position.");
        }

        market_position.amount = market_position.amount.saturating_add(lamports_amount);
        market_position.shares.0 = market_position
            .shares
            .0
            .saturating_add(shares_bought.value());

        if bet {
            market.metadata.total_yes_assets = market
                .metadata
                .total_yes_assets
                .saturating_add(lamports_amount);
            market.metadata.total_yes_shares.0 = market
                .metadata
                .total_yes_shares
                .0
                .saturating_add(shares_bought.value());
        } else {
            market.metadata.total_no_assets = market
                .metadata
                .total_no_assets
                .saturating_add(lamports_amount);
            market.metadata.total_no_shares.0 = market
                .metadata
                .total_no_shares
                .0
                .saturating_add(shares_bought.value());
        }

        emit!(MarketPositionCreated {
            market_id: market.key(),
            position_id: market_position.position_id,
            amount: lamports_amount, // Emitting the amount for this specific buy
            bet: market_position.bet,
            shares: shares_bought.value(), // Emitting shares for this specific buy
        });

        // Transfer lamports from signer to vault using system program
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
    pub fn sell(ctx: Context<Sell>, shares_to_sell_amount: u64) -> Result<()> {
        let market_position = &mut ctx.accounts.market_position;
        let market = &mut ctx.accounts.market;

        require!(
            market.end_time > Clock::get()?.unix_timestamp as u64,
            YappingError::MarketStatusClosed
        );
        msg!("Market is already closed, cannot sell shares.");

        let shares_to_sell = Shares(shares_to_sell_amount);

        // Ensure user has enough shares
        require!(
            market_position.shares.value() >= shares_to_sell_amount,
            YappingError::NotEnoughShares
        );
        msg!("Not enough shares to sell.");

        require!(shares_to_sell_amount > 0, YappingError::NotEnoughShares);
        msg!("Shares to sell must be greater than zero.");

        // Calculate lamports to return based on shares
        let price = calculate_price_sell(market, market_position.bet, &shares_to_sell);
        let lamports_to_return = shares_to_sell.to_lamports(price);

        require!(lamports_to_return > 0, YappingError::PriceTooLow);
        msg!("Calculated return lamports must be greater than zero.");

        // Update market position
        // Note: This assumes shares are fungible and doesn't track specific buys.
        // The `amount` in MarketPosition might need more careful handling if it's meant
        // to be an average cost or something similar. For now, it reflects the total invested.
        // We reduce shares directly. Reducing `amount` proportionally would be more complex.
        market_position.shares.0 = market_position
            .shares
            .0
            .saturating_sub(shares_to_sell_amount);
        // For simplicity, `amount` is not reduced here. A more robust system might track
        // average cost per share or reduce amount proportionally.

        // Update market metadata
        if market_position.bet {
            market.metadata.total_yes_shares.0 = market
                .metadata
                .total_yes_shares
                .0
                .saturating_sub(shares_to_sell_amount);
            market.metadata.total_yes_assets = market
                .metadata
                .total_yes_assets
                .saturating_sub(lamports_to_return);
        } else {
            market.metadata.total_no_shares.0 = market
                .metadata
                .total_no_shares
                .0
                .saturating_sub(shares_to_sell_amount);
            market.metadata.total_no_assets = market
                .metadata
                .total_no_assets
                .saturating_sub(lamports_to_return);
        }

        // Get the market key and signer key as bytes to use in seeds for the vault
        let market_key_val = market.key(); // Store Pubkey value
        let market_key_bytes = market_key_val.as_ref(); // Get reference to its bytes
        let signer_key_val = ctx.accounts.signer.key(); // Store Pubkey value
        let signer_key_bytes = signer_key_val.as_ref(); // Get reference to its bytes
        let bump_slice = &[ctx.bumps.vault]; // Correctly create a slice for the bump

        // PDA signer seeds for the vault
        let vault_seeds: &[&[u8]] = &[
            b"vault",
            market_key_bytes,
            signer_key_bytes,
            bump_slice, // Use the slice here
        ];

        // Transfer lamports from vault to signer using the System Program with PDA signing
        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.signer.to_account_info(),
                },
                &[vault_seeds], // Pass the seeds correctly as a slice of slices
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
