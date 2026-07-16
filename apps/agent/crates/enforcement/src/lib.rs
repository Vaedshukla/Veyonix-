//! `veyonix-enforcement` — the core enforcement trait and engine.
//!
//! Every enforcement module (website filter, app blocker, USB lock, etc.)
//! implements the [`Enforcer`] trait.  The [`EnforcementEngine`] holds a
//! registry of enabled enforcers and applies them whenever the active policy
//! changes.

pub mod engine;
pub mod error;
pub mod types;

pub use engine::EnforcementEngine;
pub use error::EnforcementError;
pub use types::{EnforcementContext, EnforcementResult, PolicyRule};

/// Core trait that every enforcement module must implement.
///
/// Each implementation is responsible for a single capability
/// (e.g., website filtering, app blocking).  The engine calls
/// [`Enforcer::apply`] with the full set of rules relevant to that module
/// and expects it to reconcile the current OS state accordingly.
#[async_trait::async_trait]
pub trait Enforcer: Send + Sync {
    /// Human-readable name for logging and debugging.
    fn name(&self) -> &'static str;

    /// Apply the given rules to the operating system.
    ///
    /// The implementation must be *idempotent* — calling apply with the same
    /// rules twice must leave the system in the same state.
    async fn apply(&self, ctx: &EnforcementContext) -> Result<EnforcementResult, EnforcementError>;

    /// Remove all restrictions imposed by this enforcer.
    ///
    /// Called on policy rollback or agent shutdown.
    async fn rollback(&self) -> Result<(), EnforcementError>;
}
