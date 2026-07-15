use serde_json::json;
use crate::models::{TelemetryEvent, TelemetryType};

pub struct SystemCollector;

impl SystemCollector {
    pub fn collect_cpu() -> TelemetryEvent {
        let payload = json!({
            "usage_percent": 12.5,
            "core_count": 8,
        });
        TelemetryEvent::new(TelemetryType::Cpu, payload)
    }

    pub fn collect_memory() -> TelemetryEvent {
        let payload = json!({
            "total_bytes": 17179869184_u64,
            "used_bytes": 8589934592_u64,
        });
        TelemetryEvent::new(TelemetryType::Memory, payload)
    }
}
