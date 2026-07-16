//! `veyonix-enforcement-website` — domain blocking via the OS hosts file.
//!
//! # How it works
//!
//! The enforcer maintains a *managed block* inside the hosts file delimited by:
//!
//! ```text
//! # --- VEYONIX-MANAGED BEGIN ---
//! 0.0.0.0 blocked-domain.com
//! 0.0.0.0 www.blocked-domain.com
//! # --- VEYONIX-MANAGED END ---
//! ```
//!
//! On every `apply`, the old block is replaced atomically (write-to-temp then
//! rename) so the file is never left in a corrupt state.  On `rollback`, the
//! managed block is removed entirely.
//!
//! # Privileges
//!
//! The hosts file is `%SystemRoot%\System32\drivers\etc\hosts` on Windows.
//! Writing to it requires elevated (Administrator) privileges.  The agent
//! *must* run as a Windows Service with `LocalSystem` or `Administrator` rights.

pub mod enforcer;
pub mod hosts;
pub mod rule;

pub use enforcer::WebsiteFilterEnforcer;
