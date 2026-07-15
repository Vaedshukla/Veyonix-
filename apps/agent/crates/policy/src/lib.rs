//! # veyonix-policy
//!
//! Policy management crate for the Veyonix native desktop agent.
//! Handles policy synchronisation, validation, compilation and version management.

pub mod compiler;
pub mod error;
pub mod models;
pub mod store;
pub mod sync;
pub mod validator;

pub use compiler::compile;
pub use error::PolicyError;
pub use models::{EffectivePolicy, StoredVersion};
pub use store::PolicyStore;
pub use sync::{PolicySyncOutcome, PolicySyncer};
pub use validator::validate;
