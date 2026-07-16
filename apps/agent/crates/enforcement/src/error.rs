//! Enforcement error types.

use thiserror::Error;

#[derive(Debug, Error)]
pub enum EnforcementError {
    #[error("I/O error during enforcement: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON parse error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("permission denied — the agent requires elevated privileges to enforce: {0}")]
    PermissionDenied(String),

    #[error("enforcer '{module}' failed: {reason}")]
    ModuleFailed { module: &'static str, reason: String },

    #[error("rollback failed for '{module}': {reason}")]
    RollbackFailed { module: &'static str, reason: String },
}
