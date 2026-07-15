//! Error type for `veyonix-network`.

use thiserror::Error;

/// All errors that can originate from the network client.
#[derive(Debug, Error)]
pub enum NetworkError {
    /// The `reqwest` client failed to build (bad TLS config, etc.).
    #[error("failed to build HTTP client: {0}")]
    ClientBuild(#[source] reqwest::Error),

    /// A network-level transport error (connection refused, DNS, timeout…).
    #[error("transport error: {0}")]
    Transport(#[source] reqwest::Error),

    /// The server returned a non-success HTTP status code.
    #[error("server returned HTTP {status}: {body}")]
    Http { status: u16, body: String },

    /// The response body could not be decoded as the expected JSON type.
    #[error("failed to deserialise response: {0}")]
    Deserialisation(#[source] reqwest::Error),

    /// All retry attempts were exhausted.
    #[error("request failed after {attempts} attempts: {last_error}")]
    RetriesExhausted {
        attempts: u32,
        last_error: Box<NetworkError>,
    },

    /// A URL could not be constructed (bad base URL, etc.).
    #[error("invalid URL: {0}")]
    InvalidUrl(String),
}

impl NetworkError {
    /// Returns `true` if this error is likely transient and worth retrying.
    pub fn is_retryable(&self) -> bool {
        match self {
            NetworkError::Transport(_) => true,
            NetworkError::Http { status, .. } => matches!(status, 429 | 500 | 502 | 503 | 504),
            _ => false,
        }
    }
}
