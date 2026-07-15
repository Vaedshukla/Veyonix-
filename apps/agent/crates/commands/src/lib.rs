//! `veyonix-commands` — command routing and execution crate for the Veyonix agent.
//!
//! Provides:
//! - [`types::Command`] — all commands the backend can issue.
//! - [`types::CommandResult`] — the typed outcome of executing a command.
//! - [`dispatcher::dispatch`] — routes a command to the appropriate handler.
//! - [`handlers`] — individual async handler stubs, one per command category.

pub mod dispatcher;
pub mod handlers;
pub mod types;

// Convenience re-exports for downstream crates.
pub use dispatcher::dispatch;
pub use types::{Command, CommandResult};
