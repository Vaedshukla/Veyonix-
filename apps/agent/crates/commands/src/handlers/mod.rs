//! Handler sub-modules for all supported [`crate::types::Command`] variants.

pub mod diagnostics;
pub mod focus_mode;
pub mod restart;
pub mod sync_policy;

// Convenience re-exports so callers only need `handlers::*`.
pub use diagnostics::handle_collect_diagnostics;
pub use focus_mode::{handle_disable_focus_mode, handle_enable_focus_mode};
pub use restart::{handle_restart_agent, handle_shutdown_agent};
pub use sync_policy::handle_sync_policy;
