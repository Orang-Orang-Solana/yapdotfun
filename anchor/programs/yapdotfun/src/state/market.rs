use anchor_lang::prelude::*;

/// Represents the current status of a prediction market
#[derive(AnchorDeserialize, AnchorSerialize, Clone, Default, InitSpace)]
pub enum MarketStatus {
    /// Market is active and accepting bets (default state)
    #[default]
    Open,
    /// Market is closed and no longer accepting bets, ready for settlement
    Closed,
}

#[account]
#[derive(Default, InitSpace)]
/// Data Account for storing Market data
pub struct Market {
    /// Short description of the market question (limited to 4 characters)
    #[max_len(4)]
    pub description: String,
    /// Current status of the market (Open or Closed)
    pub status: MarketStatus,
    /// Final outcome of the market (true for Yes, false for No)
    pub answer: bool,
    /// Public key of the account that created this market
    pub initializer: Pubkey,
    /// Public key pointing to the associated MarketMetadata account
    pub metadata: Pubkey,
}

#[account]
#[derive(Default, InitSpace)]
/// Data Account for storing Market metadata
pub struct MarketMetadata {
    /// Total SOL invested in YES positions
    pub total_yes_assets: u64,
    /// Total SOL invested in NO positions
    pub total_no_assets: u64,
    /// Total number of YES shares issued
    pub total_yes_shares: u8,
    /// Total number of NO shares issued
    pub total_no_shares: u8,
    /// Total SOL in the rewards pool to be distributed to winners
    pub total_rewards: u64,
}
