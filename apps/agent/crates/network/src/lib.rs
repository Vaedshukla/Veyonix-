//! `veyonix-network` — HTTP API client for the Veyonix management server.
//!
//! Provides:
//! - Device enrolment
//! - HMAC challenge-response authentication
//! - JWT bearer-token management (thread-safe via `Arc<RwLock>`)
//! - Heartbeat / keep-alive
//! - Policy synchronisation with ETag-based conditional GET
//! - Transparent exponential-backoff retry on transient failures

pub mod client;
pub mod error;
pub mod models;
pub mod retry;

pub use client::ApiClient;
pub use error::NetworkError;
pub use models::{AuthResponse, ChallengeResponse, EnrollResponse, PolicySyncResult};
