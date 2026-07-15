use thiserror::Error;

#[derive(Error, Debug)]
pub enum TelemetryError {
    #[error("Storage error: {0}")]
    Storage(#[from] veyonix_storage::StorageError),

    #[error("Network error: {0}")]
    Network(#[from] veyonix_network::NetworkError),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}
