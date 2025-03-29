use anchor_lang::error_code;

/// Custom error types for the Yapdotfun program
///
/// This enum defines all possible error conditions that can occur
/// during the execution of program instructions.
#[error_code]
pub enum YapdotfunError {
    /// Error returned when a user attempts to make a transaction with zero or negative amount
    ///
    /// This error is typically thrown in the buy instruction when the amount parameter
    /// is not greater than zero.
    #[msg("Amount must be greater than 0")]
    AmountConstraintViolated,

    /// Error returned when a user attempts to interact with a closed market
    ///
    /// This error is thrown when trying to perform operations on a market
    /// that has already been closed and is no longer accepting bets.
    #[msg("Market has been closed")]
    MarketClosed,

    /// Error returned when trying to resolve an open market
    ///
    /// This error occurs when attempting to resolve a market that hasn't been closed yet.
    #[msg("Market is not closed")]
    MarketNotClosed,

    /// Error returned when trying to interact with a non-existent market
    ///
    /// This error occurs when the provided market account does not exist.
    #[msg("Market doesn't exist")]
    MarketDoesNotExist,

    /// Error returned when user tries to sell more shares than they own
    ///
    /// This error occurs when a user attempts to sell more shares than their current balance.
    #[msg("Not enough shares")]
    NotEnoughShares,

    /// Error returned when non-oracle account attempts oracle operations
    ///
    /// This error occurs when an account without oracle privileges attempts to perform
    /// oracle-only operations like resolving markets.
    #[msg("Caller is not oracle")]
    NotOracle,

    /// Error returned when attempting to sell with zero shares
    ///
    /// This error occurs when a user tries to sell shares but has none in their account.
    #[msg("No shares to sell")]
    NoSharesToSell,
}
