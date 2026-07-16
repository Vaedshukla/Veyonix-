//! `veyonix-enforcement-focus` — time-window-based Focus Mode enforcement.
//!
//! # What it does
//!
//! Focus Mode enforces a set of restrictions (website blocks, app blocks) only
//! during configured *focus windows* (e.g. school hours 08:00–15:30 on
//! weekdays).  Outside those windows every restriction is automatically lifted.
//!
//! # Architecture
//!
//! ```text
//! FocusModeEnforcer
//!   ├── apply()  → stores rules in shared state
//!   └── background task (60s tick)
//!         ├── in focus window  → WebsiteFilterEnforcer::apply()
//!         │                    → AppBlockEnforcer::apply()
//!         └── outside window  → WebsiteFilterEnforcer::rollback()
//!                             → AppBlockEnforcer::rollback()
//! ```
//!
//! The enforcer *delegates* to the existing `WebsiteFilterEnforcer` and
//! `AppBlockEnforcer` internally — no duplication of OS-level logic.
//!
//! # Policy rule shape
//!
//! ```json
//! {
//!   "start_time":          "08:00",
//!   "end_time":            "15:30",
//!   "allow_weekends":      false,
//!   "blocked_domains":     ["youtube.com", "reddit.com", "tiktok.com"],
//!   "blocked_executables": ["steam.exe", "discord.exe", "epic.exe"]
//! }
//! ```

pub mod enforcer;
pub mod rule;
pub mod schedule;

pub use enforcer::FocusModeEnforcer;
