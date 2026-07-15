use thiserror::Error;

/// Errors that can occur during WebSocket operations.
#[derive(Debug, Error)]
pub enum WsError {
    /// Failed to establish the initial connection.
    #[error("WebSocket connect error: {0}")]
    Connect(String),

    /// Failed to parse an incoming message.
    #[error("WebSocket parse error: {0}")]
    Parse(String),

    /// Failed to forward a message through the internal channel.
    #[error("WebSocket channel send error: {0}")]
    Send(String),

    /// The remote peer sent a close frame; connection terminated normally.
    #[error("WebSocket connection closed by peer")]
    Closed,
}
