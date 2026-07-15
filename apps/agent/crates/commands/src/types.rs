use serde::{Deserialize, Serialize};

/// All commands that the Veyonix backend can dispatch to the agent.
///
/// Serialized with an internal `"type"` tag (snake_case) so the JSON payload
/// from the server maps cleanly onto this enum.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Command {
    /// Re-fetch and apply the latest policy document.
    SyncPolicy,
    /// Rotate / refresh the agent's TLS certificate.
    RefreshCertificate,
    /// Gracefully restart the agent process.
    RestartAgent,
    /// Gracefully shut down the agent process.
    ShutdownAgent,
    /// Enter focus mode, optionally for a fixed duration.
    EnableFocusMode {
        /// How long to stay in focus mode.  `None` means indefinite.
        duration_secs: Option<u64>,
    },
    /// Exit focus mode immediately.
    DisableFocusMode,
    /// Gather and upload diagnostic information.
    CollectDiagnostics,
    /// Health-check ping — agent should respond with Pong.
    Ping,
    /// Replace a subset of agent configuration with the provided JSON.
    UpdateConfiguration(serde_json::Value),
}

/// The outcome of executing a [`Command`].
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CommandResult {
    /// The command completed successfully.
    Success {
        /// Human-readable description of what was done.
        message: String,
    },
    /// The command failed.
    Failure {
        /// Machine-readable error code (e.g. `"timeout"`, `"permission_denied"`).
        code: String,
        /// Human-readable error description.
        message: String,
    },
}
