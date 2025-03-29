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
    /// A human-readable message describing the event
    pub message: String,
    /// The public key of the closed market account, as a string
    pub market_id: String,
    /// The public key of the market's metadata account, as a string
    pub market_metadata_id: String,
    /// The public key of the account that closed the market, as a string
    pub initializer: String,
}
