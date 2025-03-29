use anchor_lang::prelude::*;

// TODO: make it efficient using zerocopy

/// Represents the current status of a prediction market
#[derive(AnchorDeserialize, AnchorSerialize, Clone, Default, InitSpace, PartialEq, Eq)]
pub enum MarketStatus {
    /// Market is active and accepting bets (default state)
    #[default]
    Open = 0x001,
    /// Market is closed and no longer accepting bets, ready for settlement
    Closed = 0x000,
}

#[account]
#[derive(Default, InitSpace)]
/// Main account that stores core information about a prediction market
pub struct Market {
    /// Description of the market question
    /// This is used as part of the PDA seed for the market account
    #[max_len(0x200)]
    pub description: String,
    /// Current status of the market (Open or Closed)
    pub status: MarketStatus,
    /// Final outcome of the market (true for Yes, false for No)
    /// This is set when the market is settled
    pub answer: bool,
    /// Public key of the account that created this market
    pub initializer: Pubkey,
}

#[account]
#[derive(Default, InitSpace)]
/// Account that stores financial information about a prediction market
/// PDA derived from "market_metadata" and the market account's public key
pub struct MarketMetadata {
    /// Total SOL invested in YES positions (in lamports)
    pub total_yes_assets: u64,
    /// Total SOL invested in NO positions (in lamports)
    pub total_no_assets: u64,
    /// Total number of YES shares issued to participants
    pub total_yes_shares: u64,
    /// Total number of NO shares issued to participants
    pub total_no_shares: u64,
    /// Total SOL in the rewards pool to be distributed to winners (in lamports)
    pub total_rewards: u64,
}

#[account]
#[derive(Default, InitSpace)]
/// Account that tracks a user's position in a specific market
/// PDA derived from "market_voter", the voter's public key, and the market account's public key
pub struct MarketVoter {
    /// Amount of SOL (in lamports) that the user has invested
    pub amount: u64,
    /// The user's prediction (true = YES, false = NO)
    pub vote: bool,
}
