use tracing::info;

use crate::types::CommandResult;

/// Async stub — enables focus mode for an optional number of seconds.
pub async fn handle_enable_focus_mode(duration_secs: Option<u64>) -> CommandResult {
    match duration_secs {
        Some(secs) => info!(duration_secs = secs, "Enabling focus mode for fixed duration"),
        None => info!("Enabling focus mode indefinitely"),
    }
    CommandResult::Success {
        message: format!(
            "Focus mode enabled{}",
            duration_secs
                .map(|s| format!(" for {s}s"))
                .unwrap_or_default()
        ),
    }
}

/// Async stub — disables focus mode immediately.
pub async fn handle_disable_focus_mode() -> CommandResult {
    info!("Disabling focus mode");
    CommandResult::Success {
        message: "Focus mode disabled".to_string(),
    }
}
