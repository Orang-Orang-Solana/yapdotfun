use anchor_client::{
    anchor_lang::{declare_program, prelude::System, Id},
    solana_sdk::{
        pubkey::Pubkey,
        signature::{read_keypair_file, Keypair},
        signer::Signer,
    },
    Client, Cluster, Program,
};
use std::{collections::HashMap, rc::Rc, sync::Arc, time::Duration};
use tokio::sync::Mutex;
use yapdotfun::types::MarketStatus;

declare_program!(yapdotfun);

struct ValidatorAgent {
    #[allow(dead_code)]
    pub keypair: Rc<Keypair>,
    pub client: Client<Rc<Keypair>>,
    pub memory: Arc<Mutex<HashMap<Pubkey, yapdotfun::accounts::Market>>>,
}

impl ValidatorAgent {
    pub fn new(keypair: Keypair) -> Self {
        let keypair = Rc::new(keypair);
        let client = Client::new(Cluster::Localnet, keypair.clone());
        Self {
            keypair,
            client,
            memory: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn program(&self) -> Program<Rc<Keypair>> {
        self.client.program(yapdotfun::ID).unwrap()
    }

    pub async fn resolve_market(&self, market_id: Pubkey, answer: bool) -> anyhow::Result<()> {
        let program = self.program();
        let market_metadata =
            Pubkey::find_program_address(&[b"market_metadata", market_id.as_ref()], &program.id())
                .0;

        program
            .request()
            .accounts(yapdotfun::client::accounts::ResolveMarket {
                market: market_id,
                market_metadata,
                validator: self.keypair.pubkey(),
                system_program: System::id(),
            })
            .args(yapdotfun::client::args::ResolveMarket { answer })
            .signer(self.keypair.as_ref())
            .send()
            .await?;

        // update memory with updated market
        let mut memory = self.memory.lock().await;
        let market = self
            .program()
            .account::<yapdotfun::accounts::Market>(market_id)
            .await?;
        memory.insert(market_id, market);

        Ok(())
    }

    pub async fn get_markets(&self) {
        let program = self.program();
        if let Ok(markets) = program
            .accounts::<yapdotfun::accounts::Market>(vec![])
            .await
        {
            self.memory.lock().await.extend(markets);
        }
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    colog::init();
    let payer = read_keypair_file("validator-agent-keypair.json").unwrap();
    let validator = Arc::new(ValidatorAgent::new(payer));

    log::info!("Validator agent started");

    loop {
        validator.get_markets().await;
        // check market expected resolution date. then resolve market if it is time or past
        let memory = validator.memory.lock().await;
        dbg!("Memory: {:?}", &memory);
        let markets = memory.clone().into_iter();
        let mut resolved_markets = 0;
        for (market_id, market) in markets {
            let timestamp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs();

            if market.expected_resolution_date.le(&timestamp) && market.resolved_at.is_none() {
                log::info!("Resolving market: {}", market_id);
                validator.resolve_market(market_id, market.answer).await?;
                resolved_markets += 1;
            }
        }
        log::info!("Resolved {} markets", resolved_markets);
        drop(memory);
        // check every 12 hours
        tokio::time::sleep(Duration::from_secs(12 * 60 * 60)).await;
    }
}
