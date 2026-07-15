use serde::{Deserialize, Serialize};

/// A wire-level message exchanged over the WebSocket connection.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WireMessage {
    /// UUID v4 uniquely identifying this message.
    pub id: String,
    /// The type / intent of the message.
    pub msg_type: MsgType,
    /// Unix epoch milliseconds at which the message was created.
    pub timestamp_ms: i64,
    /// Arbitrary JSON payload; schema depends on `msg_type`.
    pub payload: serde_json::Value,
}

/// Discriminator for message routing.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum MsgType {
    Command,
    PolicyInvalidated,
    Ack,
    Ping,
    Pong,
}
