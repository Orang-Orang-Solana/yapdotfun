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
}
