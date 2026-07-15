use crate::{error::PolicyError, store::PolicyStore};
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{debug, info, warn};

/// Outcome of a single policy synchronisation attempt.
#[derive(Debug)]
pub enum PolicySyncOutcome {
    /// The server confirmed the agent is already running the latest policy.
    UpToDate,
    /// A new policy was fetched and applied successfully.
    Updated { new_hash: String },
    /// The sync attempt failed.
    Error(PolicyError),
}

/// Synchronises the agent's policy against the Veyonix cloud API.
///
/// Uses conditional GET (`If-None-Match`) to avoid redundant transfers when
/// the policy has not changed since the last successful sync.
pub struct PolicySyncer {
    device_id: String,
    current_hash: Option<String>,
    api_base_url: String,
    token: Arc<RwLock<Option<String>>>,
}

impl PolicySyncer {
    /// Creates a new [`PolicySyncer`].
    ///
    /// # Parameters
    /// * `device_id`     – Unique device identifier sent as a request header.
    /// * `api_base_url`  – Base URL of the Veyonix API, e.g. `https://api.veyonix.io`.
    /// * `token`         – Shared bearer token wrapped in an async read-write lock.
    pub fn new(
        device_id: impl Into<String>,
        api_base_url: impl Into<String>,
        token: Arc<RwLock<Option<String>>>,
    ) -> Self {
        Self {
            device_id: device_id.into(),
            current_hash: None,
            api_base_url: api_base_url.into(),
            token,
        }
    }

    /// Performs a conditional GET against `/api/v1/agent/policy`.
    ///
    /// * Returns [`PolicySyncOutcome::UpToDate`] on HTTP 304.
    /// * Returns [`PolicySyncOutcome::Updated`] on HTTP 200 after loading the
    ///   new policy into `store`.
    /// * Returns [`PolicySyncOutcome::Error`] on any failure.
    pub async fn check_and_sync(
        &mut self,
        store: &mut PolicyStore,
    ) -> Result<PolicySyncOutcome, PolicyError> {
        let url = format!("{}/api/v1/agent/policy", self.api_base_url);

        // Read the bearer token under a shared lock.
        let bearer = {
            let guard = self.token.read().await;
            guard.clone()
        };

        let bearer_value = match bearer {
            Some(t) => t,
            None => {
                return Ok(PolicySyncOutcome::Error(PolicyError::SyncFailed(
                    "no bearer token available".to_string(),
                )));
            }
        };

        // Build request; attach conditional-GET header when we have a hash.
        let client = reqwest::Client::new();
        let mut request = client
            .get(&url)
            .header("Authorization", format!("Bearer {}", bearer_value))
            .header("X-Device-ID", &self.device_id);

        if let Some(ref hash) = self.current_hash {
            debug!(hash = %hash, "attaching If-None-Match header");
            request = request.header("If-None-Match", hash.as_str());
        }

        let response = request.send().await.map_err(|e| {
            PolicyError::SyncFailed(format!("HTTP request failed: {e}"))
        })?;

        match response.status().as_u16() {
            304 => {
                debug!("policy is up-to-date (304 Not Modified)");
                Ok(PolicySyncOutcome::UpToDate)
            }
            200 => {
                let body: serde_json::Value = response.json().await.map_err(|e| {
                    PolicyError::SyncFailed(format!("failed to parse policy response body: {e}"))
                })?;

                let (_policy, new_hash) = store.load_from_json(body).map_err(|e| {
                    PolicyError::SyncFailed(format!("failed to load policy into store: {e}"))
                })?;

                info!(new_hash = %new_hash, "policy updated successfully");
                self.current_hash = Some(new_hash.clone());
                Ok(PolicySyncOutcome::Updated { new_hash })
            }
            status => {
                let body = response
                    .text()
                    .await
                    .unwrap_or_else(|_| "<unreadable>".to_string());
                warn!(status = status, body = %body, "unexpected response from policy API");
                Ok(PolicySyncOutcome::Error(PolicyError::SyncFailed(format!(
                    "unexpected HTTP status {status}: {body}"
                ))))
            }
        }
    }

    /// Returns the hash of the most recently synced policy, if any.
    pub fn current_hash(&self) -> Option<&str> {
        self.current_hash.as_deref()
    }

    /// Overrides the internal hash – useful for initialising the syncer with
    /// an already-known policy hash loaded from persistent storage.
    pub fn set_current_hash(&mut self, hash: impl Into<String>) {
        self.current_hash = Some(hash.into());
    }
}
