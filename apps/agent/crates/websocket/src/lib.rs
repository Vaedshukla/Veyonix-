//! `veyonix-websocket` — WebSocket client crate for the Veyonix agent.
//!
//! Provides:
//! - [`message::WireMessage`] / [`message::MsgType`] — the on-wire protocol types.
//! - [`connection::connect_and_run`] — connect and pump messages from a single session.
//! - [`reconnect::run_with_reconnect`] — resilient connection with exponential back-off.
//! - [`error::WsError`] — typed error enum.

pub mod connection;
pub mod error;
pub mod message;
pub mod reconnect;

// Convenience re-exports for downstream crates.
pub use connection::{connect_and_run, WsConnection};
pub use error::WsError;
pub use message::{MsgType, WireMessage};
pub use reconnect::{run_with_reconnect, ReconnectPolicy};
