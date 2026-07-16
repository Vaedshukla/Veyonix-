//! Policy rule types for the `usb_block` enforcement module.

use serde::{Deserialize, Serialize};

/// Payload for a single `usb_block` policy rule.
///
/// **Backend JSON shape:**
/// ```json
/// {
///   "block_all": true
/// }
/// ```
///
/// When `block_all` is `true` the USBSTOR driver is disabled so no USB mass
/// storage device can mount.  When `false` (or when the rule is disabled /
/// absent) the driver is restored to its default manual-start state.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsbBlockRule {
    /// Block all USB mass-storage devices when `true`.
    /// Restores normal operation when `false`.
    #[serde(default)]
    pub block_all: bool,
}

impl Default for UsbBlockRule {
    fn default() -> Self {
        Self { block_all: false }
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deserialise_block_all_true() {
        let json = r#"{"block_all": true}"#;
        let rule: UsbBlockRule = serde_json::from_str(json).unwrap();
        assert!(rule.block_all);
    }

    #[test]
    fn deserialise_block_all_false() {
        let json = r#"{"block_all": false}"#;
        let rule: UsbBlockRule = serde_json::from_str(json).unwrap();
        assert!(!rule.block_all);
    }

    #[test]
    fn deserialise_missing_field_defaults_to_false() {
        let json = r#"{}"#;
        let rule: UsbBlockRule = serde_json::from_str(json).unwrap();
        assert!(!rule.block_all, "missing field should default to false");
    }

    #[test]
    fn serialise_roundtrip() {
        let rule = UsbBlockRule { block_all: true };
        let json = serde_json::to_string(&rule).unwrap();
        let back: UsbBlockRule = serde_json::from_str(&json).unwrap();
        assert_eq!(back.block_all, rule.block_all);
    }
}
