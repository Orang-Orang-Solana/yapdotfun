use anchor_lang::prelude::*;

/// Event emitted when a new prediction market is initialized
///
/// This event is triggered when the `initialize_market` instruction successfully
/// creates a new market and its associated metadata account.
#[event]
pub struct MarketInitializedEvent {
    /// A human-readable message describing the event
    pub message: String,
    /// The public key of the newly created market account, as a string
    pub market_id: String,
    /// The public key of the market metadata account, as a string
    pub market_metadata_id: String,
    /// The public key of the account that initialized the market, as a string
    pub initializer: String,
}

/// Event emitted when a prediction market is closed
///
/// This event is triggered when a market's status is changed from Open to Closed,
/// indicating that it is no longer accepting bets and is ready for settlement.
/// After closing, the market awaits resolution by an authorized resolver.
#[event]
pub struct MarketClosedEvent {
    /// ID of the market that was closed
    pub market_id: String,

    /// ID of the market metadata account
    pub market_metadata_id: String,

    /// Address of the user who initialized the market
    pub initializer: String,

    /// Message describing the closing action
    pub message: String,
}

#[event]
/// Event emitted when rewards are withdrawn from a market
pub struct RewardsWithdrawnEvent {
    /// ID of the market the rewards are from
    pub market_id: String,

    /// Address of the user who withdrew the rewards
    pub user: String,

    /// Amount of rewards withdrawn
    pub rewards: u64,

    /// The outcome the user bet on (YES/NO)
    pub bet: bool,
}
