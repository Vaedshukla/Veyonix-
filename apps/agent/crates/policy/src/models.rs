use serde::{Deserialize, Serialize};

/// The compiled, effective policy that is applied to the agent at runtime.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EffectivePolicy {
    /// Monotonically increasing policy version derived from the highest layer version.
    pub version: u64,
    /// SHA-256 hex digest of the deterministically serialised merged configuration.
    pub hash: String,
    /// The fully merged configuration object.
    pub configuration: serde_json::Value,
}

/// A single raw policy version as stored in the version history ring-buffer.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredVersion {
    /// Version number extracted from the policy payload.
    pub version: u64,
    /// The raw configuration object for this layer.
    pub configuration: serde_json::Value,
    /// ISO-8601 timestamp recording when this version was ingested.
    pub stored_at: String,
}
