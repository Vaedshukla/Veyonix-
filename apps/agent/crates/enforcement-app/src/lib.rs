//! `veyonix-enforcement-app` — application blocking via process termination.
//!
//! # How it works
//!
//! The enforcer starts a background monitor task that polls the running process
//! list every `poll_interval_secs` seconds (default: 5).  Any process whose
//! executable name matches a blocked entry is killed immediately.
//!
//! Blocked process names are stored in memory (`Arc<RwLock<HashSet<String>>>`)
//! so the `apply` method can update them without restarting the monitor.
//!
//! # Limitations (MVP)
//!
//! - Termination is best-effort; privileged processes may resist.
//! - The monitor runs inside the agent process — if the agent is killed, so
//!   is monitoring.  A kernel-mode driver would be needed for true prevention.

pub mod enforcer;
pub mod monitor;
pub mod rule;

pub use enforcer::AppBlockEnforcer;
