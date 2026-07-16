//! Focus Mode policy rule deserialization.

use serde::{Deserialize, Serialize};

/// A single `focus_mode` policy rule payload.
///
/// All time values are in **local device time** using 24-hour `HH:MM` format.
///
/// ```json
/// {
///   "start_time":          "08:00",
///   "end_time":            "15:30",
///   "allow_weekends":      false,
///   "blocked_domains":     ["youtube.com", "reddit.com"],
///   "blocked_executables": ["steam.exe", "discord.exe"]
/// }
/// ```
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FocusModeRule {
    /// 24-hour start of the focus window, e.g. `"08:00"`.
    pub start_time: String,

    /// 24-hour end of the focus window, e.g. `"15:30"`.
    pub end_time: String,

    /// Whether the focus window is active on Saturdays and Sundays.
    /// Defaults to `false` (weekdays only).
    #[serde(default)]
    pub allow_weekends: bool,

    /// Domains to block during focus time (bare, no `www.` prefix needed).
    #[serde(default)]
    pub blocked_domains: Vec<String>,

    /// Executable names to kill during focus time (e.g. `"steam.exe"`).
    #[serde(default)]
    pub blocked_executables: Vec<String>,
}

impl FocusModeRule {
    /// Validate that `start_time` and `end_time` are parseable `HH:MM` strings.
    pub fn is_valid(&self) -> bool {
        parse_hhmm(&self.start_time).is_some() && parse_hhmm(&self.end_time).is_some()
    }
}

/// Parse a `"HH:MM"` string into `(hour, minute)`.  Returns `None` on failure.
pub fn parse_hhmm(s: &str) -> Option<(u32, u32)> {
    let mut parts = s.splitn(2, ':');
    let h: u32 = parts.next()?.parse().ok()?;
    let m: u32 = parts.next()?.parse().ok()?;
    if h > 23 || m > 59 {
        return None;
    }
    Some((h, m))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_rule() -> FocusModeRule {
        FocusModeRule {
            start_time: "08:00".into(),
            end_time: "15:30".into(),
            allow_weekends: false,
            blocked_domains: vec!["youtube.com".into()],
            blocked_executables: vec!["steam.exe".into()],
        }
    }

    #[test]
    fn deserialise_full_rule() {
        let json = r#"{
            "start_time": "08:00",
            "end_time": "15:30",
            "allow_weekends": false,
            "blocked_domains": ["youtube.com"],
            "blocked_executables": ["steam.exe"]
        }"#;
        let rule: FocusModeRule = serde_json::from_str(json).unwrap();
        assert_eq!(rule.start_time, "08:00");
        assert_eq!(rule.end_time, "15:30");
        assert!(!rule.allow_weekends);
        assert_eq!(rule.blocked_domains, vec!["youtube.com"]);
        assert_eq!(rule.blocked_executables, vec!["steam.exe"]);
    }

    #[test]
    fn deserialise_minimal_rule_defaults() {
        // Optional fields should default to false / empty
        let json = r#"{"start_time": "09:00", "end_time": "17:00"}"#;
        let rule: FocusModeRule = serde_json::from_str(json).unwrap();
        assert!(!rule.allow_weekends);
        assert!(rule.blocked_domains.is_empty());
        assert!(rule.blocked_executables.is_empty());
    }

    #[test]
    fn is_valid_with_good_times() {
        assert!(sample_rule().is_valid());
    }

    #[test]
    fn is_invalid_with_bad_start() {
        let mut r = sample_rule();
        r.start_time = "25:00".into();
        assert!(!r.is_valid());
    }

    #[test]
    fn is_invalid_with_bad_end() {
        let mut r = sample_rule();
        r.end_time = "not-a-time".into();
        assert!(!r.is_valid());
    }

    #[test]
    fn parse_hhmm_valid() {
        assert_eq!(parse_hhmm("08:00"), Some((8, 0)));
        assert_eq!(parse_hhmm("23:59"), Some((23, 59)));
        assert_eq!(parse_hhmm("00:00"), Some((0, 0)));
    }

    #[test]
    fn parse_hhmm_invalid() {
        assert_eq!(parse_hhmm("25:00"), None);
        assert_eq!(parse_hhmm("12:60"), None);
        assert_eq!(parse_hhmm("abc"), None);
        assert_eq!(parse_hhmm(""), None);
    }

    #[test]
    fn serialise_roundtrip() {
        let rule = sample_rule();
        let json = serde_json::to_string(&rule).unwrap();
        let back: FocusModeRule = serde_json::from_str(&json).unwrap();
        assert_eq!(back, rule);
    }
}
