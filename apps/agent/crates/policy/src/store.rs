use crate::{
    compiler::compile,
    error::PolicyError,
    models::{EffectivePolicy, StoredVersion},
    validator::validate,
};
use chrono::Utc;
use tracing::{debug, info, warn};

/// Maximum number of policy versions retained in the history ring-buffer.
const MAX_VERSIONS: usize = 3;

/// Provides in-memory storage for policy versions and the current compiled
/// [`EffectivePolicy`].
///
/// The store keeps at most [`MAX_VERSIONS`] raw versions in a FIFO queue,
/// discarding the oldest when the limit is exceeded.  This allows the agent
/// to roll back one or two policy revisions if the latest causes issues.
pub struct PolicyStore {
    versions: Vec<StoredVersion>,
    current: Option<EffectivePolicy>,
}

impl Default for PolicyStore {
    fn default() -> Self {
        Self::new()
    }
}

impl PolicyStore {
    /// Creates an empty [`PolicyStore`].
    pub fn new() -> Self {
        Self {
            versions: Vec::with_capacity(MAX_VERSIONS),
            current: None,
        }
    }

    /// Ingests a raw policy JSON payload.
    ///
    /// 1. Validates the payload schema.
    /// 2. Extracts the `version` and `configuration` fields.
    /// 3. Appends the new [`StoredVersion`] to the ring-buffer, evicting the
    ///    oldest entry when the buffer is full.
    /// 4. Re-compiles all stored layers into a new [`EffectivePolicy`].
    /// 5. Returns `(policy, hash)`.
    ///
    /// # Errors
    /// * [`PolicyError::InvalidSchema`] – payload fails validation.
    pub fn load_from_json(
        &mut self,
        json: serde_json::Value,
    ) -> Result<(EffectivePolicy, String), PolicyError> {
        validate(&json)?;

        let version = json["version"].as_u64().unwrap(); // validated above
        let configuration = json["configuration"].clone();

        let stored = StoredVersion {
            version,
            configuration,
            stored_at: Utc::now().to_rfc3339(),
        };

        // Maintain the ring-buffer: drop oldest if at capacity.
        if self.versions.len() >= MAX_VERSIONS {
            let dropped = self.versions.remove(0);
            warn!(
                dropped_version = dropped.version,
                "policy store at capacity – evicting oldest version"
            );
        }
        self.versions.push(stored);

        debug!(
            version_count = self.versions.len(),
            "compiled policy from {} layer(s)",
            self.versions.len()
        );

        let policy = compile(&self.versions);
        let hash = policy.hash.clone();

        info!(
            version = policy.version,
            hash = %hash,
            "effective policy updated"
        );

        self.current = Some(policy.clone());
        Ok((policy, hash))
    }

    /// Returns a reference to the current compiled [`EffectivePolicy`], if any.
    pub fn current(&self) -> Option<&EffectivePolicy> {
        self.current.as_ref()
    }

    /// Returns the SHA-256 hash of the current effective policy, if any.
    pub fn current_hash(&self) -> Option<&str> {
        self.current.as_ref().map(|p| p.hash.as_str())
    }

    /// Rolls back to the previous policy version by removing the most recently
    /// stored layer and recompiling the remaining layers.
    ///
    /// # Errors
    /// Returns [`PolicyError::RollbackFailed`] if there is only one (or zero)
    /// version stored – there is nothing to roll back to.
    pub fn rollback(&mut self) -> Result<(), PolicyError> {
        if self.versions.len() <= 1 {
            return Err(PolicyError::RollbackFailed(
                "no previous version available to roll back to".to_string(),
            ));
        }

        let removed = self.versions.pop().unwrap();
        warn!(
            removed_version = removed.version,
            "rolling back policy to previous version"
        );

        let policy = compile(&self.versions);
        let hash = policy.hash.clone();

        info!(
            version = policy.version,
            hash = %hash,
            "policy rolled back successfully"
        );

        self.current = Some(policy);
        Ok(())
    }

    /// Returns the number of raw policy versions currently in the store.
    pub fn version_count(&self) -> usize {
        self.versions.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn valid_payload(version: u64, extra_key: &str, extra_val: serde_json::Value) -> serde_json::Value {
        json!({
            "version": version,
            "configuration": { extra_key: extra_val }
        })
    }

    #[test]
    fn new_store_is_empty() {
        let store = PolicyStore::new();
        assert!(store.current().is_none());
        assert!(store.current_hash().is_none());
        assert_eq!(store.version_count(), 0);
    }

    #[test]
    fn load_single_version() {
        let mut store = PolicyStore::new();
        let payload = valid_payload(1, "timeout", json!(30));
        let (policy, hash) = store.load_from_json(payload).unwrap();
        assert_eq!(policy.version, 1);
        assert!(!hash.is_empty());
        assert_eq!(store.version_count(), 1);
        assert_eq!(store.current_hash(), Some(hash.as_str()));
    }

    #[test]
    fn rejects_invalid_payload() {
        let mut store = PolicyStore::new();
        let err = store.load_from_json(json!({ "bad": "payload" })).unwrap_err();
        assert!(matches!(err, PolicyError::InvalidSchema(_)));
    }

    #[test]
    fn evicts_oldest_when_at_capacity() {
        let mut store = PolicyStore::new();
        for i in 1u64..=(MAX_VERSIONS as u64 + 1) {
            store.load_from_json(valid_payload(i, "v", json!(i))).unwrap();
        }
        // Should never exceed MAX_VERSIONS.
        assert_eq!(store.version_count(), MAX_VERSIONS);
    }

    #[test]
    fn rollback_restores_previous() {
        let mut store = PolicyStore::new();
        store.load_from_json(valid_payload(1, "timeout", json!(10))).unwrap();
        let (_, hash_v2) = store.load_from_json(valid_payload(2, "timeout", json!(60))).unwrap();

        // Current should reflect v2.
        assert_eq!(store.current_hash(), Some(hash_v2.as_str()));

        // Roll back – should now reflect v1.
        store.rollback().unwrap();
        assert_eq!(store.version_count(), 1);
        assert_eq!(store.current().unwrap().configuration["timeout"], json!(10));
    }

    #[test]
    fn rollback_fails_with_single_version() {
        let mut store = PolicyStore::new();
        store.load_from_json(valid_payload(1, "k", json!("v"))).unwrap();
        let err = store.rollback().unwrap_err();
        assert!(matches!(err, PolicyError::RollbackFailed(_)));
    }

    #[test]
    fn rollback_fails_with_no_versions() {
        let mut store = PolicyStore::new();
        let err = store.rollback().unwrap_err();
        assert!(matches!(err, PolicyError::RollbackFailed(_)));
    }
}
