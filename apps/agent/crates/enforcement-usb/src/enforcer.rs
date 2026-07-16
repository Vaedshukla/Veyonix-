//! [`UsbBlockEnforcer`] — disables/enables the Windows USBSTOR driver via the
//! registry.

use tracing::{info, warn};

use veyonix_enforcement::{
    EnforcementContext, EnforcementError, EnforcementResult, Enforcer,
};

use crate::registry::{
    read_usbstor_start, write_usbstor_start, START_DISABLED, START_MANUAL,
};
use crate::rule::UsbBlockRule;

/// Enforcer that controls USB mass-storage access by toggling the Windows
/// `USBSTOR` service startup type via the registry.
///
/// **Idempotent:** if the current registry value already matches the desired
/// state, no write is performed and `rules_applied = 0` is returned.
pub struct UsbBlockEnforcer;

impl UsbBlockEnforcer {
    pub fn new() -> Self {
        Self
    }
}

impl Default for UsbBlockEnforcer {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl Enforcer for UsbBlockEnforcer {
    fn name(&self) -> &'static str {
        "usb_block"
    }

    async fn apply(&self, ctx: &EnforcementContext) -> Result<EnforcementResult, EnforcementError> {
        // Determine the desired state from the first *enabled* rule that has
        // `block_all: true`.  If no enabled rule requests blocking, we allow.
        let should_block = ctx
            .rules
            .iter()
            .filter(|r| r.enabled)
            .filter_map(|r| serde_json::from_value::<UsbBlockRule>(r.payload.clone()).ok())
            .any(|r| r.block_all);

        let desired_start = if should_block {
            START_DISABLED
        } else {
            START_MANUAL
        };

        // Read the current registry state so we can be idempotent.
        let current_start = read_usbstor_start().unwrap_or_else(|e| {
            warn!(error = %e, "usb_block: failed to read current USBSTOR start value — assuming manual");
            START_MANUAL
        });

        if current_start == desired_start {
            info!(
                device_id = %ctx.device_id,
                policy_version = ctx.policy_version,
                usbstor_start = desired_start,
                "usb_block: already in desired state — no change"
            );
            return Ok(EnforcementResult::no_change());
        }

        write_usbstor_start(desired_start)?;

        let action = if should_block { "blocked" } else { "allowed" };
        info!(
            device_id = %ctx.device_id,
            policy_version = ctx.policy_version,
            usbstor_start = desired_start,
            "usb_block: USB mass storage {}", action
        );

        Ok(EnforcementResult {
            rules_applied: 1,
            rules_removed: 0,
            summary: Some(format!("USB mass storage {}", action)),
        })
    }

    async fn rollback(&self) -> Result<(), EnforcementError> {
        let current = read_usbstor_start().unwrap_or(START_DISABLED);

        if current == START_MANUAL {
            info!("usb_block: rollback — already in manual-start state");
            return Ok(());
        }

        write_usbstor_start(START_MANUAL)?;
        info!("usb_block: rollback complete — USB mass storage re-enabled");
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use veyonix_enforcement::types::PolicyRule;

    fn make_ctx(block_all: bool) -> EnforcementContext {
        EnforcementContext {
            device_id: "test-device-001".into(),
            policy_version: 1,
            rules: vec![PolicyRule {
                id: "rule-1".into(),
                module: "usb_block".into(),
                enabled: true,
                payload: serde_json::json!({ "block_all": block_all }),
            }],
        }
    }

    fn make_ctx_disabled_rule() -> EnforcementContext {
        EnforcementContext {
            device_id: "test-device-002".into(),
            policy_version: 2,
            rules: vec![PolicyRule {
                id: "rule-2".into(),
                module: "usb_block".into(),
                enabled: false, // disabled rule — should NOT block
                payload: serde_json::json!({ "block_all": true }),
            }],
        }
    }

    /// On non-Windows platforms the stub registry functions are no-ops, so
    /// apply() and rollback() must still complete successfully.
    #[cfg(not(windows))]
    #[tokio::test]
    async fn apply_block_stub_succeeds() {
        let enforcer = UsbBlockEnforcer::new();
        let ctx = make_ctx(true);
        let result = enforcer.apply(&ctx).await;
        assert!(result.is_ok(), "apply with block_all=true should succeed on stub");
    }

    #[cfg(not(windows))]
    #[tokio::test]
    async fn apply_allow_stub_succeeds() {
        let enforcer = UsbBlockEnforcer::new();
        let ctx = make_ctx(false);
        let result = enforcer.apply(&ctx).await;
        assert!(result.is_ok(), "apply with block_all=false should succeed on stub");
    }

    #[cfg(not(windows))]
    #[tokio::test]
    async fn disabled_rule_does_not_block() {
        let enforcer = UsbBlockEnforcer::new();
        let ctx = make_ctx_disabled_rule();
        let result = enforcer.apply(&ctx).await.unwrap();
        // A disabled rule should result in "allow" which is a no-change
        // since the stub read always returns START_MANUAL.
        assert_eq!(result.rules_applied, 0, "disabled rule must not apply a block");
    }

    #[cfg(not(windows))]
    #[tokio::test]
    async fn rollback_stub_succeeds() {
        let enforcer = UsbBlockEnforcer::new();
        let result = enforcer.rollback().await;
        assert!(result.is_ok(), "rollback should succeed on stub");
    }
}
