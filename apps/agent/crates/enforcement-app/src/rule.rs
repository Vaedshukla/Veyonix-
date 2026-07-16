//! Policy rule types for the `app_block` enforcement module.

use serde::{Deserialize, Serialize};

/// Payload for a single `app_block` policy rule.
///
/// ```json
/// {
///   "blocked_executables": ["chrome.exe", "steam.exe", "discord.exe"]
/// }
/// ```
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppBlockRule {
    /// Executable file names (case-insensitive) to kill if found running.
    /// Should be the bare filename including extension, e.g. `"chrome.exe"`.
    pub blocked_executables: Vec<String>,
}
