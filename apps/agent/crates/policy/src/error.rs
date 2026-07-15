use thiserror::Error;

/// Errors produced by the policy crate.
#[derive(Debug, Error)]
pub enum PolicyError {
    /// The incoming payload does not conform to the expected policy schema.
    #[error("invalid schema: {0}")]
    InvalidSchema(String),

    /// A policy compilation step failed.
    #[error("compilation failed: {0}")]
    CompilationFailed(String),

    /// A network or API synchronisation failure.
    #[error("sync failed: {0}")]
    SyncFailed(String),

    /// There is no previous version to roll back to.
    #[error("rollback failed: {0}")]
    RollbackFailed(String),

    /// A JSON serialisation / deserialisation error.
    #[error("serialization failed: {0}")]
    SerializationFailed(#[from] serde_json::Error),
}
