use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TelemetryType {
    Cpu,
    Memory,
    Disk,
    Network,
    Battery,
    Gpu,
    Window,
    Application,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelemetryEvent {
    pub id: String,
    pub event_type: TelemetryType,
    pub timestamp_ms: i64,
    pub payload: serde_json::Value,
}

impl TelemetryEvent {
    pub fn new(event_type: TelemetryType, payload: serde_json::Value) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            event_type,
            timestamp_ms: Utc::now().timestamp_millis(),
            payload,
        }
    }
}
