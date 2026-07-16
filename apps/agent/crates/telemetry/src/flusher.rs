use std::sync::Arc;
use tracing::info;
use veyonix_network::ApiClient;

use crate::error::TelemetryError;
use crate::queue::TelemetryQueue;

#[derive(Clone)]
pub struct TelemetryFlusher {
    queue: Arc<TelemetryQueue>,
    api: Arc<ApiClient>,
}

impl TelemetryFlusher {
    pub fn new(queue: Arc<TelemetryQueue>, api: Arc<ApiClient>) -> Self {
        Self { queue, api }
    }

    pub async fn flush(&self) -> Result<usize, TelemetryError> {
        let batch = self.queue.pop_batch(100)?;
        
        if batch.is_empty() {
            return Ok(0);
        }

        // Stubbing the POST call per instructions and just logging instead.
        info!("Flushed {} telemetry events", batch.len());

        Ok(batch.len())
    }
}
