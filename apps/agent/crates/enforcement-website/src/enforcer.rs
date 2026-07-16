//! [`WebsiteFilterEnforcer`] — implements [`Enforcer`] using the OS hosts file.

use std::collections::HashSet;

use tracing::{info, warn};

use veyonix_enforcement::{
    EnforcementContext, EnforcementError, EnforcementResult, Enforcer,
};

use crate::hosts::{hosts_path, read_unmanaged, write_with_block};
use crate::rule::WebsiteFilterRule;

/// Enforcer that blocks domains by injecting `0.0.0.0` entries into the OS
/// hosts file.
pub struct WebsiteFilterEnforcer;

impl WebsiteFilterEnforcer {
    pub fn new() -> Self {
        Self
    }
}

impl Default for WebsiteFilterEnforcer {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl Enforcer for WebsiteFilterEnforcer {
    fn name(&self) -> &'static str {
        "website_filter"
    }

    async fn apply(&self, ctx: &EnforcementContext) -> Result<EnforcementResult, EnforcementError> {
        // Collect all domains from enabled rules
        let mut domains: HashSet<String> = HashSet::new();

        for rule in ctx.rules.iter().filter(|r| r.enabled) {
            match serde_json::from_value::<WebsiteFilterRule>(rule.payload.clone()) {
                Ok(wf_rule) => {
                    for domain in &wf_rule.domains {
                        let d = domain.trim().to_lowercase();
                        if !d.is_empty() {
                            domains.insert(d.clone());
                            if wf_rule.also_block_www && !d.starts_with("www.") {
                                domains.insert(format!("www.{}", d));
                            }
                        }
                    }
                }
                Err(e) => {
                    warn!(rule_id = %rule.id, error = %e, "failed to parse website_filter rule — skipping");
                }
            }
        }

        let path = hosts_path();
        let (before, after) = read_unmanaged(&path)?;

        let mut sorted_domains: Vec<String> = domains.into_iter().collect();
        sorted_domains.sort();

        let managed_entries: Vec<String> = sorted_domains
            .iter()
            .map(|d| format!("0.0.0.0 {}", d))
            .collect();

        let rules_applied = managed_entries.len();
        write_with_block(&path, &before, &managed_entries, &after)?;

        info!(
            domains = rules_applied,
            device_id = %ctx.device_id,
            policy_version = ctx.policy_version,
            "website filter applied"
        );

        Ok(EnforcementResult {
            rules_applied,
            rules_removed: 0,
            summary: Some(format!("blocking {} domains", rules_applied)),
        })
    }

    async fn rollback(&self) -> Result<(), EnforcementError> {
        let path = hosts_path();

        // If the hosts file doesn't exist or isn't writable (e.g. in tests
        // without elevation), treat this as a no-op rather than an error.
        if !path.exists() {
            tracing::warn!(path = %path.display(), "website filter: hosts file not found during rollback — skipping");
            return Ok(());
        }

        let (before, after) = match read_unmanaged(&path) {
            Ok(v) => v,
            Err(EnforcementError::Io(ref e))
                if e.kind() == std::io::ErrorKind::PermissionDenied =>
            {
                tracing::warn!("website filter: permission denied reading hosts file during rollback — skipping");
                return Ok(());
            }
            Err(e) => return Err(e),
        };

        write_with_block(&path, &before, &[], &after)?;
        tracing::info!("website filter: hosts file block removed");
        Ok(())
    }
}
