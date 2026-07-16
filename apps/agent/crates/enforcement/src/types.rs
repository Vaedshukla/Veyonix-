//! Shared types for the enforcement system.

use serde::{Deserialize, Serialize};

/// A single policy rule extracted from the compiled effective policy.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyRule {
    /// Unique identifier for this rule (matches backend `rule_id`).
    pub id: String,
    /// The module this rule targets (e.g., `"website_filter"`, `"app_block"`).
    pub module: String,
    /// Module-specific payload, opaque to the engine.
    pub payload: serde_json::Value,
    /// Whether this rule is currently enabled.
    pub enabled: bool,
}

/// Context passed to every enforcer on each `apply` call.
#[derive(Debug, Clone)]
pub struct EnforcementContext {
    /// All rules from the active effective policy, pre-filtered to this module.
    pub rules: Vec<PolicyRule>,
    /// The device identifier (for audit logging).
    pub device_id: String,
    /// The policy version that produced these rules.
    pub policy_version: u64,
}

/// Outcome reported by an enforcer after a successful `apply`.
#[derive(Debug, Clone)]
pub struct EnforcementResult {
    /// Number of rules that were applied / changed.
    pub rules_applied: usize,
    /// Number of rules that were removed (because they were disabled or absent).
    pub rules_removed: usize,
    /// Optional human-readable summary for logging.
    pub summary: Option<String>,
}

impl EnforcementResult {
    pub fn no_change() -> Self {
        Self {
            rules_applied: 0,
            rules_removed: 0,
            summary: Some("no change".into()),
        }
    }
}
