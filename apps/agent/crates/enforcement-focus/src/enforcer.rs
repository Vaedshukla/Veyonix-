//! [`FocusModeEnforcer`] — time-window-based policy enforcement.

use std::sync::{Arc, RwLock};
use std::time::Duration;

use tracing::{debug, info, warn};

use veyonix_enforcement::{
    EnforcementContext, EnforcementError, EnforcementResult, Enforcer, PolicyRule,
};
use veyonix_enforcement_app::AppBlockEnforcer;
use veyonix_enforcement_website::WebsiteFilterEnforcer;

use crate::rule::FocusModeRule;
use crate::schedule::is_focus_active;

// How often the background task checks whether focus mode should be on/off.
const POLL_INTERVAL_SECS: u64 = 60;

// ---------------------------------------------------------------------------
// Shared state between apply() and the background task
// ---------------------------------------------------------------------------

#[derive(Clone, Default)]
struct FocusState {
    /// Parsed, enabled rules from the latest apply() call.
    rules: Vec<FocusModeRule>,
    /// Whether restrictions are currently enforced.
    currently_active: bool,
}

// ---------------------------------------------------------------------------
// FocusModeEnforcer
// ---------------------------------------------------------------------------

/// Enforcer that applies website and app restrictions **only** during
/// configured time windows, using delegation to existing sub-enforcers.
pub struct FocusModeEnforcer {
    state: Arc<RwLock<FocusState>>,
    website: Arc<WebsiteFilterEnforcer>,
    app: Arc<AppBlockEnforcer>,
    _monitor: tokio::task::JoinHandle<()>,
}

impl FocusModeEnforcer {
    pub fn new() -> Self {
        let state: Arc<RwLock<FocusState>> = Arc::new(RwLock::new(FocusState::default()));
        let website = Arc::new(WebsiteFilterEnforcer::new());
        let app = Arc::new(AppBlockEnforcer::new());

        let monitor = Self::spawn_monitor(
            Arc::clone(&state),
            Arc::clone(&website),
            Arc::clone(&app),
        );

        Self {
            state,
            website,
            app,
            _monitor: monitor,
        }
    }

    /// Spawn the background tick task.
    fn spawn_monitor(
        state: Arc<RwLock<FocusState>>,
        website: Arc<WebsiteFilterEnforcer>,
        app: Arc<AppBlockEnforcer>,
    ) -> tokio::task::JoinHandle<()> {
        tokio::spawn(async move {
            let mut ticker = tokio::time::interval(Duration::from_secs(POLL_INTERVAL_SECS));
            ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

            loop {
                ticker.tick().await;

                // Snapshot current rules under a short read lock.
                let (rules, currently_active) = {
                    let guard = state.read().unwrap_or_else(|e| e.into_inner());
                    (guard.rules.clone(), guard.currently_active)
                };

                if rules.is_empty() {
                    debug!("focus_mode: no rules configured, monitor idle");
                    continue;
                }

                // Determine if *any* rule wants focus active right now.
                let should_be_active = rules.iter().any(|r| is_focus_active(r));

                if should_be_active == currently_active {
                    debug!(active = currently_active, "focus_mode: state unchanged");
                    continue;
                }

                if should_be_active {
                    info!("focus_mode: window opened — applying restrictions");
                    // Build synthetic contexts for the delegate enforcers.
                    let w_ctx = build_website_ctx(&rules);
                    let a_ctx = build_app_ctx(&rules);

                    if let Err(e) = website.apply(&w_ctx).await {
                        warn!(error = %e, "focus_mode: website enforcer failed");
                    }
                    if let Err(e) = app.apply(&a_ctx).await {
                        warn!(error = %e, "focus_mode: app enforcer failed");
                    }
                } else {
                    info!("focus_mode: window closed — lifting restrictions");
                    if let Err(e) = website.rollback().await {
                        warn!(error = %e, "focus_mode: website rollback failed");
                    }
                    if let Err(e) = app.rollback().await {
                        warn!(error = %e, "focus_mode: app rollback failed");
                    }
                }

                // Update state flag.
                {
                    let mut guard = state.write().unwrap_or_else(|e| e.into_inner());
                    guard.currently_active = should_be_active;
                }
            }
        })
    }
}

