//! Time-window helpers for Focus Mode.
//!
//! All comparisons are done in **local device time**.

use chrono::{Datelike, Local, Timelike, Weekday};

use crate::rule::{parse_hhmm, FocusModeRule};

/// Returns `true` if the current local time falls inside the focus window
/// defined by `rule`.
///
/// # Rules
/// - If the rule fails validation (bad HH:MM), returns `false` (safe default).
/// - If today is a weekend day and `allow_weekends` is `false`, returns `false`.
/// - Otherwise returns `true` when `start_time <= now < end_time`.
pub fn is_focus_active(rule: &FocusModeRule) -> bool {
    is_focus_active_at(rule, Local::now())
}

/// Testable variant that accepts an explicit `DateTime`.
pub fn is_focus_active_at<Tz>(
    rule: &FocusModeRule,
    now: chrono::DateTime<Tz>,
) -> bool
where
    Tz: chrono::TimeZone,
{
    // Parse and validate times
    let (sh, sm) = match parse_hhmm(&rule.start_time) {
        Some(v) => v,
        None => return false,
    };
    let (eh, em) = match parse_hhmm(&rule.end_time) {
        Some(v) => v,
        None => return false,
    };

    // Reject weekends if not allowed
    if !rule.allow_weekends {
        let weekday = now.weekday();
        if weekday == Weekday::Sat || weekday == Weekday::Sun {
            return false;
        }
    }

    // Convert everything to minutes-since-midnight for easy comparison
    let start_mins = sh * 60 + sm;
    let end_mins = eh * 60 + em;
    let now_mins = now.hour() * 60 + now.minute();

    start_mins <= now_mins && now_mins < end_mins
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{FixedOffset, NaiveDate, TimeZone};

    fn rule(start: &str, end: &str, weekends: bool) -> FocusModeRule {
        FocusModeRule {
            start_time: start.into(),
            end_time: end.into(),
            allow_weekends: weekends,
            blocked_domains: vec![],
            blocked_executables: vec![],
        }
    }

    /// Build a `DateTime<FixedOffset>` for a specific weekday and time.
    /// 2024-01-15 is a Monday; 2024-01-20 is a Saturday.
    fn make_time(date: &str, time: &str) -> chrono::DateTime<FixedOffset> {
        let utc_offset = FixedOffset::east_opt(0).unwrap();
        let naive = NaiveDate::parse_from_str(date, "%Y-%m-%d")
            .unwrap()
            .and_time(
                chrono::NaiveTime::parse_from_str(time, "%H:%M:%S").unwrap(),
            );
        utc_offset.from_local_datetime(&naive).unwrap()
    }

    #[test]
    fn active_during_window_on_weekday() {
        let r = rule("08:00", "16:00", false);
        let t = make_time("2024-01-15", "10:00:00"); // Monday 10:00
        assert!(is_focus_active_at(&r, t));
    }

    #[test]
    fn inactive_before_window() {
        let r = rule("08:00", "16:00", false);
        let t = make_time("2024-01-15", "07:59:00"); // Monday 07:59
        assert!(!is_focus_active_at(&r, t));
    }

    #[test]
    fn inactive_after_window() {
        let r = rule("08:00", "16:00", false);
        let t = make_time("2024-01-15", "16:00:00"); // Exactly at end (exclusive)
        assert!(!is_focus_active_at(&r, t));
    }

    #[test]
    fn active_at_window_start() {
        let r = rule("08:00", "16:00", false);
        let t = make_time("2024-01-15", "08:00:00"); // Exactly at start (inclusive)
        assert!(is_focus_active_at(&r, t));
    }

    #[test]
    fn inactive_on_weekend_when_not_allowed() {
        let r = rule("08:00", "16:00", false);
        let t = make_time("2024-01-20", "10:00:00"); // Saturday 10:00
        assert!(!is_focus_active_at(&r, t), "must be inactive on Saturday when allow_weekends=false");
    }

    #[test]
    fn active_on_weekend_when_allowed() {
        let r = rule("08:00", "16:00", true);
        let t = make_time("2024-01-20", "10:00:00"); // Saturday 10:00
        assert!(is_focus_active_at(&r, t), "must be active on Saturday when allow_weekends=true");
    }

    #[test]
    fn invalid_start_time_returns_false() {
        let r = rule("99:00", "16:00", false);
        let t = make_time("2024-01-15", "10:00:00");
        assert!(!is_focus_active_at(&r, t));
    }

    #[test]
    fn invalid_end_time_returns_false() {
        let r = rule("08:00", "bad", false);
        let t = make_time("2024-01-15", "10:00:00");
        assert!(!is_focus_active_at(&r, t));
    }

    #[test]
    fn inactive_one_minute_past_end() {
        let r = rule("08:00", "16:00", false);
        let t = make_time("2024-01-15", "16:01:00");
        assert!(!is_focus_active_at(&r, t));
    }
}
