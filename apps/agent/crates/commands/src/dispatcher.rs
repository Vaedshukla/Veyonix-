use tracing::info;

use crate::{
    handlers,
    types::{Command, CommandResult},
};

/// Routes a [`Command`] to the appropriate handler and returns the result.
///
/// Every dispatch is logged at `INFO` level before the handler is called, so
/// the audit trail in the agent logs always reflects what the server asked for,
/// even when a handler itself is a stub.
pub async fn dispatch(cmd: Command) -> CommandResult {
    info!(command = ?cmd, "dispatching command");

    match cmd {
        Command::SyncPolicy => handlers::handle_sync_policy().await,

        Command::RefreshCertificate => {
            info!("Refreshing certificate (stub)...");
            CommandResult::Success {
                message: "Certificate refresh initiated (stub)".to_string(),
            }
        }

        Command::RestartAgent => handlers::handle_restart_agent().await,

        Command::ShutdownAgent => handlers::handle_shutdown_agent().await,

        Command::EnableFocusMode { duration_secs } => {
            handlers::handle_enable_focus_mode(duration_secs).await
        }

        Command::DisableFocusMode => handlers::handle_disable_focus_mode().await,

        Command::CollectDiagnostics => handlers::handle_collect_diagnostics().await,

        Command::Ping => {
            info!("Received Ping — responding with Pong (stub)");
            CommandResult::Success {
                message: "Pong".to_string(),
            }
        }

        Command::UpdateConfiguration(config) => {
            info!(config = ?config, "Updating configuration (stub)...");
            CommandResult::Success {
                message: "Configuration updated (stub)".to_string(),
            }
        }
    }
}
