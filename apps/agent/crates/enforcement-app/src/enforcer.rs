//! [`AppBlockEnforcer`] — kills blocked processes on a recurring poll.

use std::collections::HashSet;
use std::sync::{Arc, RwLock};

use tracing::{info, warn};

use veyonix_enforcement::{
    EnforcementContext, EnforcementError, EnforcementResult, Enforcer,
};

use crate::monitor::start_monitor;
use crate::rule::AppBlockRule;

/// Enforcer that prevents blocked executables from running by killing them.
///
/// A background `tokio` task polls the process list every
/// `POLL_INTERVAL_SECS` seconds and kills any matching process.
pub struct AppBlockEnforcer {
    /// Shared set of blocked executable names (lowercase).
    blocked: Arc<RwLock<HashSet<String>>>,
    /// Handle to the monitor task (kept alive for the lifetime of the enforcer).
    _monitor: tokio::task::JoinHandle<()>,
}

const POLL_INTERVAL_SECS: u64 = 5;

impl AppBlockEnforcer {
    pub fn new() -> Self {
        let blocked: Arc<RwLock<HashSet<String>>> = Arc::new(RwLock::new(HashSet::new()));
        let monitor = start_monitor(Arc::clone(&blocked), POLL_INTERVAL_SECS);
        Self {
            blocked,
            _monitor: monitor,
        }
    }
}

impl Default for AppBlockEnforcer {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl Enforcer for AppBlockEnforcer {
    fn name(&self) -> &'static str {
        "app_block"
    }

    async fn apply(&self, ctx: &EnforcementContext) -> Result<EnforcementResult, EnforcementError> {
        let mut new_blocked: HashSet<String> = HashSet::new();

        for rule in ctx.rules.iter().filter(|r| r.enabled) {
            match serde_json::from_value::<AppBlockRule>(rule.payload.clone()) {
                Ok(ab_rule) => {
                    for exe in &ab_rule.blocked_executables {
                        new_blocked.insert(exe.trim().to_lowercase());
                    }
                }
                Err(e) => {
                    warn!(rule_id = %rule.id, error = %e, "failed to parse app_block rule — skipping");
                }
            }
        }

        let count = new_blocked.len();

        // Update the shared blocked set (the monitor picks this up on next poll)
        {
            let mut guard = self.blocked.write().unwrap_or_else(|e| e.into_inner());
            *guard = new_blocked;
        }

        info!(
            blocked_count = count,
            device_id = %ctx.device_id,
            policy_version = ctx.policy_version,
            "app_block policy applied"
        );

        Ok(EnforcementResult {
            rules_applied: count,
            rules_removed: 0,
            summary: Some(format!("blocking {} executables", count)),
        })
    }

    async fn rollback(&self) -> Result<(), EnforcementError> {
        let mut guard = self.blocked.write().unwrap_or_else(|e| e.into_inner());
        let prev_count = guard.len();
        guard.clear();
        info!(unblocked = prev_count, "app_block: all blocks removed");
        Ok(())
    }
}
