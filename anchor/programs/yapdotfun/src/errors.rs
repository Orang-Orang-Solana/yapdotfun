use anchor_lang::error_code;

#[error_code]
pub enum YapdotfunError {
    #[msg("Amount must be greater than 0")]
    AmountConstraintViolated,
}
