use tracing::info;

use crate::types::CommandResult;

/// Async stub — collects and uploads diagnostic data.
///
/// In production this will gather system metrics, logs, and configuration
/// snapshots and upload them to the backend diagnostics endpoint.
pub async fn handle_collect_diagnostics() -> CommandResult {
    info!("Collecting diagnostics...");
    CommandResult::Success {
        message: "Diagnostics collected and uploaded (stub)".to_string(),
    }
}
