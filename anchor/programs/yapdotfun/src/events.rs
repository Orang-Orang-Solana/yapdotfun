use anchor_lang::prelude::*;

#[event]
pub struct MarketInitializedEvent {
    pub message: String,
    pub market_id: String,
    pub market_metadata_id: String,
    pub initializer: String,
}

#[event]
pub struct MarketClosedEvent {
    pub message: String,
    pub market_id: String,
    pub market_metadata_id: String,
    pub initializer: String,
}
