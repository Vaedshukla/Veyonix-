use std::sync::Arc;
use thiserror::Error;
use tracing::debug;
use veyonix_network::{ApiClient, NetworkError};

#[derive(Debug, Error)]
pub enum HeartbeatError {
    #[error("Network error: {0}")]
    Network(#[from] NetworkError),
}

#[derive(Clone)]
pub struct HeartbeatSender {
    api: Arc<ApiClient>,
    device_id: String,
}

impl HeartbeatSender {
    pub fn new(api: Arc<ApiClient>, device_id: String) -> Self {
        Self { api, device_id }
    }

    pub async fn send_ping(
        &self,
        status: &str,
        policy_hash: Option<&str>,
    ) -> Result<(), HeartbeatError> {
        self.api
            .heartbeat(&self.device_id, status, policy_hash)
            .await?;
        
        debug!("Heartbeat sent successfully");
        Ok(())
    }
}
