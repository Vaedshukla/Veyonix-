use std::sync::{Arc, Mutex, OnceLock};
use thiserror::Error;
use tracing::debug;
use sysinfo::{System, Disks};
use veyonix_network::{ApiClient, NetworkError, models::HeartbeatRequest};

#[derive(Debug, Error)]
pub enum HeartbeatError {
    #[error("Network error: {0}")]
    Network(#[from] NetworkError),
}

static SYSTEM: OnceLock<Mutex<System>> = OnceLock::new();

fn get_system() -> &'static Mutex<System> {
    SYSTEM.get_or_init(|| Mutex::new(System::new_all()))
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
        _status: &str,
        _policy_hash: Option<&str>,
    ) -> Result<(), HeartbeatError> {
        // Collect real system stats
        let sys_mutex = get_system();
        let (cpu, mem, procs) = if let Ok(mut sys) = sys_mutex.lock() {
            sys.refresh_all();
            let cpu = Some(sys.global_cpu_usage());
            let mem = Some((sys.used_memory() as f64) / 1024.0 / 1024.0);
            let procs = Some(sys.processes()
                .values()
                .map(|p| p.name().to_string_lossy().to_string())
                .collect::<Vec<String>>());
            (cpu, mem, procs)
        } else {
            (None, None, None)
        };

        // Collect free disk space
        let disks = Disks::new_with_refreshed_list();
        let free_bytes: u64 = disks.iter().map(|d| d.available_space()).sum();
        let disk_free = Some((free_bytes as f64) / 1024.0 / 1024.0 / 1024.0);

        let body = HeartbeatRequest {
            cpu_percent: cpu,
            memory_mb: mem,
            disk_free_gb: disk_free,
            active_processes: procs,
        };

        self.api
            .heartbeat(&body)
            .await?;
        
        debug!(device_id = %self.device_id, "Heartbeat sent successfully with real system stats");
        Ok(())
    }
}
