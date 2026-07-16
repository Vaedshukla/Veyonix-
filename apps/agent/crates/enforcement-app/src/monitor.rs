//! Background process monitor that kills blocked executables.

use std::collections::HashSet;
use std::sync::{Arc, RwLock};
use std::time::Duration;

use tracing::{debug, info, warn};

/// Start the background monitor task.
///
/// Returns a clone of the shared blocked-set that the enforcer can update
/// at runtime without interrupting the monitor.
pub fn start_monitor(
    blocked: Arc<RwLock<HashSet<String>>>,
    poll_interval_secs: u64,
) -> tokio::task::JoinHandle<()> {
    tokio::spawn(async move {
        let interval = Duration::from_secs(poll_interval_secs);
        let mut ticker = tokio::time::interval(interval);
        ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

        loop {
            ticker.tick().await;

            let blocked_set = {
                let guard = blocked.read().unwrap_or_else(|e| e.into_inner());
                guard.clone()
            };

            if blocked_set.is_empty() {
                debug!("app_block: no blocked executables, skipping poll");
                continue;
            }

            kill_blocked_processes(&blocked_set);
        }
    })
}

/// Scan running processes and kill any whose name is in `blocked`.
#[cfg(windows)]
fn kill_blocked_processes(blocked: &HashSet<String>) {
    use sysinfo::{ProcessesToUpdate, System};

    let mut sys = System::new();
    sys.refresh_processes(ProcessesToUpdate::All, true);

    for (pid, process) in sys.processes() {
        let exe_name = process
            .exe()
            .and_then(|p| p.file_name())
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_lowercase();

        if blocked.contains(&exe_name) {
            info!(
                pid = %pid,
                exe = %exe_name,
                "app_block: killing blocked process"
            );
            if !process.kill() {
                warn!(pid = %pid, exe = %exe_name, "app_block: failed to kill process");
            }
        }
    }
}

#[cfg(not(windows))]
fn kill_blocked_processes(blocked: &HashSet<String>) {
    // Cross-platform stub using sysinfo without Windows-specific imports
    debug!("app_block: kill_blocked_processes called on non-Windows (stub)");
    for name in blocked {
        debug!("app_block: would kill processes matching '{}'", name);
    }
}
