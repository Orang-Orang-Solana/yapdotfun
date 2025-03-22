mod instructions;
mod state;

use anchor_lang::prelude::*;
use instructions::*;

declare_id!("YappeTaxE8txMK7LwUuFBswCvnktievP7f3U5c5tZwB");

#[program]
pub mod yapdotfun {
    use super::*;

    pub fn initialize(ctx: Context<InitializeMarket>, description: String) -> Result<()> {
        instructions::initialize_market::handler(ctx, description)
    }
}
