//! [`EnforcementEngine`] — owns all registered enforcers and drives policy application.

use std::collections::HashMap;
use std::sync::Arc;

use tracing::{error, info, warn};

use crate::{EnforcementContext, EnforcementError, EnforcementResult, Enforcer, PolicyRule};

/// Central registry and dispatcher for all enforcement modules.
///
/// Usage:
/// ```rust,ignore
/// let engine = EnforcementEngine::new();
/// engine.register(Arc::new(WebsiteFilterEnforcer::new()));
/// engine.register(Arc::new(AppBlockEnforcer::new()));
/// engine.apply_policy(&ctx).await?;
/// ```
pub struct EnforcementEngine {
    enforcers: Vec<Arc<dyn Enforcer>>,
}

impl EnforcementEngine {
    /// Create a new, empty engine.
    pub fn new() -> Self {
        Self {
            enforcers: Vec::new(),
        }
    }

    /// Register an enforcement module.
    pub fn register(&mut self, enforcer: Arc<dyn Enforcer>) {
        info!(module = enforcer.name(), "registered enforcement module");
        self.enforcers.push(enforcer);
    }

    /// Apply all rules from the effective policy.
    ///
    /// Rules are grouped by `module` and dispatched to the matching enforcer.
    /// Errors from individual enforcers are logged but do not abort other
    /// enforcers — the agent continues operating.
    pub async fn apply_policy(
        &self,
        all_rules: &[PolicyRule],
        device_id: &str,
        policy_version: u64,
    ) -> HashMap<&'static str, Result<EnforcementResult, EnforcementError>> {
        let mut results = HashMap::new();

        for enforcer in &self.enforcers {
            let module_name = enforcer.name();
            let rules: Vec<PolicyRule> = all_rules
                .iter()
                .filter(|r| r.module == module_name)
                .cloned()
                .collect();

            let ctx = EnforcementContext {
                rules,
                device_id: device_id.to_string(),
                policy_version,
            };

            info!(
                module = module_name,
                rule_count = ctx.rules.len(),
                "applying enforcement module"
            );

            let result = enforcer.apply(&ctx).await;

            match &result {
                Ok(r) => info!(
                    module = module_name,
                    applied = r.rules_applied,
                    removed = r.rules_removed,
                    summary = ?r.summary,
                    "enforcement applied"
                ),
                Err(e) => error!(
                    module = module_name,
                    error = %e,
                    "enforcement module failed"
                ),
            }

            results.insert(module_name, result);
        }

        results
    }

    /// Roll back all enforcers.  Called on shutdown or full policy removal.
    pub async fn rollback_all(&self) {
        for enforcer in &self.enforcers {
            let name = enforcer.name();
            match enforcer.rollback().await {
                Ok(()) => info!(module = name, "rollback complete"),
                Err(e) => warn!(module = name, error = %e, "rollback failed"),
            }
        }
    }
}

impl Default for EnforcementEngine {
    fn default() -> Self {
        Self::new()
    }
}
