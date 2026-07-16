use std::sync::{Mutex, OnceLock};
use serde_json::json;
use sysinfo::System;

use crate::models::{TelemetryEvent, TelemetryType};

static SYSTEM: OnceLock<Mutex<System>> = OnceLock::new();

fn get_system() -> &'static Mutex<System> {
    SYSTEM.get_or_init(|| Mutex::new(System::new_all()))
}

pub struct SystemCollector;

impl SystemCollector {
    pub fn collect_cpu() -> TelemetryEvent {
        let sys_mutex = get_system();
        let payload = if let Ok(mut sys) = sys_mutex.lock() {
            sys.refresh_cpu_all();
            let usage = sys.global_cpu_usage();
            let cores = sys.cpus().len();
            json!({
                "usage_percent": usage,
                "core_count": cores,
            })
        } else {
            json!({
                "usage_percent": 0.0,
                "core_count": 0,
            })
        };
        TelemetryEvent::new(TelemetryType::Cpu, payload)
    }

    pub fn collect_memory() -> TelemetryEvent {
        let sys_mutex = get_system();
        let payload = if let Ok(mut sys) = sys_mutex.lock() {
            sys.refresh_memory();
            let total = sys.total_memory();
            let used = sys.used_memory();
            json!({
                "total_bytes": total,
                "used_bytes": used,
            })
        } else {
            json!({
                "total_bytes": 0,
                "used_bytes": 0,
            })
        };
        TelemetryEvent::new(TelemetryType::Memory, payload)
    }
}