impl Default for FocusModeEnforcer {
    fn default() -> Self {
        Self::new()
    }
}

// ---------------------------------------------------------------------------
// Enforcer trait implementation
// ---------------------------------------------------------------------------

#[async_trait::async_trait]
impl Enforcer for FocusModeEnforcer {
    fn name(&self) -> &'static str {
        "focus_mode"
    }

    async fn apply(&self, ctx: &EnforcementContext) -> Result<EnforcementResult, EnforcementError> {
        // Parse all enabled rules.
        let mut rules: Vec<FocusModeRule> = Vec::new();
        for rule in ctx.rules.iter().filter(|r| r.enabled) {
            match serde_json::from_value::<FocusModeRule>(rule.payload.clone()) {
                Ok(r) if r.is_valid() => rules.push(r),
                Ok(_) => warn!(rule_id = %rule.id, "focus_mode: rule has invalid time format — skipping"),
                Err(e) => warn!(rule_id = %rule.id, error = %e, "focus_mode: failed to parse rule — skipping"),
            }
        }

        let count = rules.len();

        // Store updated rules; the background task picks them up on next tick.
        {
            let mut guard = self.state.write().unwrap_or_else(|e| e.into_inner());
            guard.rules = rules.clone();
        }

        // Also do an immediate check so there's no up-to-60s delay after policy push.
        let should_be_active = rules.iter().any(|r| is_focus_active(r));
        if should_be_active {
            info!(
                device_id = %ctx.device_id,
                policy_version = ctx.policy_version,
                "focus_mode: currently inside window — applying immediately"
            );
            let w_ctx = build_website_ctx(&rules);
            let a_ctx = build_app_ctx(&rules);
            let _ = self.website.apply(&w_ctx).await;
            let _ = self.app.apply(&a_ctx).await;

            let mut guard = self.state.write().unwrap_or_else(|e| e.into_inner());
            guard.currently_active = true;
        } else {
            info!(
                device_id = %ctx.device_id,
                policy_version = ctx.policy_version,
                "focus_mode: currently outside window — no immediate action"
            );
        }

        Ok(EnforcementResult {
            rules_applied: count,
            rules_removed: 0,
            summary: Some(format!(
                "{} focus rule(s) loaded; currently {}",
                count,
                if should_be_active { "active" } else { "inactive" }
            )),
        })
    }

    async fn rollback(&self) -> Result<(), EnforcementError> {
        {
            let mut guard = self.state.write().unwrap_or_else(|e| e.into_inner());
            guard.rules.clear();
            guard.currently_active = false;
        }
        self.website.rollback().await?;
        self.app.rollback().await?;
        info!("focus_mode: rollback complete — all focus restrictions lifted");
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Helpers to build synthetic EnforcementContext for delegate enforcers
// ---------------------------------------------------------------------------

fn build_website_ctx(rules: &[FocusModeRule]) -> EnforcementContext {
    let domains: Vec<String> = rules
        .iter()
        .flat_map(|r| r.blocked_domains.iter().cloned())
        .collect();

    let payload = serde_json::json!({
        "domains": domains,
        "also_block_www": true
    });

    EnforcementContext {
        device_id: "focus_mode_delegate".into(),
        policy_version: 0,
        rules: vec![PolicyRule {
            id: "focus_mode_website".into(),
            module: "website_filter".into(),
            enabled: true,
            payload,
        }],
    }
}

fn build_app_ctx(rules: &[FocusModeRule]) -> EnforcementContext {
    let exes: Vec<String> = rules
        .iter()
        .flat_map(|r| r.blocked_executables.iter().cloned())
        .collect();

    let payload = serde_json::json!({ "blocked_executables": exes });

    EnforcementContext {
        device_id: "focus_mode_delegate".into(),
        policy_version: 0,
        rules: vec![PolicyRule {
            id: "focus_mode_app".into(),
            module: "app_block".into(),
            enabled: true,
            payload,
        }],
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use veyonix_enforcement::types::PolicyRule;

    fn make_rule_payload(start: &str, end: &str) -> serde_json::Value {
        serde_json::json!({
            "start_time": start,
            "end_time": end,
            "allow_weekends": true,
            "blocked_domains": ["youtube.com"],
            "blocked_executables": ["steam.exe"]
        })
    }

    fn make_ctx(enabled: bool, start: &str, end: &str) -> EnforcementContext {
        EnforcementContext {
            device_id: "test-device".into(),
            policy_version: 1,
            rules: vec![PolicyRule {
                id: "focus-rule-1".into(),
                module: "focus_mode".into(),
                enabled,
                payload: make_rule_payload(start, end),
            }],
        }
    }

    #[tokio::test]
    async fn apply_with_valid_rule_succeeds() {
        let enforcer = FocusModeEnforcer::new();
        // Use a window that is certainly inactive (00:00–00:01)
        let ctx = make_ctx(true, "00:00", "00:01");
        let result = enforcer.apply(&ctx).await;
        assert!(result.is_ok(), "apply should succeed with valid rule");
        let r = result.unwrap();
        assert_eq!(r.rules_applied, 1, "one rule should be registered");
    }

    #[tokio::test]
    async fn apply_with_disabled_rule_registers_zero_rules() {
        let enforcer = FocusModeEnforcer::new();
        let ctx = make_ctx(false, "08:00", "16:00");
        let result = enforcer.apply(&ctx).await.unwrap();
        assert_eq!(result.rules_applied, 0, "disabled rule must not be applied");
    }

    #[tokio::test]
    async fn apply_with_invalid_time_skips_rule() {
        let enforcer = FocusModeEnforcer::new();
        let ctx = make_ctx(true, "99:00", "16:00"); // invalid
        let result = enforcer.apply(&ctx).await.unwrap();
        assert_eq!(result.rules_applied, 0, "invalid rule should be skipped");
    }

    use std::sync::atomic::{AtomicUsize, Ordering};
    static TEST_COUNTER: AtomicUsize = AtomicUsize::new(0);

    fn setup_test_hosts() -> std::path::PathBuf {
        let count = TEST_COUNTER.fetch_add(1, Ordering::SeqCst);
        let tmp = std::env::temp_dir().join(format!("veyonix_test_hosts_focus_{}", count));
        let _ = std::fs::write(&tmp, "127.0.0.1 localhost\n::1 localhost");
        std::env::set_var("VEYONIX_TEST_HOSTS_PATH", &tmp);
        tmp
    }

    #[tokio::test]
    async fn rollback_clears_state() {
        let tmp_path = setup_test_hosts();
        let enforcer = FocusModeEnforcer::new();
        // First apply a rule
        let ctx = make_ctx(true, "00:00", "00:01");
        enforcer.apply(&ctx).await.unwrap();
        // Then rollback
        let result = enforcer.rollback().await;
        assert!(result.is_ok(), "rollback should succeed");
        let guard = enforcer.state.read().unwrap();
        assert!(guard.rules.is_empty(), "rules should be cleared after rollback");
        assert!(!guard.currently_active, "should not be active after rollback");
        let _ = std::fs::remove_file(&tmp_path);
    }

    #[test]
    fn build_website_ctx_aggregates_domains() {
        let rules = vec![
            FocusModeRule {
                start_time: "08:00".into(),
                end_time: "16:00".into(),
                allow_weekends: false,
                blocked_domains: vec!["youtube.com".into(), "reddit.com".into()],
                blocked_executables: vec![],
            },
            FocusModeRule {
                start_time: "08:00".into(),
                end_time: "16:00".into(),
                allow_weekends: false,
                blocked_domains: vec!["tiktok.com".into()],
                blocked_executables: vec![],
            },
        ];
        let ctx = build_website_ctx(&rules);
        let payload = &ctx.rules[0].payload;
        let domains = payload["domains"].as_array().unwrap();
        assert_eq!(domains.len(), 3, "should aggregate all domains from all rules");
    }

    #[test]
    fn build_app_ctx_aggregates_executables() {
        let rules = vec![FocusModeRule {
            start_time: "08:00".into(),
            end_time: "16:00".into(),
            allow_weekends: false,
            blocked_domains: vec![],
            blocked_executables: vec!["steam.exe".into(), "discord.exe".into()],
        }];
        let ctx = build_app_ctx(&rules);
        let exes = ctx.rules[0].payload["blocked_executables"].as_array().unwrap();
        assert_eq!(exes.len(), 2);
    }
}
