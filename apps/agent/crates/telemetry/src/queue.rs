use std::sync::Arc;
use veyonix_storage::{namespaces, StorageEngine};

use crate::error::TelemetryError;
use crate::models::TelemetryEvent;

pub struct TelemetryQueue {
    storage: Arc<StorageEngine>,
}

impl TelemetryQueue {
    pub fn new(storage: Arc<StorageEngine>) -> Self {
        Self { storage }
    }

    pub fn push(&self, event: &TelemetryEvent) -> Result<(), TelemetryError> {
        let data = serde_json::to_vec(event)?;
        self.storage.set(namespaces::TELEMETRY_QUEUE, &event.id, &data)?;
        Ok(())
    }

    pub fn pop_batch(&self, max_items: usize) -> Result<Vec<TelemetryEvent>, TelemetryError> {
        let mut events = Vec::new();
        // Assume scan_keys exists in StorageEngine per instructions
        let keys = self.storage.scan_keys(namespaces::TELEMETRY_QUEUE)?;

        for key in keys.into_iter().take(max_items) {
            if let Some(data) = self.storage.get(namespaces::TELEMETRY_QUEUE, &key)? {
                if let Ok(event) = serde_json::from_slice::<TelemetryEvent>(&data) {
                    events.push(event);
                }
            }
            self.storage.delete(namespaces::TELEMETRY_QUEUE, &key)?;
        }

        Ok(events)
    }

    pub fn len(&self) -> Result<usize, TelemetryError> {
        // Assume scan_keys exists in StorageEngine per instructions
        let keys = self.storage.scan_keys(namespaces::TELEMETRY_QUEUE)?;
        Ok(keys.len())
    }
}
