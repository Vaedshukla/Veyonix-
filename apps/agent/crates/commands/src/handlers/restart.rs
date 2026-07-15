use tracing::info;

use crate::types::CommandResult;

/// Async stub — initiates a graceful agent restart.
///
/// In production this will drain in-flight work, persist state, and then
/// exec the agent binary again (or signal the supervisor to do so).
pub async fn handle_restart_agent() -> CommandResult {
    info!("Restarting agent (stub)...");
    CommandResult::Success {
        message: "Agent restart initiated (stub)".to_string(),
    }
}

/// Async stub — initiates a graceful agent shutdown.
pub async fn handle_shutdown_agent() -> CommandResult {
    info!("Shutting down agent (stub)...");
    CommandResult::Success {
        message: "Agent shutdown initiated (stub)".to_string(),
    }
}
